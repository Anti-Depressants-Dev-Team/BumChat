import { useChatStore, ChatMessage } from '../store/useChatStore';
import { useConnectionStore } from '../store/useConnectionStore';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

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
    private broadcasterId: string = '';
    private viewCountInterval: NodeJS.Timeout | null = null;

    async connect(username: string, token?: string) {
        try {
            // Fetch channel data via main process (bypasses CORS)
            const data = await window.electronAPI.getKickChannel(username, token);
            console.log('Kick: Channel data received:', JSON.stringify(data)?.substring(0, 500));

            // Try multiple paths for chatroom ID (official API vs old API have different shapes)
            let chatroomId = data?.chatroom?.id?.toString()
                || data?.chatroom_id?.toString()
                || '';
            // Try multiple paths for broadcaster/user ID
            const broadcasterId = data?.broadcaster_user_id?.toString()
                || data?.user_id?.toString()
                || data?.user?.id?.toString()
                || data?.id?.toString()
                || '';

            if (!chatroomId) {
                console.log('Kick: Could not get chatroom ID from API response');
                // Can't subscribe to Pusher without a numeric chatroom ID
                return;
            }

            this.chatroomId = chatroomId;
            this.broadcasterId = broadcasterId;
            console.log('Kick: Connecting to', username, 'chatroom', chatroomId, 'broadcaster', broadcasterId);

            // Connect to Pusher WebSocket (key from kick-live-connector)
            const pusherKey = '32cbd69e4b950bf97679';
            const wsUrl = `wss://ws-us2.pusher.com/app/${pusherKey}?protocol=7&client=js&version=8.4.0-rc2&flash=false`;

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

                    // Debug: log all incoming events
                    if (data.event && !data.event.startsWith('pusher:')) {
                        console.log('Kick WS event:', data.event);
                    }

                    // Listen for both possible event names
                    if (data.event === 'App\\Events\\ChatMessageEvent' ||
                        data.event === 'App\\Events\\ChatMessageSentEvent') {
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
                    // Ignore parse errors for non-JSON pusher frames
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
        this.chatroomId = '';
        this.broadcasterId = '';
        useConnectionStore.getState().setKickConnected(false);
        console.log('Kick: Disconnected');
    }

    getChatroomId(): string {
        return this.chatroomId;
    }

    getBroadcasterId(): string {
        return this.broadcasterId;
    }

    async sendMessage(message: string, token: string): Promise<boolean> {
        const id = this.broadcasterId || this.chatroomId;
        if (!id) {
            console.error('Kick: Cannot send message, not connected to a channel');
            return false;
        }
        try {
            const result = await window.electronAPI.sendKickMessage(id, message, token);
            if (!result.success) {
                console.error('Kick: Failed to send message:', result.error);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Kick: Error sending message:', e);
            return false;
        }
    }
}

export const kickService = new KickService();
