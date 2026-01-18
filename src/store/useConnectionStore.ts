import { create } from 'zustand';

interface ConnectionState {
    twitch: { connected: boolean; channels: string[] };
    youtube: { connected: boolean; videoId: string };
    kick: { connected: boolean; channel: string };

    // Actions
    setTwitchConnected: (connected: boolean, channels?: string[]) => void;
    setYoutubeConnected: (connected: boolean, videoId?: string) => void;
    setKickConnected: (connected: boolean, channel?: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
    twitch: { connected: false, channels: [] },
    youtube: { connected: false, videoId: '' },
    kick: { connected: false, channel: '' },

    setTwitchConnected: (connected, channels = []) =>
        set((state) => ({ twitch: { ...state.twitch, connected, channels } })),

    setYoutubeConnected: (connected, videoId = '') =>
        set((state) => ({ youtube: { ...state.youtube, connected, videoId } })),

    setKickConnected: (connected, channel = '') =>
        set((state) => ({ kick: { ...state.kick, connected, channel } })),
}));
