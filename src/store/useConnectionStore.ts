import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ConnectionState {
    twitch: { connected: boolean; channels: string[]; token?: string; username?: string };
    youtube: { connected: boolean; videoId: string; accessToken?: string; apiKey?: string };
    kick: { connected: boolean; channel: string; accessToken?: string };

    // Actions
    setTwitchConnected: (connected: boolean, channels?: string[]) => void;
    setYoutubeConnected: (connected: boolean, videoId?: string) => void;
    setKickConnected: (connected: boolean, channel?: string) => void;

    // Token actions
    setTwitchAuth: (token: string, username: string) => void;
    setYoutubeAuth: (accessToken: string, apiKey?: string) => void;
    setKickAuth: (accessToken: string) => void;

    // Clear auth
    clearTwitchAuth: () => void;
    clearYoutubeAuth: () => void;
    clearKickAuth: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
    persist(
        (set) => ({
            twitch: { connected: false, channels: [] },
            youtube: { connected: false, videoId: '' },
            kick: { connected: false, channel: '' },

            setTwitchConnected: (connected, channels = []) =>
                set((state) => ({ twitch: { ...state.twitch, connected, channels } })),

            setYoutubeConnected: (connected, videoId = '') =>
                set((state) => ({ youtube: { ...state.youtube, connected, videoId } })),

            setKickConnected: (connected, channel = '') =>
                set((state) => ({ kick: { ...state.kick, connected, channel } })),

            // Auth setters
            setTwitchAuth: (token, username) =>
                set((state) => ({ twitch: { ...state.twitch, token, username } })),

            setYoutubeAuth: (accessToken, apiKey) =>
                set((state) => ({ youtube: { ...state.youtube, accessToken, apiKey: apiKey || state.youtube.apiKey } })),

            setKickAuth: (accessToken) =>
                set((state) => ({ kick: { ...state.kick, accessToken } })),

            // Clear auth
            clearTwitchAuth: () =>
                set((state) => ({ twitch: { ...state.twitch, token: undefined, username: undefined, connected: false, channels: [] } })),

            clearYoutubeAuth: () =>
                set((state) => ({ youtube: { ...state.youtube, accessToken: undefined, connected: false, videoId: '' } })),

            clearKickAuth: () =>
                set((state) => ({ kick: { ...state.kick, accessToken: undefined, connected: false, channel: '' } })),
        }),
        {
            name: 'depressedchat-connections',
            storage: createJSONStorage(() => localStorage),
            // Only persist tokens, not connection status (will reconnect on load)
            partialize: (state) => ({
                twitch: { token: state.twitch.token, username: state.twitch.username, channels: state.twitch.channels, connected: false },
                youtube: { accessToken: state.youtube.accessToken, apiKey: state.youtube.apiKey, videoId: state.youtube.videoId, connected: false },
                kick: { accessToken: state.kick.accessToken, channel: state.kick.channel, connected: false },
            }),
        }
    )
);
