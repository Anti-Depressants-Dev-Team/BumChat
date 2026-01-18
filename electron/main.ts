import { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, net, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';

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

