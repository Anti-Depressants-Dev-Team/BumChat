import { useViewCountStore } from '../store/useViewCountStore';
import { useConnectionStore } from '../store/useConnectionStore';
import { Twitch, Youtube, Play, Eye } from 'lucide-react';

export function SidebarViewerCounts() {
    const twitchCounts = useViewCountStore((s) => s.twitch);
    const youtubeCounts = useViewCountStore((s) => s.youtube);
    const kickCounts = useViewCountStore((s) => s.kick);

    const twitch = useConnectionStore((s) => s.twitch);
    const youtube = useConnectionStore((s) => s.youtube);
    const kick = useConnectionStore((s) => s.kick);

    const formatCount = (count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    const hasAnyConnection = twitch.connected || youtube.connected || kick.connected;

    // Calculate total viewers
    let totalViewers = 0;

    if (twitch.connected) {
        twitch.channels.forEach((channel) => {
            totalViewers += twitchCounts[channel] || 0;
        });
    }
    if (youtube.connected && youtube.videoId && youtubeCounts[youtube.videoId]) {
        totalViewers += youtubeCounts[youtube.videoId];
    }
    if (kick.connected && kick.channel && kickCounts[kick.channel]) {
        totalViewers += kickCounts[kick.channel];
    }

    if (!hasAnyConnection) return null;

    return (
        <div className="px-2 py-3 border-t border-white/10">
            {/* Total Count */}
            <div className="flex items-center justify-center gap-1.5 mb-3 px-2 py-1.5 bg-primary/10 rounded-lg">
                <Eye size={14} className="text-primary" />
                <span className="text-xs font-semibold text-primary">{formatCount(totalViewers)}</span>
            </div>

            {/* Per-platform counts */}
            <div className="space-y-2">
                {twitch.connected && twitch.channels.map((channel) => (
                    <div key={channel} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                        <Twitch size={14} className="text-[#6441a5]" />
                        <span className="text-xs text-gray-400 font-medium">
                            {twitchCounts[channel] !== undefined ? formatCount(twitchCounts[channel]) : '...'}
                        </span>
                    </div>
                ))}

                {youtube.connected && youtube.videoId && (
                    <div className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                        <Youtube size={14} className="text-[#FF0000]" />
                        <span className="text-xs text-gray-400 font-medium">
                            {youtubeCounts[youtube.videoId] !== undefined ? formatCount(youtubeCounts[youtube.videoId]) : '...'}
                        </span>
                    </div>
                )}

                {kick.connected && kick.channel && (
                    <div className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                        <Play size={14} className="text-[#53FC18]" />
                        <span className="text-xs text-gray-400 font-medium">
                            {kickCounts[kick.channel] !== undefined ? formatCount(kickCounts[kick.channel]) : '...'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
