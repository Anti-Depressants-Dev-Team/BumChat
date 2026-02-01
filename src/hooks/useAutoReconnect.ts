import { useEffect, useRef } from 'react';
import { useConnectionStore } from '../store/useConnectionStore';
import { twitchService } from '../services/twitchService';
import { youtubeService } from '../services/youtubeService';
import { kickService } from '../services/kickService';

/**
 * Hook that auto-reconnects to platforms using saved tokens when app starts
 */
export function useAutoReconnect() {
    const hasAttemptedReconnect = useRef(false);

    const twitchToken = useConnectionStore((s) => s.twitch.token);
    const twitchUsername = useConnectionStore((s) => s.twitch.username);
    const youtubeToken = useConnectionStore((s) => s.youtube.accessToken);
    const kickToken = useConnectionStore((s) => s.kick.accessToken);

    useEffect(() => {
        // Only attempt reconnect once on mount
        if (hasAttemptedReconnect.current) return;
        hasAttemptedReconnect.current = true;

        const reconnect = async () => {
            console.log('Auto-reconnect: Checking for saved tokens...');

            // Reconnect Twitch if we have a token
            if (twitchToken && twitchUsername) {
                console.log('Auto-reconnect: Reconnecting to Twitch as', twitchUsername);
                try {
                    await twitchService.connectWithOAuth(twitchToken);
                } catch (error) {
                    console.error('Auto-reconnect: Twitch failed', error);
                }
            }

            // Reconnect YouTube if we have a token
            if (youtubeToken) {
                console.log('Auto-reconnect: Reconnecting to YouTube');
                try {
                    await youtubeService.connectWithOAuth(youtubeToken);
                } catch (error) {
                    console.error('Auto-reconnect: YouTube failed', error);
                }
            }

            // Reconnect Kick if we have a token
            if (kickToken) {
                console.log('Auto-reconnect: Reconnecting to Kick');
                try {
                    await kickService.connectWithOAuth(kickToken);
                } catch (error) {
                    console.error('Auto-reconnect: Kick failed', error);
                }
            }
        };

        // Small delay to let stores hydrate
        setTimeout(reconnect, 500);
    }, []); // Empty deps - only run once on mount
}
