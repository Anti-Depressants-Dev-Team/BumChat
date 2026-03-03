import { create } from 'zustand';

interface ConnectionState {
    twitch: { connected: boolean; channels: string[] };

    kick: { connected: boolean; channel: string };

    // Actions
    setTwitchConnected: (connected: boolean, channels?: string[]) => void;

    setKickConnected: (connected: boolean, channel?: string) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
    twitch: { connected: false, channels: [] },

    kick: { connected: false, channel: '' },

    setTwitchConnected: (connected, channels = []) =>
        set((state) => ({ twitch: { ...state.twitch, connected, channels } })),

    setKickConnected: (connected, channel = '') =>
        set((state) => ({ kick: { ...state.kick, connected, channel } })),
}));
