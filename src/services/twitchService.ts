import tmi from 'tmi.js';
import { useChatStore, ChatMessage } from '../store/useChatStore';
import { useConnectionStore } from '../store/useConnectionStore';

// Simple ID generator if uuid not available
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

class TwitchService {
    private client: tmi.Client | null = null;
    private connectedChannels: Set<string> = new Set();
    private username: string = '';

    connect(channels: string[], username?: string, token?: string) {
        if (this.client) {
            this.disconnect();
        }

        const options: tmi.Options = {
            channels: channels,
            connection: {
                reconnect: true,
                secure: true
            }
        };

        if (username && token) {
            options.identity = {
                username,
                password: token.startsWith('oauth:') ? token : `oauth:${token}`
            };
            this.username = username;
        }

        this.client = new tmi.Client(options);

        this.client.connect().then(() => {
            console.log('Twitch Connected' + (username ? ` as ${username}` : ' anonymously'));
            useConnectionStore.getState().setTwitchConnected(true, channels);
        }).catch(console.error);

        this.client.on('message', (channel, tags, message, self) => {
            if (self) return;
            this.processMessage(channel, tags, message);
        });

        this.connectedChannels = new Set(channels);
    }

    private processMessage(channel: string, tags: tmi.ChatUserstate, message: string) {
        const chatMsg: ChatMessage = {
            id: tags.id || generateId(),
            platform: 'twitch',
            channel: channel,
            user: tags.username || 'anonymous',
            displayName: tags['display-name'] || tags.username || 'anonymous',
            color: tags.color || '#FFFFFF',
            content: message,
            timestamp: parseInt(tags['tmi-sent-ts'] || Date.now().toString()),
            badges: tags.badges ? Object.keys(tags.badges) : [],
            emotes: tags.emotes || {},
        };

        useChatStore.getState().addMessage(chatMsg);
    }

    async sendMessage(channel: string, message: string) {
        if (this.client && this.client.readyState() === 'OPEN') {
            try {
                await this.client.say(channel, message);

                // Manually add our own message to chat since tmi.js 'message' event filters 'self'
                // Or rely on client.on('chat') behavior? 
                // Let's manually add it to be responsive
                const timestamp = Date.now();
                const chatMsg: ChatMessage = {
                    id: generateId(),
                    platform: 'twitch',
                    channel: channel,
                    user: this.username || 'me',
                    displayName: this.username || 'Me',
                    color: '#9146FF', // Default Twitch Purple for self
                    content: message,
                    timestamp: timestamp,
                    badges: [],
                };
                useChatStore.getState().addMessage(chatMsg);

            } catch (error) {
                console.error('Failed to send Twitch message:', error);
            }
        }
    }

    disconnect() {
        if (this.client) {
            this.client.disconnect().catch(console.error);
            this.client = null;
            this.connectedChannels.clear();
        }
        useConnectionStore.getState().setTwitchConnected(false, []);
    }
}

export const twitchService = new TwitchService();

