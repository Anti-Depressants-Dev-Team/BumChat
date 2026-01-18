/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        setTitle: (title: string) => void;
        getKickChannel: (slug: string) => Promise<any>;
        getKickViewers: (slug: string) => Promise<number>;
    }
}

