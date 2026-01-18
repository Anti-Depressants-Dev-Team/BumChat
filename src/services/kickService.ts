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

