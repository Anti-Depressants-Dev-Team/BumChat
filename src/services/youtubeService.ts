import { useChatStore, ChatMessage } from '../store/useChatStore';
import { useConnectionStore } from '../store/useConnectionStore';
import { useViewCountStore } from '../store/useViewCountStore';

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

interface YouTubeChatMessage {
    id: string;
    snippet: {
        displayMessage: string;
        publishedAt: string;
        authorChannelId: string;
    };
    authorDetails: {
        displayName: string;
        channelId: string;
        profileImageUrl: string;
        isChatOwner: boolean;
        isChatModerator: boolean;
        isChatSponsor: boolean;
    };
}

interface LiveChatResponse {
    pollingIntervalMillis: number;
    nextPageToken?: string;
    items: YouTubeChatMessage[];
}

class YouTubeService {
    private apiKey: string = '';
    private liveChatId: string = '';
    private pollingInterval: NodeJS.Timeout | null = null;
    private viewCountInterval: NodeJS.Timeout | null = null;
    private nextPageToken: string = '';
    private videoId: string = '';

    async connect(videoId: string, apiKey: string) {
        this.apiKey = apiKey;

        try {
            // Get liveChatId from video details
            const videoResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`
            );
            const videoData = await videoResponse.json();

            if (!videoData.items || videoData.items.length === 0) {
                console.error('YouTube: Video not found or not a live stream');
                return;
            }

            const liveChatId = videoData.items[0]?.liveStreamingDetails?.activeLiveChatId;
            if (!liveChatId) {
                console.error('YouTube: No active live chat found for this video');
                return;
            }

            this.liveChatId = liveChatId;
            this.videoId = videoId;
            console.log('YouTube: Connected to live chat', liveChatId);
            useConnectionStore.getState().setYoutubeConnected(true, videoId);

            // Start polling for messages and view counts
            this.startPolling();
            this.startViewCountPolling();
        } catch (error) {
            console.error('YouTube: Connection error', error);
        }
    }

    private async fetchViewCount() {
        if (!this.videoId || !this.apiKey) return;

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${this.videoId}&key=${this.apiKey}`
            );
            const data = await response.json();

            if (data.items?.[0]?.liveStreamingDetails?.concurrentViewers) {
                const count = parseInt(data.items[0].liveStreamingDetails.concurrentViewers);
                useViewCountStore.getState().setYoutubeViewCount(this.videoId, count);
            }
        } catch (error) {
            console.error('YouTube: View count fetch error', error);
        }
    }

    private startViewCountPolling() {
        this.fetchViewCount();
        this.viewCountInterval = setInterval(() => this.fetchViewCount(), 30000); // Every 30 seconds
    }

    private async fetchMessages() {
        if (!this.liveChatId || !this.apiKey) return;

        try {
            let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${this.liveChatId}&part=snippet,authorDetails&key=${this.apiKey}`;
            if (this.nextPageToken) {
                url += `&pageToken=${this.nextPageToken}`;
            }

            const response = await fetch(url);
            const data: LiveChatResponse = await response.json();

            if (data.items) {
                data.items.forEach((item) => {
                    const chatMsg: ChatMessage = {
                        id: item.id || generateId(),
                        platform: 'youtube',
                        channel: this.liveChatId,
                        user: item.authorDetails.channelId,
                        displayName: item.authorDetails.displayName,
                        color: '#FF0000', // YouTube red
                        content: item.snippet.displayMessage,
                        timestamp: new Date(item.snippet.publishedAt).getTime(),
                        badges: this.getBadges(item.authorDetails),
                    };
                    useChatStore.getState().addMessage(chatMsg);
                });
            }

            this.nextPageToken = data.nextPageToken || '';

            // Respect polling interval from API (usually 5-10 seconds)
            const pollInterval = data.pollingIntervalMillis || 5000;
            this.scheduleNextPoll(pollInterval);
        } catch (error) {
            console.error('YouTube: Fetch error', error);
            // Retry after a delay on error
            this.scheduleNextPoll(10000);
        }
    }

    private getBadges(authorDetails: YouTubeChatMessage['authorDetails']): string[] {
        const badges: string[] = [];
        if (authorDetails.isChatOwner) badges.push('owner');
        if (authorDetails.isChatModerator) badges.push('moderator');
        if (authorDetails.isChatSponsor) badges.push('member');
        return badges;
    }

    private startPolling() {
        this.fetchMessages();
    }

    private scheduleNextPoll(delay: number) {
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval);
        }
        this.pollingInterval = setTimeout(() => this.fetchMessages(), delay);
    }

    private accessToken: string = '';

    // ... existing connection logic ...

    setAccessToken(token: string) {
        this.accessToken = token;
    }

    async sendMessage(message: string) {
        if (!this.liveChatId || !this.accessToken) {
            console.error('YouTube: Cannot send message - missing liveChatId or accessToken');
            return;
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/liveChat/messages?part=snippet&key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        snippet: {
                            liveChatId: this.liveChatId,
                            type: 'textMessageEvent',
                            textMessageDetails: {
                                messageText: message,
                            },
                        },
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                console.error('YouTube: Failed to send message', error);
                return;
            }

            const data = await response.json();

            // Add to store immediately
            const chatMsg: ChatMessage = {
                id: data.id || generateId(),
                platform: 'youtube',
                channel: this.liveChatId,
                user: 'me', // We'd need to fetch user profile to get this right
                displayName: 'Me',
                color: '#FF0000',
                content: message,
                timestamp: Date.now(),
                badges: ['owner'], // Assume owner if sending with token? mostly true for streamers
            };
            useChatStore.getState().addMessage(chatMsg);

        } catch (error) {
            console.error('YouTube: Error sending message', error);
        }
    }

    disconnect() {
        if (this.pollingInterval) {
            clearTimeout(this.pollingInterval);
            this.pollingInterval = null;
        }
        if (this.viewCountInterval) {
            clearInterval(this.viewCountInterval);
            this.viewCountInterval = null;
        }
        this.liveChatId = '';
        this.apiKey = '';
        this.videoId = '';
        this.accessToken = '';
        this.nextPageToken = '';
        useConnectionStore.getState().setYoutubeConnected(false);
        console.log('YouTube: Disconnected');
    }
}

export const youtubeService = new YouTubeService();
