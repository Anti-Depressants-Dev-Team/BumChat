import { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, net, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { startWidgetServer } from './widgetServer';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

let mainWindow: BrowserWindow | null = null;
let pipWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let widgetBroadcaster: { broadcastMessage: (message: any) => void; broadcastViewerCount: (counts: any) => void; onSendMessage: (callback: (data: { message: string; platform: string }) => void) => void } | null = null;

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

        tray.setToolTip('BumpChat');

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
                label: 'Show BumpChat',
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
                webviewTag: true,
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
        // Start Local OBS Widget Server
        try {
            widgetBroadcaster = startWidgetServer();

            // Relay messages from OBS dock widgets to the main renderer window
            widgetBroadcaster.onSendMessage((data) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('dock-send-message', data);
                }
            });
        } catch (e) {
            console.error('Failed to start widget server on port 8356', e);
        }

        createWindow();
        createTray();

        // Register F12 to toggle DevTools (for debugging production issues)
        globalShortcut.register('F12', () => {
            if (mainWindow) {
                mainWindow.webContents.toggleDevTools();
            }
        });

        // IPC Handlers for API requests (Bypassing CORS)

        // Kick: Get authenticated user info (for auto-connect)
        ipcMain.handle('get-kick-user', async (_event, token: string) => {
            try {
                console.log('Kick: Fetching authenticated user info...');
                const response = await fetch('https://api.kick.com/public/v1/users', {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const json = await response.json();
                    const userData = Array.isArray(json?.data) ? json.data[0] : json?.data;
                    console.log('Kick: User info:', JSON.stringify(userData)?.substring(0, 500));
                    return userData || null;
                } else {
                    console.error('Kick: User info fetch returned status', response.status);
                    return null;
                }
            } catch (error) {
                console.error('Kick: User info fetch error:', error);
                return null;
            }
        });

        // Helper: Fetches the v1 API through a hidden BrowserWindow to bypass Cloudflare
        async function fetchKickV1ChannelReady(slug: string): Promise<any> {
            return new Promise((resolve) => {
                const win = new BrowserWindow({
                    show: false,
                    webPreferences: { offscreen: true }
                });

                win.webContents.on('did-finish-load', async () => {
                    try {
                        const text = await win.webContents.executeJavaScript('document.body.innerText');
                        const json = JSON.parse(text);
                        resolve(json);
                    } catch (e) {
                        resolve(null);
                    } finally {
                        if (!win.isDestroyed()) win.destroy();
                    }
                });

                // Failsafe timeout
                setTimeout(() => {
                    if (!win.isDestroyed()) {
                        win.destroy();
                        resolve(null);
                    }
                }, 8000);

                win.loadURL(`https://kick.com/api/v1/channels/${slug}`);
            });
        }

        // Kick: Get channel info (official API + Cloudflare bypass fallback)
        ipcMain.handle('get-kick-channel', async (_event, slugOrId: string, token: string, userId?: number) => {
            // Helper to extract channel data from API response
            const extractChannel = (json: any) => {
                const channelData = Array.isArray(json?.data) ? json.data[0] : json?.data;
                if (channelData && Object.keys(channelData).length > 0) {
                    console.log('Kick: Official API returned channel data, keys:', Object.keys(channelData));
                    console.log('Kick: broadcaster_user_id =', channelData.broadcaster_user_id);
                    console.log('Kick: chatroom_id =', channelData.chatroom_id);
                    console.log('Kick: slug =', channelData.slug);
                    return channelData;
                }
                return null;
            };

            const headers = {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            // Strategy 1: By broadcaster_user_id (most reliable — user_id comes from /users endpoint)
            if (userId) {
                try {
                    console.log('Kick: Fetching channel by broadcaster_user_id:', userId);
                    const response = await fetch(`https://api.kick.com/public/v1/channels?broadcaster_user_id=${userId}`, { headers });
                    if (response.ok) {
                        const json = await response.json();
                        let channel = extractChannel(json);

                        if (channel) {
                            // The broadcaster_user_id endpoint often omits chatroom_id.
                            // If we have the slug now, fetch again by slug to get the full data including chatroom_id.
                            if (!channel.chatroom_id && channel.slug) {
                                console.log('Kick: chatroom_id missing from user_id response, attempting Cloudflare bypass via hidden BrowserWindow for slug:', channel.slug);
                                const v1Data = await fetchKickV1ChannelReady(channel.slug);
                                if (v1Data && v1Data.chatroom && v1Data.chatroom.id) {
                                    console.log('Kick: Successfully bypassed Cloudflare and obtained chatroom_id:', v1Data.chatroom.id);
                                    channel.chatroom_id = v1Data.chatroom.id;
                                    return channel;
                                }

                                // Fallback: try official slug endpoint just in case
                                console.log('Kick: V1 bypass failed, trying official slug endpoint as last resort');
                                const slugResponse = await fetch(`https://api.kick.com/public/v1/channels?slug=${encodeURIComponent(channel.slug)}`, { headers });
                                if (slugResponse.ok) {
                                    const slugJson = await slugResponse.json();
                                    const slugChannel = extractChannel(slugJson);
                                    if (slugChannel && slugChannel.chatroom_id) {
                                        channel = slugChannel;
                                    }
                                }
                            }
                            return channel;
                        }
                    } else {
                        console.log('Kick: broadcaster_user_id lookup returned', response.status);
                    }
                } catch (e) {
                    console.error('Kick: broadcaster_user_id lookup error:', e);
                }
            }

            // Strategy 2: By slug (official API)
            try {
                console.log('Kick: Fetching channel by slug:', slugOrId);
                const response = await fetch(`https://api.kick.com/public/v1/channels?slug=${encodeURIComponent(slugOrId)}`, { headers });
                if (response.ok) {
                    const json = await response.json();
                    const channel = extractChannel(json);

                    if (channel) {
                        if (!channel.chatroom_id && channel.slug) {
                            console.log('Kick: chatroom_id missing from official slug response, attempting Cloudflare bypass');
                            const v1Data = await fetchKickV1ChannelReady(channel.slug);
                            if (v1Data && v1Data.chatroom && v1Data.chatroom.id) {
                                console.log('Kick: Successfully obtained chatroom_id:', v1Data.chatroom.id);
                                channel.chatroom_id = v1Data.chatroom.id;
                            }
                        }
                        return channel;
                    }
                } else {
                    const text = await response.text();
                    console.error('Kick: slug lookup returned', response.status, text?.substring(0, 200));
                }
            } catch (error) {
                console.error('Kick: slug lookup error:', error);
            }

            // Strategy 3: Cloudflare bypass V1 API directly (if all official APIs fail)
            console.log('Kick: Attempting V1 API directly via hidden BrowserWindow for', slugOrId);
            const v1Fallback = await fetchKickV1ChannelReady(slugOrId);
            if (v1Fallback && v1Fallback.chatroom && v1Fallback.user_id) {
                return {
                    broadcaster_user_id: v1Fallback.user_id,
                    chatroom_id: v1Fallback.chatroom.id,
                    slug: v1Fallback.slug,
                    stream_title: v1Fallback.livestream?.session_title,
                };
            }

            console.error('Kick: All channel fetch strategies failed for', slugOrId, 'userId:', userId);
            return null;
        });

        // Kick Viewers
        ipcMain.handle('get-kick-viewers', async (_event, slug: string, token?: string) => {
            try {
                if (token) {
                    const response = await fetch(`https://api.kick.com/public/v1/channels?slug=${encodeURIComponent(slug)}`, {
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const channelData = Array.isArray(data?.data) ? data.data[0] : data?.data;
                        return channelData?.stream?.viewer_count || channelData?.viewer_count || 0;
                    }
                }
                // Fallback
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

        // Twitch OAuth Login
        ipcMain.handle('login-twitch', async () => {
            return new Promise((resolve, reject) => {
                const port = 8080;
                let server: http.Server;

                try {
                    server = http.createServer((req, res) => {
                        const reqUrl = new URL(req.url || '', `http://localhost:${port}`);

                        if (reqUrl.pathname === '/callback') {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`
                                <html><body>
                                    <h2 style="font-family: sans-serif;">Logging in to BumpChat...</h2>
                                    <script>
                                        const hash = window.location.hash.substring(1);
                                        const query = window.location.search.substring(1);
                                        // Send both hash and query, as different providers use different methods
                                        fetch('/token', { method: 'POST', body: hash || query }).then(() => {
                                            document.body.innerHTML = '<h2 style="font-family: sans-serif; color: green;">Login successful! You can close this window.</h2>';
                                            window.close();
                                        }).catch(() => {
                                            document.body.innerHTML = '<h2 style="font-family: sans-serif; color: red;">Login failed. Return to app.</h2>';
                                        });
                                    </script>
                                </body></html>
                            `);
                        } else if (reqUrl.pathname === '/token' && req.method === 'POST') {
                            let body = '';
                            req.on('data', chunk => { body += chunk.toString(); });
                            req.on('end', () => {
                                const params = new URLSearchParams(body);
                                const accessToken = params.get('access_token');
                                const rawToken = body; // Backup if not formatted as expected

                                res.writeHead(200);
                                res.end('OK');

                                server.close();
                                if (accessToken) {
                                    resolve({ success: true, token: accessToken });
                                } else if (rawToken && rawToken.includes('access_token')) {
                                    resolve({ success: true, token: rawToken, raw: true });
                                } else {
                                    resolve({ success: false, error: 'No access token found in redirect' });
                                }
                            });
                        } else {
                            res.writeHead(404);
                            res.end();
                        }
                    });

                    server.listen(port, () => {
                        const clientId = 'fxsevpfcyqohtjqruissg3776uf5ng';
                        // response_type=token is needed for implicit grant (direct access_token in the #hash)
                        const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=http://localhost:${port}/callback&response_type=token&scope=chat:read chat:edit`;
                        shell.openExternal(authUrl);
                    });

                    server.on('error', (err) => {
                        reject(err);
                    });
                } catch (err) {
                    reject(err);
                }
            });
        });

        // PiP Chat Window — detachable, frameless, always-on-top chat overlay
        ipcMain.handle('pop-out-chat', async (_event, settings?: { fontSize?: string; timeout?: string; bg?: string }) => {
            // Only one PiP window at a time
            if (pipWindow && !pipWindow.isDestroyed()) {
                pipWindow.focus();
                return { success: true, alreadyOpen: true };
            }

            pipWindow = new BrowserWindow({
                width: 420,
                height: 600,
                minWidth: 280,
                minHeight: 200,
                frame: false,
                transparent: false,
                alwaysOnTop: true,
                skipTaskbar: false,
                resizable: true,
                title: 'BumChat Chat',
                backgroundColor: '#0a0a0a',
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                },
            });

            const params = new URLSearchParams();
            if (settings?.fontSize) params.set('fontSize', settings.fontSize);
            if (settings?.timeout) params.set('timeout', settings.timeout);
            if (settings?.bg) params.set('bg', settings.bg);
            const qs = params.toString() ? '?' + params.toString() : '';
            pipWindow.loadURL(`http://127.0.0.1:8356/widgets/chat/pip.html${qs}`);
            pipWindow.removeMenu();

            pipWindow.on('closed', () => {
                pipWindow = null;
            });

            return { success: true };
        });

        ipcMain.handle('close-pip-chat', async () => {
            if (pipWindow && !pipWindow.isDestroyed()) {
                pipWindow.close();
                pipWindow = null;
            }
            return { success: true };
        });

        // Broadcast Message to OBS Widgets
        ipcMain.on('broadcast-widget-message', (_event, message) => {
            if (widgetBroadcaster) {
                widgetBroadcaster.broadcastMessage(message);
            }
        });

        // Broadcast Viewer Counts to OBS Widgets
        ipcMain.on('broadcast-viewer-count', (_event, counts) => {
            if (widgetBroadcaster) {
                widgetBroadcaster.broadcastViewerCount(counts);
            }
        });

        // Kick OAuth Login (OAuth 2.1 with PKCE)
        ipcMain.handle('login-kick', async () => {
            return new Promise(async (resolve, reject) => {
                const port = 8080;
                let server: http.Server;
                const clientId = '01KGB3Z5C9EKE0M586NS3M8TRN';

                // Generate PKCE code_verifier and code_challenge
                const crypto = await import('crypto');
                const codeVerifier = crypto.randomBytes(48).toString('base64url');
                const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

                try {
                    server = http.createServer(async (req, res) => {
                        const reqUrl = new URL(req.url || '', `http://localhost:${port}`);

                        if (reqUrl.pathname === '/callback') {
                            const code = reqUrl.searchParams.get('code');

                            if (!code) {
                                const error = reqUrl.searchParams.get('error') || 'No authorization code received';
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`<html><body><h2 style="font-family: sans-serif; color: red;">Login failed: ${error}</h2></body></html>`);
                                server.close();
                                resolve({ success: false, error });
                                return;
                            }

                            // Exchange authorization code for access token
                            try {
                                const clientSecret = '946c1ea99b27cf99798bd4075fdfdd2f53c2364750b1cead522ed0523a341b92';
                                const tokenResponse = await fetch('https://id.kick.com/oauth/token', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'Accept': 'application/json',
                                    },
                                    body: new URLSearchParams({
                                        grant_type: 'authorization_code',
                                        client_id: clientId,
                                        client_secret: clientSecret,
                                        code: code,
                                        redirect_uri: `http://localhost:${port}/callback`,
                                        code_verifier: codeVerifier,
                                    }).toString(),
                                });

                                const responseText = await tokenResponse.text();
                                console.log('Kick token response status:', tokenResponse.status);
                                console.log('Kick token response body:', responseText);

                                let tokenData: any;
                                try {
                                    tokenData = JSON.parse(responseText);
                                } catch {
                                    console.error('Kick token response was not JSON:', responseText);
                                    res.writeHead(200, { 'Content-Type': 'text/html' });
                                    res.end(`<html><body><h2 style="font-family: sans-serif; color: red;">Login failed: Kick returned an unexpected response (HTTP ${tokenResponse.status})</h2></body></html>`);
                                    server.close();
                                    resolve({ success: false, error: `Unexpected response (HTTP ${tokenResponse.status})` });
                                    return;
                                }

                                if (tokenData.access_token) {
                                    res.writeHead(200, { 'Content-Type': 'text/html' });
                                    res.end('<html><body><h2 style="font-family: sans-serif; color: #53FC18;">Login successful! You can close this window.</h2><script>setTimeout(()=>window.close(),1500)</script></body></html>');
                                    server.close();
                                    resolve({ success: true, token: tokenData.access_token });
                                } else {
                                    const errMsg = tokenData.error_description || tokenData.error || 'Token exchange failed';
                                    console.error('Kick token exchange error:', tokenData);
                                    res.writeHead(200, { 'Content-Type': 'text/html' });
                                    res.end(`<html><body><h2 style="font-family: sans-serif; color: red;">Login failed: ${errMsg}</h2></body></html>`);
                                    server.close();
                                    resolve({ success: false, error: errMsg });
                                }
                            } catch (tokenErr: any) {
                                console.error('Kick token exchange fetch error:', tokenErr);
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end('<html><body><h2 style="font-family: sans-serif; color: red;">Login failed: could not reach Kick servers.</h2></body></html>');
                                server.close();
                                resolve({ success: false, error: tokenErr.message });
                            }
                        } else {
                            res.writeHead(404);
                            res.end();
                        }
                    });

                    server.listen(port, () => {
                        const scopes = encodeURIComponent('user:read chat:write channel:read');
                        const redirectUri = encodeURIComponent(`http://localhost:${port}/callback`);
                        const authUrl = `https://id.kick.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=bumchat`;
                        console.log('Opening Kick auth URL:', authUrl);
                        shell.openExternal(authUrl);
                    });

                    server.on('error', (err: any) => {
                        reject(err);
                    });
                } catch (err) {
                    reject(err);
                }
            });
        });

        // Kick: Send Chat Message (via official Kick public API)
        ipcMain.handle('send-kick-message', async (_event, broadcasterId: string, message: string, token: string) => {
            try {
                const response = await fetch('https://api.kick.com/public/v1/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        broadcaster_user_id: parseInt(broadcasterId, 10),
                        content: message,
                        type: 'user',
                    }),
                });

                const responseText = await response.text();
                console.log('Kick send response:', response.status, responseText);

                if (!response.ok) {
                    console.error('Kick send message error:', response.status, responseText);
                    return { success: false, error: `HTTP ${response.status}: ${responseText}` };
                }

                return { success: true };
            } catch (error: any) {
                console.error('Kick send message fetch error:', error);
                return { success: false, error: error.message };
            }
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

