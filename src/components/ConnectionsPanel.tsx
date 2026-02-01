import { useState, useCallback, useEffect } from 'react';
import { Twitch, Youtube, Play, X, Link2, Check, Loader2 } from 'lucide-react';
import { twitchService } from '../services/twitchService';
import { youtubeService } from '../services/youtubeService';
import { kickService } from '../services/kickService';
import { useSettingsStore } from '../store/useSettingsStore';
import { useConnectionStore } from '../store/useConnectionStore';

interface ConnectionsPanelProps {
    onClose: () => void;
}

export function ConnectionsPanel({ onClose }: ConnectionsPanelProps) {
    // Settings store
    const twitchChannels = useSettingsStore((s) => s.twitchChannels);
    const kickChannels = useSettingsStore((s) => s.kickChannels);
    const youtubeApiKeyStored = useSettingsStore((s) => s.youtubeApiKey);
    const twitchTokenStored = useSettingsStore((s) => s.twitchToken);
    const youtubeAccessTokenStored = useSettingsStore((s) => s.youtubeAccessToken);

    const addTwitchChannel = useSettingsStore((s) => s.addTwitchChannel);
    const setTwitchToken = useSettingsStore((s) => s.setTwitchToken);
    const addKickChannel = useSettingsStore((s) => s.addKickChannel);
    const setYoutubeApiKey = useSettingsStore((s) => s.setYoutubeApiKey);
    const setYoutubeAccessToken = useSettingsStore((s) => s.setYoutubeAccessToken);
    const addYoutubeVideoId = useSettingsStore((s) => s.addYoutubeVideoId);

    // Connection store
    const twitch = useConnectionStore((s) => s.twitch);
    const youtube = useConnectionStore((s) => s.youtube);
    const kick = useConnectionStore((s) => s.kick);
    const setTwitchAuth = useConnectionStore((s) => s.setTwitchAuth);
    const setYoutubeAuth = useConnectionStore((s) => s.setYoutubeAuth);
    const setKickAuth = useConnectionStore((s) => s.setKickAuth);

    // Local state
    const [twitchChannel, setTwitchChannel] = useState('');
    const [twitchToken, setTwitchTokenLocal] = useState('');
    const [youtubeVideoId, setYoutubeVideoId] = useState('');
    const [youtubeApiKey, setYoutubeApiKeyLocal] = useState('');
    const [youtubeAccessToken, setYoutubeAccessTokenLocal] = useState('');
    const [kickChannel, setKickChannel] = useState('');
    const [connecting, setConnecting] = useState<'twitch' | 'youtube' | 'kick' | null>(null);

    // Load saved values on mount
    useEffect(() => {
        if (youtubeApiKeyStored) setYoutubeApiKeyLocal(youtubeApiKeyStored);
        if (youtubeAccessTokenStored) setYoutubeAccessTokenLocal(youtubeAccessTokenStored);
        if (twitchTokenStored) setTwitchTokenLocal(twitchTokenStored);
        if (twitchChannels.length > 0) setTwitchChannel(twitchChannels[twitchChannels.length - 1]);
        if (kickChannels.length > 0) setKickChannel(kickChannels[kickChannels.length - 1]);
    }, [youtubeApiKeyStored, youtubeAccessTokenStored, twitchTokenStored, twitchChannels, kickChannels]);

    const handleTwitchConnect = useCallback(async () => {
        if (!twitchChannel) return;
        setConnecting('twitch');
        addTwitchChannel(twitchChannel);
        if (twitchToken) setTwitchToken(twitchToken);
        twitchService.connect([twitchChannel], twitchToken ? twitchChannel : undefined, twitchToken);
        setTimeout(() => setConnecting(null), 1000);
    }, [twitchChannel, twitchToken, addTwitchChannel, setTwitchToken]);

    const handleTwitchOAuth = useCallback(async () => {
        setConnecting('twitch');
        try {
            const result = await window.electronAPI.startTwitchOAuth();
            if (result.success && result.accessToken) {
                setTwitchTokenLocal(result.accessToken);
                setTwitchToken(result.accessToken);

                // Auto-connect using OAuth (auto-detects your channel)
                const connected = await twitchService.connectWithOAuth(result.accessToken);

                if (connected.success && connected.channel) {
                    addTwitchChannel(connected.channel);
                    // Save to persistent store for auto-reconnect
                    setTwitchAuth(result.accessToken, connected.channel);
                    console.log('Twitch: Auto-connected to', connected.channel);
                }
            }
        } catch (error) {
            console.error('Twitch OAuth error:', error);
        } finally {
            setConnecting(null);
        }
    }, [addTwitchChannel, setTwitchToken, setTwitchAuth]);

    const handleYoutubeConnect = useCallback(async () => {
        if (!youtubeVideoId || !youtubeApiKey) return;
        setConnecting('youtube');
        setYoutubeApiKey(youtubeApiKey);
        if (youtubeAccessToken) {
            setYoutubeAccessToken(youtubeAccessToken);
            youtubeService.setAccessToken(youtubeAccessToken);
        }
        addYoutubeVideoId(youtubeVideoId);
        youtubeService.connect(youtubeVideoId, youtubeApiKey);
        setTimeout(() => setConnecting(null), 1000);
    }, [youtubeVideoId, youtubeApiKey, youtubeAccessToken, setYoutubeApiKey, setYoutubeAccessToken, addYoutubeVideoId]);

    const handleYoutubeOAuth = useCallback(async () => {
        setConnecting('youtube');
        try {
            const result = await window.electronAPI.startYoutubeOAuth();
            if (result.success && result.accessToken) {
                setYoutubeAccessTokenLocal(result.accessToken);
                setYoutubeAccessToken(result.accessToken);
                youtubeService.setAccessToken(result.accessToken);

                // Try to auto-connect using OAuth (auto-detects your live stream)
                const connected = await youtubeService.connectWithOAuth(result.accessToken);

                if (connected) {
                    // Save to persistent store for auto-reconnect
                    setYoutubeAuth(result.accessToken);
                } else {
                    // No active live stream found - user can use manual entry
                    setYoutubeAuth(result.accessToken);
                    console.log('YouTube: No active broadcast, user can enter Video ID manually');
                }
            }
        } catch (error) {
            console.error('YouTube OAuth error:', error);
        } finally {
            setConnecting(null);
        }
    }, [setYoutubeAccessToken, setYoutubeAuth]);

    const handleKickOAuth = useCallback(async () => {
        setConnecting('kick');
        try {
            const result = await window.electronAPI.startKickOAuth();
            if (result.success && result.accessToken) {
                // Auto-connect using OAuth (auto-detects your channel)
                const connected = await kickService.connectWithOAuth(result.accessToken);

                if (connected.success && connected.channel) {
                    addKickChannel(connected.channel);
                    // Save to persistent store for auto-reconnect
                    setKickAuth(result.accessToken);
                    console.log('Kick: Auto-connected to', connected.channel);
                }
            } else {
                console.error('Kick OAuth failed:', result.error);
            }
        } catch (error) {
            console.error('Kick OAuth error:', error);
        } finally {
            setConnecting(null);
        }
    }, [addKickChannel, setKickAuth]);

    const handleKickConnect = useCallback(async () => {
        if (!kickChannel) return;
        setConnecting('kick');
        addKickChannel(kickChannel);
        kickService.connect(kickChannel);
        setTimeout(() => setConnecting(null), 1000);
    }, [kickChannel, addKickChannel]);

    const handleTwitchDisconnect = useCallback(() => {
        twitchService.disconnect();
    }, []);

    const handleYoutubeDisconnect = useCallback(() => {
        youtubeService.disconnect();
    }, []);

    const handleKickDisconnect = useCallback(() => {
        kickService.disconnect();
    }, []);

    return (
        <div className="flex-1 flex flex-col bg-[#000000] overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#050505]">
                <div className="flex items-center gap-2">
                    <Link2 size={18} className="text-primary" />
                    <h2 className="text-sm font-semibold text-gray-300">Connect Platforms</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Connection Cards */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Twitch Card */}
                <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-[#6441a5]/20 rounded-lg">
                                <Twitch size={20} className="text-[#6441a5]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Twitch</h3>
                                <p className="text-xs text-gray-500">Connect to Twitch chat</p>
                            </div>
                        </div>
                        {twitch.connected && (
                            <div className="flex items-center gap-1 text-green-500 text-xs">
                                <Check size={14} />
                                <span>Connected</span>
                            </div>
                        )}
                    </div>

                    {!twitch.connected ? (
                        <div className="space-y-3">
                            {/* Channel input */}
                            <input
                                type="text"
                                value={twitchChannel}
                                onChange={(e) => setTwitchChannel(e.target.value)}
                                placeholder="Channel name (e.g. xqc)"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6441a5]/50 text-white"
                                onKeyDown={(e) => e.key === 'Enter' && handleTwitchConnect()}
                            />

                            {/* OAuth Login Button */}
                            <button
                                onClick={handleTwitchOAuth}
                                disabled={connecting === 'twitch'}
                                className="w-full py-2.5 bg-[#6441a5] hover:bg-[#7d5bbe] disabled:bg-[#6441a5]/30 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {connecting === 'twitch' ? <Loader2 size={16} className="animate-spin" /> : <Twitch size={16} />}
                                Login with Twitch
                            </button>

                            {/* OR Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs text-gray-500">or enter token manually</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            {/* Manual Token Input */}
                            <input
                                type="password"
                                value={twitchToken}
                                onChange={(e) => setTwitchTokenLocal(e.target.value)}
                                placeholder="OAuth Token (for posting)"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6441a5]/50 text-white"
                            />
                            <button
                                onClick={handleTwitchConnect}
                                disabled={!twitchChannel || connecting === 'twitch'}
                                className="w-full py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-gray-300 disabled:text-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                Connect (Read-Only)
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-sm text-gray-400">
                                Connected to: <span className="text-white">{twitch.channels.join(', ')}</span>
                            </div>
                            <button
                                onClick={handleTwitchDisconnect}
                                className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>

                {/* YouTube Card */}
                <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-[#FF0000]/20 rounded-lg">
                                <Youtube size={20} className="text-[#FF0000]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">YouTube</h3>
                                <p className="text-xs text-gray-500">Connect to YouTube Live chat</p>
                            </div>
                        </div>
                        {youtube.connected && (
                            <div className="flex items-center gap-1 text-green-500 text-xs">
                                <Check size={14} />
                                <span>Connected</span>
                            </div>
                        )}
                    </div>

                    {!youtube.connected ? (
                        <div className="space-y-3">
                            {/* Video ID input - always needed */}
                            <input
                                type="text"
                                value={youtubeVideoId}
                                onChange={(e) => setYoutubeVideoId(e.target.value)}
                                placeholder="Video ID (from URL)"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF0000]/50 text-white"
                            />

                            {/* API Key input - always needed */}
                            <input
                                type="password"
                                value={youtubeApiKey}
                                onChange={(e) => setYoutubeApiKeyLocal(e.target.value)}
                                placeholder="API Key (from Google Cloud Console)"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF0000]/50 text-white"
                            />

                            {/* OAuth Login Button */}
                            <button
                                onClick={handleYoutubeOAuth}
                                disabled={connecting === 'youtube'}
                                className="w-full py-2.5 bg-[#FF0000] hover:bg-[#cc0000] disabled:bg-[#FF0000]/30 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {connecting === 'youtube' ? <Loader2 size={16} className="animate-spin" /> : <Youtube size={16} />}
                                Login with Google
                            </button>

                            {/* OR Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs text-gray-500">or enter token manually</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            {/* Manual Token Input */}
                            <input
                                type="password"
                                value={youtubeAccessToken}
                                onChange={(e) => setYoutubeAccessTokenLocal(e.target.value)}
                                placeholder="Access Token (for posting)"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF0000]/50 text-white"
                            />
                            <button
                                onClick={handleYoutubeConnect}
                                disabled={!youtubeVideoId || !youtubeApiKey || connecting === 'youtube'}
                                className="w-full py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-gray-300 disabled:text-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                Connect (Read-Only)
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-sm text-gray-400">
                                Connected to video: <span className="text-white">{youtube.videoId}</span>
                            </div>
                            <button
                                onClick={handleYoutubeDisconnect}
                                className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>

                {/* Kick Card */}
                <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-[#53FC18]/20 rounded-lg">
                                <Play size={20} className="text-[#53FC18]" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">Kick</h3>
                                <p className="text-xs text-gray-500">Connect to Kick chat</p>
                            </div>
                        </div>
                        {kick.connected && (
                            <div className="flex items-center gap-1 text-green-500 text-xs">
                                <Check size={14} />
                                <span>Connected</span>
                            </div>
                        )}
                    </div>

                    {!kick.connected ? (
                        <div className="space-y-3">
                            {/* Channel name input - always needed for viewing others' chat */}
                            <input
                                type="text"
                                value={kickChannel}
                                onChange={(e) => setKickChannel(e.target.value)}
                                placeholder="Channel name (e.g. xqc)"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#53FC18]/50 text-white"
                                onKeyDown={(e) => e.key === 'Enter' && handleKickConnect()}
                            />

                            {/* OAuth Login Button */}
                            <button
                                onClick={handleKickOAuth}
                                disabled={connecting === 'kick'}
                                className="w-full py-2.5 bg-[#53FC18] hover:bg-[#45d915] disabled:bg-[#53FC18]/30 text-black rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {connecting === 'kick' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                Login with Kick
                            </button>

                            {/* OR Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-xs text-gray-500">or connect read-only</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            {/* Read-only connect button */}
                            <button
                                onClick={handleKickConnect}
                                disabled={!kickChannel || connecting === 'kick'}
                                className="w-full py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-gray-300 disabled:text-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                Connect (Read-Only)
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-sm text-gray-400">
                                Connected to: <span className="text-white">{kick.channel}</span>
                            </div>
                            <button
                                onClick={handleKickDisconnect}
                                className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
