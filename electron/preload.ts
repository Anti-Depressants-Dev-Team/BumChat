import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    setTitle: (title: string) => ipcRenderer.send('set-title', title),
    getKickChannel: (slug: string) => ipcRenderer.invoke('get-kick-channel', slug),
    getKickViewers: (slug: string) => ipcRenderer.invoke('get-kick-viewers', slug),
    startTwitchOAuth: () => ipcRenderer.invoke('start-twitch-oauth'),
    startYoutubeOAuth: () => ipcRenderer.invoke('start-youtube-oauth'),
    startKickOAuth: () => ipcRenderer.invoke('start-kick-oauth'),

    // Widget Server
    getWidgetServerUrl: () => ipcRenderer.invoke('widget-server-url'),
    broadcastWidgetMessage: (msg: any) => ipcRenderer.send('widget-broadcast-message', msg),
    clearWidgetMessages: () => ipcRenderer.send('widget-clear-messages'),
});
