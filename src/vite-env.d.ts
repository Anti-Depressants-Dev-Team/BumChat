/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        setTitle: (title: string) => void;
        getKickChannel: (slug: string, token: string, userId?: number) => Promise<any>;
        getKickUser: (token: string) => Promise<any>;
        getKickViewers: (slug: string, token?: string) => Promise<number>;
        loginTwitch: () => Promise<{ success: boolean; token?: string; raw?: boolean; error?: string }>;
        loginKick: () => Promise<{ success: boolean; token?: string; error?: string }>;
        sendKickMessage: (chatroomId: string, message: string, token: string) => Promise<{ success: boolean; error?: string }>;
        broadcastWidgetMessage: (message: any) => void;
        broadcastViewerCount: (counts: any) => void;
        popOutChat: (settings?: { fontSize?: string; timeout?: string; bg?: string }) => Promise<{ success: boolean; alreadyOpen?: boolean }>;
        closePipChat: () => Promise<{ success: boolean }>;
        onDockSendMessage: (callback: (data: { message: string; platform: string }) => void) => void;
        versions: Record<string, string>;
    }
}
