import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    setTitle: (title: string) => ipcRenderer.send('set-title', title),
    getKickChannel: (slug: string, token?: string) => ipcRenderer.invoke('get-kick-channel', slug, token),
    getKickViewers: (slug: string, token?: string) => ipcRenderer.invoke('get-kick-viewers', slug, token),
    loginTwitch: () => ipcRenderer.invoke('login-twitch'),
    loginKick: () => ipcRenderer.invoke('login-kick'),
    sendKickMessage: (chatroomId: string, message: string, token: string) => ipcRenderer.invoke('send-kick-message', chatroomId, message, token),
    broadcastWidgetMessage: (message: any) => ipcRenderer.send('broadcast-widget-message', message),
    broadcastViewerCount: (counts: any) => ipcRenderer.send('broadcast-viewer-count', counts),
    versions: process.versions,
});
