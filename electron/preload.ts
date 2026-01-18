import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    setTitle: (title: string) => ipcRenderer.send('set-title', title),
    getKickChannel: (slug: string) => ipcRenderer.invoke('get-kick-channel', slug),
    getKickViewers: (slug: string) => ipcRenderer.invoke('get-kick-viewers', slug),
});
