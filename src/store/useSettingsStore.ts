import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
    // Global
    globalChannel: string;

    // Twitch
    twitchChannels: string[];
    twitchChannel: string;
    twitchToken: string;
    twitchUsername: string;

    // Kick
    kickChannels: string[];
    kickChannel: string;
    kickToken: string;

    // Integrations
    axelChatWidgetUrl: string;

    // Actions
    setGlobalChannel: (channel: string) => void;
    addTwitchChannel: (channel: string) => void;
    removeTwitchChannel: (channel: string) => void;
    setTwitchChannel: (channel: string) => void;
    setTwitchToken: (token: string) => void;
    setTwitchUsername: (username: string) => void;

    addKickChannel: (channel: string) => void;
    removeKickChannel: (channel: string) => void;
    setKickChannel: (channel: string) => void;
    setKickToken: (token: string) => void;

    setAxelChatWidgetUrl: (url: string) => void;
}

export const useSettingsStore = create<Settings>()(
    persist(
        (set) => ({
            globalChannel: '',
            twitchChannels: [],
            twitchChannel: '',
            twitchToken: '',
            twitchUsername: '',

            kickChannels: [],
            kickChannel: '',
            kickToken: '',

            axelChatWidgetUrl: '',

            setGlobalChannel: (channel) => set({ globalChannel: channel }),

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
            setTwitchChannel: (channel) => set({ twitchChannel: channel }),
            setTwitchToken: (token) => set({ twitchToken: token }),
            setTwitchUsername: (username) => set({ twitchUsername: username }),

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
            setKickChannel: (channel) => set({ kickChannel: channel }),
            setKickToken: (token) => set({ kickToken: token }),

            setAxelChatWidgetUrl: (url) => set({ axelChatWidgetUrl: url }),
        }),
        {
            name: 'bumpchat-settings',
        }
    )
);

