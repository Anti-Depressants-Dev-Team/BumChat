import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

// Keep last 200 messages in memory, persist last 100 to localStorage
const MAX_MESSAGES_MEMORY = 500;
const MAX_MESSAGES_PERSIST = 100;

export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            messages: [],
            addMessage: (message) => set((state) => {
                // Keep only last MAX_MESSAGES_MEMORY messages to prevent memory issues
                const newMessages = [...state.messages, message];
                if (newMessages.length > MAX_MESSAGES_MEMORY) {
                    newMessages.shift();
                }

                // Broadcast to widget server
                window.electronAPI.broadcastWidgetMessage(message);

                return { messages: newMessages };
            }),
            clearMessages: () => {
                window.electronAPI.clearWidgetMessages();
                set({ messages: [] });
            },
        }),
        {
            name: 'depressedchat-messages',
            storage: createJSONStorage(() => localStorage),
            // Only persist last N messages to avoid large localStorage
            partialize: (state) => ({
                messages: state.messages.slice(-MAX_MESSAGES_PERSIST),
            }),
        }
    )
);
