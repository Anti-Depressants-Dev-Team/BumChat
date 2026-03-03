import { create } from 'zustand';

interface ViewCounts {
    twitch: { [channel: string]: number };

    kick: { [channel: string]: number };

    setTwitchViewCount: (channel: string, count: number) => void;

    setKickViewCount: (channel: string, count: number) => void;
}

export const useViewCountStore = create<ViewCounts>((set) => ({
    twitch: {},

    kick: {},

    setTwitchViewCount: (channel, count) => {
        set((state) => {
            const newState = { twitch: { ...state.twitch, [channel]: count } };
            if (window.electronAPI?.broadcastViewerCount) {
                // Broadcast the entirely new combined state
                window.electronAPI.broadcastViewerCount({ twitch: newState.twitch, kick: state.kick });
            }
            return newState;
        });
    },

    setKickViewCount: (channel, count) => {
        set((state) => {
            const newState = { kick: { ...state.kick, [channel]: count } };
            if (window.electronAPI?.broadcastViewerCount) {
                // Broadcast the entirely new combined state
                window.electronAPI.broadcastViewerCount({ twitch: state.twitch, kick: newState.kick });
            }
            return newState;
        });
    }
}));
