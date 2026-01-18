import { useViewCountStore } from '../store/useViewCountStore';
import { useConnectionStore } from '../store/useConnectionStore';
import { Twitch, Youtube, Play, Eye } from 'lucide-react';

export function ViewCounters() {
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

    if (!hasAnyConnection) return null;

    return (
        <div className="flex items-center gap-3 px-3 py-2 bg-[#0a0a0a] border-b border-white/5">
            <Eye size={14} className="text-gray-500" />

            {twitch.connected && twitch.channels.map((channel) => (
                <div key={channel} className="flex items-center gap-1.5 text-xs">
                    <Twitch size={12} className="text-[#6441a5]" />
                    <span className="text-gray-400">{channel}:</span>
                    <span className="text-white font-medium">
                        {twitchCounts[channel] !== undefined ? formatCount(twitchCounts[channel]) : '...'}
                    </span>
                </div>
            ))}

            {youtube.connected && youtube.videoId && (
                <div className="flex items-center gap-1.5 text-xs">
                    <Youtube size={12} className="text-[#FF0000]" />
                    <span className="text-gray-400">Live:</span>
                    <span className="text-white font-medium">
                        {youtubeCounts[youtube.videoId] !== undefined ? formatCount(youtubeCounts[youtube.videoId]) : '...'}
                    </span>
                </div>
            )}

            {kick.connected && kick.channel && (
                <div className="flex items-center gap-1.5 text-xs">
                    <Play size={12} className="text-[#53FC18]" />
                    <span className="text-gray-400">{kick.channel}:</span>
                    <span className="text-white font-medium">
                        {kickCounts[kick.channel] !== undefined ? formatCount(kickCounts[kick.channel]) : '...'}
                    </span>
                </div>
            )}
        </div>
    );
}
