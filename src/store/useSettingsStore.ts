import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
    // Twitch
    twitchChannels: string[];
    twitchToken: string;
    twitchUsername: string;

    // YouTube
    youtubeApiKey: string;
    youtubeAccessToken: string;
    youtubeVideoIds: string[];

    // Kick
    kickChannels: string[];

    // Actions
    addTwitchChannel: (channel: string) => void;
    removeTwitchChannel: (channel: string) => void;
    setTwitchToken: (token: string) => void;
    setTwitchUsername: (username: string) => void;

    setYoutubeApiKey: (key: string) => void;
    setYoutubeAccessToken: (token: string) => void;
    addYoutubeVideoId: (videoId: string) => void;
    removeYoutubeVideoId: (videoId: string) => void;

    addKickChannel: (channel: string) => void;
    removeKickChannel: (channel: string) => void;
}

export const useSettingsStore = create<Settings>()(
    persist(
        (set) => ({
            twitchChannels: [],
            twitchToken: '',
            twitchUsername: '',
            youtubeApiKey: '',
            youtubeAccessToken: '',
            youtubeVideoIds: [],
            kickChannels: [],

            addTwitchChannel: (channel) =>
                set((state) => ({
                    twitchChannels: state.twitchChannels.includes(channel)
                        ? state.twitchChannels
                        : [...state.twitchChannels, channel],
                })),
            removeTwitchChannel: (channel) =>
                set((state) => ({
                    twitchChannels: state.twitchChannels.filter((c) => c !== channel),
                })),
            setTwitchToken: (token) => set({ twitchToken: token }),
            setTwitchUsername: (username) => set({ twitchUsername: username }),

            setYoutubeApiKey: (key) => set({ youtubeApiKey: key }),
            setYoutubeAccessToken: (token) => set({ youtubeAccessToken: token }),
            addYoutubeVideoId: (videoId) =>
                set((state) => ({
                    youtubeVideoIds: state.youtubeVideoIds.includes(videoId)
                        ? state.youtubeVideoIds
                        : [...state.youtubeVideoIds, videoId],
                })),
            removeYoutubeVideoId: (videoId) =>
                set((state) => ({
                    youtubeVideoIds: state.youtubeVideoIds.filter((v) => v !== videoId),
                })),

            addKickChannel: (channel) =>
                set((state) => ({
                    kickChannels: state.kickChannels.includes(channel)
                        ? state.kickChannels
                        : [...state.kickChannels, channel],
                })),
            removeKickChannel: (channel) =>
                set((state) => ({
                    kickChannels: state.kickChannels.filter((c) => c !== channel),
                })),
        }),
        {
            name: 'depressed-chat-settings',
        }
    )
);

