import { WebSocketServer, WebSocket } from 'ws';
import { ipcMain } from 'electron';

interface AxelchatAuthor {
    id: string;
    name: string;
    avatar: string;
    pageUrl: string;
    color: string;
    customBackgroundColor: string;
    leftBadges: string[];
    rightBadges: string[];
    leftTags: any[];
    rightTags: any[];
    serviceBadge: string;
    serviceId: string;
}

interface AxelchatContent {
    type: 'text' | 'image' | 'html';
    htmlClassName: string;
    data: {
        text?: string;
        url?: string;
        html?: string;
    };
    style: object;
}

interface AxelchatMessage {
    id: string;
    author: AxelchatAuthor;
    contents: AxelchatContent[];
    customAuthorAvatarUrl: string;
    customAuthorName: string;
    deletedOnPlatform: boolean;
    edited: boolean;
    eventType: 'Message';
    bodyStyle: {
        backgroundColor?: string;
        borderColor?: string;
        sideLineColor?: string;
    };
    markedAsDeleted: boolean;
    multiline: boolean;
    publishedAt: string;
    receivedAt: string;
    raw: any;
    rawType: string;
    reply: any;
}

// Platform icons (using simple emoji/text for now, can be replaced with URLs)
const PLATFORM_BADGES: Record<string, string> = {
    twitch: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png',
    youtube: 'https://www.youtube.com/s/desktop/f6b05c87/img/favicon_32x32.png',
    kick: 'https://kick.com/favicon.ico',
};

const PLATFORM_COLORS: Record<string, string> = {
    twitch: '#9146FF',
    youtube: '#FF0000',
    kick: '#53FC18',
};

class WidgetServer {
    private wss: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set();
    private port: number = 8765;
    private pingInterval: NodeJS.Timeout | null = null;

    start(port: number = 8765): boolean {
        if (this.wss) {
            console.log('Widget server already running');
            return true;
        }

        try {
            this.port = port;
            this.wss = new WebSocketServer({ port });

            this.wss.on('connection', (ws) => {
                console.log('Widget connected');
                this.clients.add(ws);

                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(ws, message);
                    } catch (e) {
                        console.error('Widget server: Invalid message', e);
                    }
                });

                ws.on('close', () => {
                    console.log('Widget disconnected');
                    this.clients.delete(ws);
                });

                ws.on('error', (error) => {
                    console.error('Widget connection error:', error);
                    this.clients.delete(ws);
                });
            });

            // Send PING every 30 seconds
            this.pingInterval = setInterval(() => {
                this.broadcast({ type: 'PING' });
            }, 30000);

            console.log(`Widget server started on ws://localhost:${port}`);
            return true;
        } catch (error) {
            console.error('Failed to start widget server:', error);
            return false;
        }
    }

    stop() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (this.wss) {
            // Close all client connections
            for (const client of this.clients) {
                client.close();
            }
            this.clients.clear();

            this.wss.close();
            this.wss = null;
            console.log('Widget server stopped');
        }
    }

    private handleMessage(ws: WebSocket, message: any) {
        const type = message.type;

        if (type === 'HELLO') {
            console.log('Widget handshake:', message.data?.client?.name || 'Unknown');
            // Respond with HELLO acknowledgment
            ws.send(JSON.stringify({
                type: 'HELLO',
                data: {
                    server: {
                        name: 'DepressedChat',
                        version: '0.2.0',
                    }
                }
            }));
        } else if (type === 'PONG') {
            // Keep-alive response, ignore
        } else {
            console.log('Widget message:', type);
        }
    }

    private broadcast(message: object) {
        const data = JSON.stringify(message);
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        }
    }

    // Convert our chat message to Axelchat format
    private toAxelchatMessage(msg: {
        id: string;
        platform: 'twitch' | 'youtube' | 'kick';
        channel: string;
        user: string;
        displayName: string;
        color: string;
        content: string;
        timestamp: number;
        badges?: string[];
    }): AxelchatMessage {
        const now = new Date().toISOString();

        return {
            id: msg.id,
            author: {
                id: `${msg.platform}:${msg.user}`,
                name: msg.displayName,
                avatar: '',
                pageUrl: '',
                color: msg.color || PLATFORM_COLORS[msg.platform] || '#FFFFFF',
                customBackgroundColor: '',
                leftBadges: msg.badges || [],
                rightBadges: [],
                leftTags: [],
                rightTags: [],
                serviceBadge: PLATFORM_BADGES[msg.platform] || '',
                serviceId: msg.platform,
            },
            contents: [{
                type: 'text',
                htmlClassName: '',
                data: { text: msg.content },
                style: {},
            }],
            customAuthorAvatarUrl: '',
            customAuthorName: '',
            deletedOnPlatform: false,
            edited: false,
            eventType: 'Message',
            bodyStyle: {
                sideLineColor: PLATFORM_COLORS[msg.platform],
            },
            markedAsDeleted: false,
            multiline: msg.content.includes('\n'),
            publishedAt: new Date(msg.timestamp).toISOString(),
            receivedAt: now,
            raw: msg,
            rawType: 'ChatMessage',
            reply: null,
        };
    }

    // Send a new message to all connected widgets
    sendMessage(msg: {
        id: string;
        platform: 'twitch' | 'youtube' | 'kick';
        channel: string;
        user: string;
        displayName: string;
        color: string;
        content: string;
        timestamp: number;
        badges?: string[];
    }) {
        const axelchatMsg = this.toAxelchatMessage(msg);
        this.broadcast({
            type: 'NEW_MESSAGES_RECEIVED',
            data: {
                messages: [axelchatMsg]
            }
        });
    }

    // Clear all messages on connected widgets
    clearMessages() {
        this.broadcast({ type: 'CLEAR_MESSAGES' });
    }

    getPort(): number {
        return this.port;
    }

    isRunning(): boolean {
        return this.wss !== null;
    }

    getClientCount(): number {
        return this.clients.size;
    }
}

// Singleton instance
export const widgetServer = new WidgetServer();

// Setup IPC handlers
export function setupWidgetServerIPC() {
    ipcMain.handle('widget-server-start', async (_, port?: number) => {
        return widgetServer.start(port || 8765);
    });

    ipcMain.handle('widget-server-stop', async () => {
        widgetServer.stop();
        return true;
    });

    ipcMain.handle('widget-server-status', async () => {
        return {
            running: widgetServer.isRunning(),
            port: widgetServer.getPort(),
            clients: widgetServer.getClientCount(),
        };
    });

    ipcMain.handle('widget-server-url', async () => {
        return `ws://localhost:${widgetServer.getPort()}`;
    });

    // Handle messages from renderer to broadcast to widgets
    ipcMain.on('widget-broadcast-message', (_, msg) => {
        widgetServer.sendMessage(msg);
    });

    ipcMain.on('widget-clear-messages', () => {
        widgetServer.clearMessages();
    });
}
