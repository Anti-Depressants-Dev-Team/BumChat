import tmi from 'tmi.js';
import { useChatStore, ChatMessage } from '../store/useChatStore';
import { useConnectionStore } from '../store/useConnectionStore';

// Simple ID generator if uuid not available
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

class TwitchService {
    private client: tmi.Client | null = null;
    private connectedChannels: Set<string> = new Set();
    private username: string = '';
    private accessToken: string = '';
    private clientId: string = 'r7089h8tpxdol1s6q1hjmnvn5h8qb0';

    setAccessToken(token: string) {
        this.accessToken = token;
    }

    // Get user info from Twitch using OAuth token
    async getUserInfo(): Promise<{ id: string; login: string; display_name: string } | null> {
        if (!this.accessToken) return null;

        try {
            const response = await fetch('https://api.twitch.tv/helix/users', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Client-Id': this.clientId,
                }
            });
            const data = await response.json();
            return data.data?.[0] || null;
        } catch (error) {
            console.error('Twitch: Error getting user info', error);
            return null;
        }
    }

    // Check if user is currently streaming
    async isUserLive(userId: string): Promise<{ isLive: boolean; title?: string }> {
        if (!this.accessToken) return { isLive: false };

        try {
            const response = await fetch(`https://api.twitch.tv/helix/streams?user_id=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Client-Id': this.clientId,
                }
            });
            const data = await response.json();

            if (data.data && data.data.length > 0) {
                return { isLive: true, title: data.data[0].title };
            }
            return { isLive: false };
        } catch (error) {
            console.error('Twitch: Error checking live status', error);
            return { isLive: false };
        }
    }

    // Auto-connect using OAuth - gets user info and connects to their channel
    async connectWithOAuth(accessToken: string): Promise<{ success: boolean; channel?: string }> {
        this.accessToken = accessToken;

        const userInfo = await this.getUserInfo();
        if (!userInfo) {
            console.log('Twitch: Could not get user info');
            return { success: false };
        }

        this.username = userInfo.login;
        console.log('Twitch: Logged in as', userInfo.display_name);

        // Connect to own channel (works whether streaming or not)
        this.connect([userInfo.login], userInfo.login, accessToken);
        return { success: true, channel: userInfo.login };
    }
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

