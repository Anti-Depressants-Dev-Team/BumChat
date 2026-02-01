/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        setTitle: (title: string) => void;
        getKickChannel: (slug: string) => Promise<any>;
        getKickViewers: (slug: string) => Promise<number>;
        startTwitchOAuth: () => Promise<{
            success: boolean;
            accessToken?: string;
            tokenType?: string;
            scope?: string;
            error?: string;
        }>;
        startYoutubeOAuth: () => Promise<{
            success: boolean;
            accessToken?: string;
            tokenType?: string;
            expiresIn?: string;
            scope?: string;
            error?: string;
        }>;
        startKickOAuth: () => Promise<{
            success: boolean;
            accessToken?: string;
            refreshToken?: string;
            expiresIn?: number;
            tokenType?: string;
            error?: string;
        }>;
        getWidgetServerUrl: () => Promise<string>;
        broadcastWidgetMessage: (msg: any) => void;
        clearWidgetMessages: () => void;
    }
}
