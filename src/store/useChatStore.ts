import { create } from 'zustand';

export type Platform = 'twitch' | 'kick';

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

        // Broadcast to OBS Widget Server
        if (window.electronAPI?.broadcastWidgetMessage) {
            try {
                // Map to the simple format expected by the widget HTML
                // For kick, emotes might not be structured exactly the same as twitch,
                // but we pass them along. The widget HTML currently only parses Twitch emotes.
                window.electronAPI.broadcastWidgetMessage({
                    platform: message.platform,
                    author: message.displayName || message.user,
                    color: message.color,
                    body: message.content,
                    emotes: message.emotes
                });
            } catch (err) {
                console.error('Failed to broadcast widget message', err);
            }
        }

        return { messages: newMessages };
    }),
    clearMessages: () => set({ messages: [] }),
}));
