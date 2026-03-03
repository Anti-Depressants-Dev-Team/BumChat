import { useState, KeyboardEvent } from 'react';
import { Send, Twitch, Play, ChevronDown } from 'lucide-react';
import { twitchService } from '../../services/twitchService';
import { kickService } from '../../services/kickService';
import { useConnectionStore } from '../../store/useConnectionStore';
import { useSettingsStore } from '../../store/useSettingsStore';

type Platform = 'all' | 'twitch' | 'kick';

export function ChatInput() {
    const [message, setMessage] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>('all');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const { twitch, kick } = useConnectionStore();
    const kickToken = useSettingsStore((s) => s.kickToken);

    // Derived state
    const isTwitchConnected = twitch.connected;

    const isKickConnected = kick.connected;
    const twitchChannels = twitch.channels;

    const handleSend = async () => {
        if (!message.trim()) return;

        const promises: Promise<any>[] = [];

        // Twitch
        if ((selectedPlatform === 'all' || selectedPlatform === 'twitch') && isTwitchConnected && twitchChannels.length > 0) {
            // Send to all connected Twitch channels
            twitchChannels.forEach(channel => {
                promises.push(twitchService.sendMessage(channel, message));
            });
        }

        // Kick
        if ((selectedPlatform === 'all' || selectedPlatform === 'kick') && isKickConnected && kickToken) {
            promises.push(kickService.sendMessage(message, kickToken));
        }

        await Promise.all(promises);
        setMessage('');
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Calculate which platforms are available
    const availablePlatforms: { id: Platform; icon: any; color: string }[] = [];
    if (isTwitchConnected) availablePlatforms.push({ id: 'twitch', icon: Twitch, color: 'text-[#6441a5]' });

    if (isKickConnected) availablePlatforms.push({ id: 'kick', icon: Play, color: 'text-[#53FC18]' });

    if (availablePlatforms.length > 0) {
        availablePlatforms.unshift({ id: 'all', icon: Send, color: 'text-white' });
    }

    const currentPlatform = availablePlatforms.find(p => p.id === selectedPlatform) || availablePlatforms[0];

    // If no connections, disable input
    if (availablePlatforms.length === 0) return null;

    return (
        <div className="p-4 bg-[#111] border-t border-white/10">
            <div className="flex gap-2">
                {/* Platform Selector */}
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="h-full px-3 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-l-md transition-colors gap-1"
                    >
                        {currentPlatform?.icon && <currentPlatform.icon size={16} className={currentPlatform.color} />}
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-32 bg-[#1a1a1a] border border-white/10 rounded-md shadow-xl overflow-hidden z-50">
                            {availablePlatforms.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedPlatform(p.id);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-xs font-medium"
                                >
                                    <p.icon size={14} className={p.color} />
                                    <span className="capitalize">{p.id}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Input */}
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${selectedPlatform === 'all' ? 'all chats' : selectedPlatform}...`}
                    className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                />

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    className="px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-r-md transition-colors flex items-center justify-center"
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}
