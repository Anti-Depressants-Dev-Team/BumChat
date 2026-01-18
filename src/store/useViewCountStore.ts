import { create } from 'zustand';

interface ViewCounts {
    twitch: { [channel: string]: number };
    youtube: { [videoId: string]: number };
    kick: { [channel: string]: number };

    setTwitchViewCount: (channel: string, count: number) => void;
    setYoutubeViewCount: (videoId: string, count: number) => void;
    setKickViewCount: (channel: string, count: number) => void;
}

export const useViewCountStore = create<ViewCounts>((set) => ({
    twitch: {},
    youtube: {},
    kick: {},

    setTwitchViewCount: (channel, count) =>
        set((state) => ({
            twitch: { ...state.twitch, [channel]: count },
        })),

    setYoutubeViewCount: (videoId, count) =>
        set((state) => ({
            youtube: { ...state.youtube, [videoId]: count },
        })),

    setKickViewCount: (channel, count) =>
        set((state) => ({
            kick: { ...state.kick, [channel]: count },
        })),
}));
