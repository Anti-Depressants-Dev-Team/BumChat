import { useConnectionStore } from '../store/useConnectionStore';
import { Twitch, Play, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../lib/utils';

export function ConnectionStatus() {
    const twitch = useConnectionStore((state) => state.twitch);

    const kick = useConnectionStore((state) => state.kick);

    const platforms = [
        { name: 'Twitch', connected: twitch.connected, icon: Twitch, color: '#6441a5', channels: twitch.channels },
        { name: 'Kick', connected: kick.connected, icon: Play, color: '#53FC18', channels: kick.channel ? [kick.channel] : [] },
    ];

    const connectedCount = platforms.filter(p => p.connected).length;

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
                {connectedCount > 0 ? (
                    <Wifi size={12} className="text-green-500" />
                ) : (
                    <WifiOff size={12} className="text-gray-500" />
                )}
                <span>{connectedCount} connected</span>
            </div>
            <div className="flex items-center gap-1">
                {platforms.map((platform) => (
                    <div
                        key={platform.name}
                        className={cn(
                            "p-1 rounded transition-colors",
                            platform.connected ? "opacity-100" : "opacity-30"
                        )}
                        style={{ color: platform.color }}
                        title={platform.connected ? `${platform.name}: ${platform.channels.join(', ')}` : `${platform.name}: Not connected`}
                    >
                        <platform.icon size={12} />
                    </div>
                ))}
            </div>
        </div>
    );
}
