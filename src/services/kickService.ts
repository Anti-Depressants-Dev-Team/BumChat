import { useChatStore, ChatMessage } from '../store/useChatStore';
import { useConnectionStore } from '../store/useConnectionStore';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Note: kick-live-connector is a Node.js library that uses WebSockets.
// In an Electron renderer process with nodeIntegration: false, we might need to use it via preload/IPC.
// For now, let's try a direct import - if it fails, we'll need to refactor to use IPC.
// Alternatively, we can use a browser-compatible approach with raw WebSocket if the library doesn't work.

interface KickChatMessage {
    id: string;
    chatroom_id: number;
    content: string;
    type: string;
    created_at: string;
    sender: {
        id: number;
        username: string;
        slug: string;
        identity: {
            color: string;
            badges: { type: string; text: string }[];
        };
    };
}

class KickService {
    private ws: WebSocket | null = null;
    private chatroomId: string = '';
    private viewCountInterval: NodeJS.Timeout | null = null;
    private accessToken: string = '';
    private broadcasterUserId: number = 0;
    private currentUsername: string = '';

    setAccessToken(token: string) {
        this.accessToken = token;
    }

    // Get user info from Kick using OAuth token
    async getUserInfo(): Promise<{ user_id: number; name: string; email?: string } | null> {
        if (!this.accessToken) return null;

        try {
            const response = await fetch('https://api.kick.com/public/v1/users', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': '*/*',
                }
            });
            const data = await response.json();
            return data.data?.[0] || null;
        } catch (error) {
            console.error('Kick: Error getting user info', error);
            return null;
        }
    }

    // Auto-connect using OAuth - gets user info and connects to their channel
    async connectWithOAuth(accessToken: string): Promise<{ success: boolean; channel?: string }> {
        this.accessToken = accessToken;

        const userInfo = await this.getUserInfo();
        if (!userInfo) {
            console.log('Kick: Could not get user info');
            return { success: false };
        }

        // Store user info for sending messages
        this.broadcasterUserId = userInfo.user_id;
        this.currentUsername = userInfo.name;

        // The 'name' field is the username/channel name
        const channelName = userInfo.name.toLowerCase();
        console.log('Kick: Logged in as', userInfo.name, 'user_id:', userInfo.user_id);

        // Connect to own channel
        this.connect(channelName);
        return { success: true, channel: channelName };
    }

    // Send a message to Kick chat
    async sendMessage(channel: string, message: string): Promise<boolean> {
        if (!this.accessToken || !this.broadcasterUserId) {
            console.error('Kick: Cannot send message - not authenticated');
            return false;
        }

        try {
            const response = await fetch('https://api.kick.com/public/v1/chat', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': '*/*',
                },
                body: JSON.stringify({
                    broadcaster_user_id: this.broadcasterUserId,
                    content: message,
                    type: 'user',
                }),
            });

            const data = await response.json();

            if (data.data?.is_sent) {
                console.log('Kick: Message sent successfully');

                // Add our own message to the chat store
                const chatMsg: ChatMessage = {
                    id: data.data.message_id || generateId(),
                    platform: 'kick',
                    channel: channel,
                    user: this.currentUsername,
                    displayName: this.currentUsername,
                    color: '#53FC18',
                    content: message,
                    timestamp: Date.now(),
                    badges: [],
                };
                useChatStore.getState().addMessage(chatMsg);

                return true;
            } else {
                console.error('Kick: Failed to send message', data);
                return false;
            }
        } catch (error) {
            console.error('Kick: Error sending message', error);
            return false;
        }
    }

    async connect(username: string) {
        // Use Electron IPC to bypass CORS and get chatroom ID
        try {
            // Try fetching via main process
            const data = await window.electronAPI.getKickChannel(username);
            let chatroomId = data?.chatroom?.id?.toString();

            if (!chatroomId) {
                console.log('Kick: Could not get chatroom ID, falling back to username');
                chatroomId = username;
            }

            this.chatroomId = chatroomId;
            console.log('Kick: Connecting to', username, 'chatroom', chatroomId);

            // Connect to Pusher WebSocket
            const pusherKey = 'eb1d5f283081a78b932c';
            const wsUrl = `wss://ws-us2.pusher.com/app/${pusherKey}?protocol=7&client=js&version=7.4.0&flash=false`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('Kick: WebSocket connected');
                // Subscribe to chatroom channel
                const subscribeMsg = JSON.stringify({
                    event: 'pusher:subscribe',
                    data: { channel: `chatrooms.${this.chatroomId}.v2` }
                });
                this.ws?.send(subscribeMsg);
                useConnectionStore.getState().setKickConnected(true, username);

                // Start polling for view counts
                this.startViewCountPolling(username);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.event === 'App\\Events\\ChatMessageEvent') {
                        const messageData: KickChatMessage = JSON.parse(data.data);

                        const chatMsg: ChatMessage = {
                            id: messageData.id || generateId(),
                            platform: 'kick',
                            channel: username,
                            user: messageData.sender.slug,
                            displayName: messageData.sender.username,
                            color: messageData.sender.identity?.color || '#53FC18',
                            content: messageData.content,
                            timestamp: new Date(messageData.created_at).getTime(),
                            badges: messageData.sender.identity?.badges?.map(b => b.type) || [],
                        };

                        useChatStore.getState().addMessage(chatMsg);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            };

            this.ws.onerror = (error) => {
                console.error('Kick: WebSocket error', error);
            };

            this.ws.onclose = () => {
                console.log('Kick: WebSocket closed');
            };

        } catch (error) {
            console.error('Kick: Connection error', error);
        }
    }

    private async fetchViewCount(slug: string) {
        try {
            const count = await window.electronAPI.getKickViewers(slug);
            if (count !== undefined) {
                // We need to import useViewCountStore (ignoring circular dep warning as we use it inside function)
                const { useViewCountStore } = await import('../store/useViewCountStore');
                useViewCountStore.getState().setKickViewCount(slug, count);
            }
        } catch (e) {
            console.error('Kick: Error fetching view count', e);
        }
    }

    private startViewCountPolling(slug: string) {
        this.fetchViewCount(slug);
        this.viewCountInterval = setInterval(() => this.fetchViewCount(slug), 30000);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.viewCountInterval) {
            clearInterval(this.viewCountInterval);
            this.viewCountInterval = null;
        }
        if (this.viewCountInterval) {
            clearInterval(this.viewCountInterval);
            this.viewCountInterval = null;
        }
        this.chatroomId = '';
        useConnectionStore.getState().setKickConnected(false);
        console.log('Kick: Disconnected');
    }
}

export const kickService = new KickService();

