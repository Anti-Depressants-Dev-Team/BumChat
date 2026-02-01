import { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, net, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { setupWidgetServerIPC, widgetServer } from './widgetServer';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Detect dev mode using explicit flag
const isDev = process.argv.includes('--dev');

// Get icon path - use app path for reliable resolution
const getIconPath = () => {
    // In dev mode, dist-electron is at root/dist-electron, so go up one level then to public
    if (isDev) {
        return path.join(app.getAppPath(), 'public', 'icon.png');
    }
    return path.join(app.getAppPath(), 'dist', 'icon.png');
};


const requestSingleInstanceLock = app.requestSingleInstanceLock();

if (!requestSingleInstanceLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });

    const createTray = () => {
        const iconPath = getIconPath();

        // Check if icon exists
        if (!fs.existsSync(iconPath)) {
            console.log('Tray icon not found at:', iconPath);
            return;
        }

        const icon = nativeImage.createFromPath(iconPath);
        tray = new Tray(icon.resize({ width: 16, height: 16 }));

        tray.setToolTip('DepressedChat');

        // Double-click to show window
        tray.on('double-click', () => {
            mainWindow?.show();
            mainWindow?.focus();
        });

        // Set up menu with auto-startup option
        updateTrayMenu();
    };


    const updateTrayMenu = () => {
        if (!tray) return;

        const loginSettings = app.getLoginItemSettings();

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show DepressedChat',
                click: () => {
                    mainWindow?.show();
                    mainWindow?.focus();
                }
            },
            { type: 'separator' },
            {
                label: 'Start with Windows',
                type: 'checkbox',
                checked: loginSettings.openAtLogin,
                click: () => {
                    const newValue = !loginSettings.openAtLogin;
                    app.setLoginItemSettings({
                        openAtLogin: newValue,
                        openAsHidden: true
                    });
                    updateTrayMenu(); // Refresh menu
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.setContextMenu(contextMenu);
    };


    const createWindow = () => {
        // Create the browser window.
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            backgroundColor: '#000000',
            icon: getIconPath(),
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
            },
            show: false,
            autoHideMenuBar: true,
        });

        // Load the index.html of the app.
        if (isDev) {
            console.log('Running in development mode - loading http://localhost:5173');
            mainWindow.loadURL('http://localhost:5173');
            mainWindow.webContents.openDevTools();
        } else {
            mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
            // Explicitly ensure DevTools are closed and menu is removed in production
            mainWindow.webContents.closeDevTools();
            mainWindow.removeMenu();
        }

        mainWindow.once('ready-to-show', () => {
            mainWindow?.show();
        });

        // Minimize to tray on close
        mainWindow.on('close', (event) => {
            if (!isQuitting) {
                event.preventDefault();
                mainWindow?.hide();
            }
            return false;
        });

        // Open External Links in Browser
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });
    };

    app.on('ready', () => {
        createWindow();
        createTray();

        // Start Axelchat Widget Server
        setupWidgetServerIPC();
        widgetServer.start(8765);

        // Register F12 to toggle DevTools (for debugging production issues)
        globalShortcut.register('F12', () => {
            if (mainWindow) {
                mainWindow.webContents.toggleDevTools();
            }
        });

        // IPC Handlers for API requests (Bypassing CORS)

        // Kick Channel Info (for chatroom_id)
        ipcMain.handle('get-kick-channel', async (event, slug) => {
            try {
                const response = await fetch(`https://kick.com/api/v2/channels/${slug}`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) throw new Error('Failed to fetch kick channel');
                return await response.json();
            } catch (error) {
                console.error('Kick Channel Fetch Error:', error);
                // Return simplified object if fails, or rethrow
                return null;
            }
        });

        // Kick Viewers (using v1 API which often works better for stats)
        ipcMain.handle('get-kick-viewers', async (event, slug) => {
            try {
                const response = await fetch(`https://kick.com/api/v1/channels/${slug}`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) throw new Error('Failed to fetch kick viewers');
                const data = await response.json();
                return data?.livestream?.viewer_count || 0;
            } catch (error) {
                return 0;
            }
        });

        // Twitch OAuth - Opens popup, captures token via implicit grant
        ipcMain.handle('start-twitch-oauth', async () => {
            return new Promise((resolve, reject) => {
                const TWITCH_CLIENT_ID = 'r7089h8tpxdol1s6q1hjmnvn5h8qb0';
                const REDIRECT_URI = 'https://localhost/callback';
                const SCOPES = ['chat:read', 'chat:edit', 'user:read:email'].join('+');

                const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
                    `client_id=${TWITCH_CLIENT_ID}` +
                    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                    `&response_type=token` +
                    `&scope=${SCOPES}`;

                const authWindow = new BrowserWindow({
                    width: 600,
                    height: 800,
                    parent: mainWindow || undefined,
                    modal: true,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                    },
                });

                authWindow.loadURL(authUrl);

                // Monitor URL changes to catch the redirect with token
                authWindow.webContents.on('will-redirect', (event, url) => {
                    handleCallback(url);
                });

                authWindow.webContents.on('will-navigate', (event, url) => {
                    handleCallback(url);
                });

                // Also check on each page load (for when redirect doesn't trigger will-navigate)
                authWindow.webContents.on('did-navigate', (event, url) => {
                    handleCallback(url);
                });

                function handleCallback(url: string) {
                    // Check if we've been redirected to our callback URL
                    if (url.startsWith(REDIRECT_URI) || url.startsWith('https://localhost')) {
                        try {
                            // Token is in the URL fragment (after #)
                            const urlObj = new URL(url.replace('#', '?')); // Convert fragment to query for parsing
                            const accessToken = urlObj.searchParams.get('access_token');

                            if (accessToken) {
                                resolve({
                                    success: true,
                                    accessToken,
                                    tokenType: urlObj.searchParams.get('token_type'),
                                    scope: urlObj.searchParams.get('scope')
                                });
                                authWindow.close();
                            }
                        } catch (e) {
                            console.error('Error parsing OAuth callback:', e);
                        }
                    }
                }

                authWindow.on('closed', () => {
                    resolve({ success: false, error: 'Window closed by user' });
                });

                // Timeout after 5 minutes
                setTimeout(() => {
                    if (!authWindow.isDestroyed()) {
                        authWindow.close();
                    }
                    resolve({ success: false, error: 'OAuth timeout' });
                }, 300000);
            });
        });

        // YouTube OAuth - Opens popup, captures token via implicit grant
        ipcMain.handle('start-youtube-oauth', async () => {
            return new Promise((resolve, reject) => {
                const YOUTUBE_CLIENT_ID = '236455029438-co28lo6tk5epel2lcsmnabuhqc94uuiu.apps.googleusercontent.com';
                const REDIRECT_URI = 'http://localhost';
                const SCOPES = [
                    'https://www.googleapis.com/auth/youtube.readonly',
                    'https://www.googleapis.com/auth/youtube.force-ssl'
                ].join(' ');

                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                    `client_id=${encodeURIComponent(YOUTUBE_CLIENT_ID)}` +
                    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                    `&response_type=token` +
                    `&scope=${encodeURIComponent(SCOPES)}` +
                    `&include_granted_scopes=true`;

                const authWindow = new BrowserWindow({
                    width: 600,
                    height: 700,
                    parent: mainWindow || undefined,
                    modal: true,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                    },
                });

                authWindow.loadURL(authUrl);

                // Monitor URL changes to catch the redirect with token
                authWindow.webContents.on('will-redirect', (event, url) => {
                    handleCallback(url);
                });

                authWindow.webContents.on('will-navigate', (event, url) => {
                    handleCallback(url);
                });

                authWindow.webContents.on('did-navigate', (event, url) => {
                    handleCallback(url);
                });

                function handleCallback(url: string) {
                    if (url.startsWith(REDIRECT_URI) || url.startsWith('http://localhost')) {
                        try {
                            // Token is in the URL fragment (after #)
                            const urlObj = new URL(url.replace('#', '?'));
                            const accessToken = urlObj.searchParams.get('access_token');

                            if (accessToken) {
                                resolve({
                                    success: true,
                                    accessToken,
                                    tokenType: urlObj.searchParams.get('token_type'),
                                    expiresIn: urlObj.searchParams.get('expires_in'),
                                    scope: urlObj.searchParams.get('scope')
                                });
                                authWindow.close();
                            }
                        } catch (e) {
                            console.error('Error parsing YouTube OAuth callback:', e);
                        }
                    }
                }

                authWindow.on('closed', () => {
                    resolve({ success: false, error: 'Window closed by user' });
                });

                setTimeout(() => {
                    if (!authWindow.isDestroyed()) {
                        authWindow.close();
                    }
                    resolve({ success: false, error: 'OAuth timeout' });
                }, 300000);
            });
        });

        // Kick OAuth 2.1 with PKCE - Uses local HTTP server to catch callback
        ipcMain.handle('start-kick-oauth', async () => {
            const http = await import('http');
            const crypto = await import('crypto');

            return new Promise((resolve, reject) => {
                const KICK_CLIENT_ID = '01KGB3Z5C9EKE0M586NS3M8TRN';
                const KICK_CLIENT_SECRET = '946c1ea99b27cf99798bd4075fdfdd2f53c2364750b1cead522ed0523a341b92';
                const REDIRECT_PORT = 8888;
                const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
                const SCOPES = ['user:read', 'chat:write', 'chat:read', 'channel:read'].join(' ');

                // Generate PKCE code verifier and challenge
                const codeVerifier = crypto.randomBytes(32).toString('base64url');
                const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
                const state = crypto.randomBytes(16).toString('hex');

                // Create local server to catch the callback
                const server = http.createServer(async (req, res) => {
                    const url = new URL(req.url || '', REDIRECT_URI);
                    const code = url.searchParams.get('code');
                    const returnedState = url.searchParams.get('state');

                    if (code && returnedState === state) {
                        // Exchange code for tokens
                        try {
                            const tokenResponse = await fetch('https://id.kick.com/oauth/token', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                },
                                body: new URLSearchParams({
                                    grant_type: 'authorization_code',
                                    client_id: KICK_CLIENT_ID,
                                    client_secret: KICK_CLIENT_SECRET,
                                    redirect_uri: REDIRECT_URI,
                                    code: code,
                                    code_verifier: codeVerifier,
                                }).toString(),
                            });

                            const tokenData = await tokenResponse.json();

                            if (tokenData.access_token) {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end('<html><body><h1>Success! You can close this window.</h1><script>window.close()</script></body></html>');

                                resolve({
                                    success: true,
                                    accessToken: tokenData.access_token,
                                    refreshToken: tokenData.refresh_token,
                                    expiresIn: tokenData.expires_in,
                                    tokenType: tokenData.token_type,
                                });
                            } else {
                                res.writeHead(400, { 'Content-Type': 'text/html' });
                                res.end('<html><body><h1>Error getting token</h1></body></html>');
                                resolve({ success: false, error: 'Failed to get access token' });
                            }
                        } catch (e) {
                            res.writeHead(500, { 'Content-Type': 'text/html' });
                            res.end('<html><body><h1>Error</h1></body></html>');
                            resolve({ success: false, error: 'Token exchange failed' });
                        }
                    } else {
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<html><body><h1>Invalid callback</h1></body></html>');
                    }

                    server.close();
                });

                server.listen(REDIRECT_PORT, () => {
                    console.log(`Kick OAuth: Listening on port ${REDIRECT_PORT}`);

                    const authUrl = `https://id.kick.com/oauth/authorize?` +
                        `client_id=${KICK_CLIENT_ID}` +
                        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                        `&response_type=code` +
                        `&scope=${encodeURIComponent(SCOPES)}` +
                        `&state=${state}` +
                        `&code_challenge=${codeChallenge}` +
                        `&code_challenge_method=S256`;

                    const authWindow = new BrowserWindow({
                        width: 600,
                        height: 700,
                        parent: mainWindow || undefined,
                        modal: true,
                        webPreferences: {
                            nodeIntegration: false,
                            contextIsolation: true,
                        },
                    });

                    authWindow.loadURL(authUrl);

                    authWindow.on('closed', () => {
                        server.close();
                    });

                    // Timeout after 5 minutes
                    setTimeout(() => {
                        server.close();
                        if (!authWindow.isDestroyed()) {
                            authWindow.close();
                        }
                        resolve({ success: false, error: 'OAuth timeout' });
                    }, 300000);
                });

                server.on('error', (err) => {
                    console.error('Kick OAuth server error:', err);
                    resolve({ success: false, error: `Server error: ${err.message}` });
                });
            });
        });
    });


    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    app.on('before-quit', () => {
        isQuitting = true;
    });
}

