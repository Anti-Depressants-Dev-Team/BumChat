import { create } from 'zustand';

export type Platform = 'twitch' | 'youtube' | 'kick';

export interface ChatMessage {
    id: string;
    platform: Platform;
    channel: string;
    user: string;
    displayName: string;
    color: string;
    content: string;
    timestamp: number;
    badges?: string[];
    emotes?: { [id: string]: string[] };
}

interface ChatState {
    messages: ChatMessage[];
    addMessage: (message: ChatMessage) => void;
    clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    addMessage: (message) => set((state) => {
        // Keep only last 500 messages to prevent memory issues for now
        const newMessages = [...state.messages, message];
        if (newMessages.length > 500) {
            newMessages.shift();
        }
        return { messages: newMessages };
    }),
    clearMessages: () => set({ messages: [] }),
}));
