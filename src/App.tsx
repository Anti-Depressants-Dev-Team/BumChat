import { useState, useCallback, useEffect } from 'react'
import { Layout, MessageSquare, Twitch, Youtube, Play, ArrowRight, Key } from 'lucide-react'
import { ChatList } from './components/Chat/ChatList'
import { ConnectionStatus } from './components/ConnectionStatus'
import { ViewCounters } from './components/ViewCounters'
import { ChatInput } from './components/Chat/ChatInput'
import { twitchService } from './services/twitchService'
import { youtubeService } from './services/youtubeService'
import { kickService } from './services/kickService'
import { useSettingsStore } from './store/useSettingsStore'

function App() {
    // Get persisted settings
    const youtubeApiKeyStored = useSettingsStore((s) => s.youtubeApiKey);
    const twitchChannels = useSettingsStore((s) => s.twitchChannels);
    const kickChannels = useSettingsStore((s) => s.kickChannels);
    const addTwitchChannel = useSettingsStore((s) => s.addTwitchChannel);
    const setTwitchToken = useSettingsStore((s) => s.setTwitchToken);
    const twitchTokenStored = useSettingsStore((s) => s.twitchToken);
    const addKickChannel = useSettingsStore((s) => s.addKickChannel);
    const setYoutubeApiKey = useSettingsStore((s) => s.setYoutubeApiKey);
    const setYoutubeAccessToken = useSettingsStore((s) => s.setYoutubeAccessToken);
    const youtubeAccessTokenStored = useSettingsStore((s) => s.youtubeAccessToken);
    const addYoutubeVideoId = useSettingsStore((s) => s.addYoutubeVideoId);

    // Initialize with last used values
    const [twitchChannel, setTwitchChannel] = useState('')
    const [twitchToken, setTwitchTokenLocal] = useState('')
    const [youtubeVideoId, setYoutubeVideoId] = useState('')
    const [youtubeApiKey, setYoutubeApiKeyLocal] = useState('')
    const [youtubeAccessToken, setYoutubeAccessTokenLocal] = useState('')
    const [kickChannel, setKickChannel] = useState('')
    const [activeTab, setActiveTab] = useState<'twitch' | 'youtube' | 'kick'>('twitch')

    // Load saved values on mount
    useEffect(() => {
        if (youtubeApiKeyStored) {
            setYoutubeApiKeyLocal(youtubeApiKeyStored);
        }
        if (youtubeAccessTokenStored) {
            setYoutubeAccessTokenLocal(youtubeAccessTokenStored);
        }
        if (twitchTokenStored) {
            setTwitchTokenLocal(twitchTokenStored);
        }
        // Pre-fill last used channel
        if (twitchChannels.length > 0) {
            setTwitchChannel(twitchChannels[twitchChannels.length - 1]);
        }
        if (kickChannels.length > 0) {
            setKickChannel(kickChannels[kickChannels.length - 1]);
        }
    }, [youtubeApiKeyStored, twitchChannels, kickChannels]);

    const handleTwitchConnect = useCallback(() => {
        if (!twitchChannel) return;
        addTwitchChannel(twitchChannel);
        if (twitchToken) {
            setTwitchToken(twitchToken);
        }
        // Assuming username is same as channel for simplicity in single-channel mode, 
        // or we need a separate username field. For now, let's use the channel name if just one
        // or user can be anonymous.
        // Actually, for OAuth to work properly, we need the username associated with the token.
        // Let's assume the user enters their own channel to connect to? 
        // Or better, just pass the token and let tmi.js handle it if possible, 
        // but tmi.js needs username for identity.
        // Let's assume the user is connecting to their own channel for now or just generic read-only.

        // If we have a token, we try to use it with the channel name as username (common use case)
        // ideally we would validate the token to get the username, but for MVP:
        twitchService.connect([twitchChannel], twitchToken ? twitchChannel : undefined, twitchToken);
    }, [twitchChannel, twitchToken, addTwitchChannel, setTwitchToken]);

    const handleYoutubeConnect = useCallback(() => {
        if (!youtubeVideoId || !youtubeApiKey) return;
        setYoutubeApiKey(youtubeApiKey);
        if (youtubeAccessToken) {
            setYoutubeAccessToken(youtubeAccessToken);
            youtubeService.setAccessToken(youtubeAccessToken);
        }
        addYoutubeVideoId(youtubeVideoId);
        youtubeService.connect(youtubeVideoId, youtubeApiKey);
    }, [youtubeVideoId, youtubeApiKey, youtubeAccessToken, setYoutubeApiKey, setYoutubeAccessToken, addYoutubeVideoId]);

    const handleKickConnect = useCallback(() => {
        if (!kickChannel) return;
        addKickChannel(kickChannel);
        kickService.connect(kickChannel);
    }, [kickChannel, addKickChannel]);



    return (
        <div className="flex h-screen w-full bg-background text-white overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-16 flex flex-col items-center py-4 bg-[#0a0a0a] border-r border-primary/20 space-y-4">
                <div className="p-2 bg-primary/20 rounded-lg text-primary mb-4">
                    <Layout size={24} />
                </div>

                <button className="p-3 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                    <MessageSquare size={20} />
                </button>
                <div className="w-8 h-[1px] bg-white/10 my-2"></div>
                <button
                    onClick={() => setActiveTab('twitch')}
                    className={`p-3 rounded-xl transition-colors ${activeTab === 'twitch' ? 'bg-[#6441a5]/20 text-[#6441a5]' : 'hover:bg-[#6441a5]/20 hover:text-[#6441a5] text-gray-400'}`}
                >
                    <Twitch size={20} />
                </button>
                <button
                    onClick={() => setActiveTab('youtube')}
                    className={`p-3 rounded-xl transition-colors ${activeTab === 'youtube' ? 'bg-[#FF0000]/20 text-[#FF0000]' : 'hover:bg-[#FF0000]/20 hover:text-[#FF0000] text-gray-400'}`}
                >
                    <Youtube size={20} />
                </button>
                <button
                    onClick={() => setActiveTab('kick')}
                    className={`p-3 rounded-xl transition-colors ${activeTab === 'kick' ? 'bg-[#53FC18]/20 text-[#53FC18]' : 'hover:bg-[#53FC18]/20 hover:text-[#53FC18] text-gray-400'}`}
                >
                    <Play size={20} />
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Header */}
                <header className="h-14 border-b border-white/10 flex items-center px-4 bg-[#050505] draggable justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-sm font-semibold text-gray-300">DepressedChat</h1>

                        {/* Twitch Connection */}
                        {activeTab === 'twitch' && (
                            <div className="flex items-center gap-2 no-drag">
                                <Twitch size={14} className="text-[#6441a5]" />
                                <input
                                    type="text"
                                    value={twitchChannel}
                                    onChange={(e) => setTwitchChannel(e.target.value)}
                                    placeholder="Channel (e.g. xqc)"
                                    className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs w-32 focus:outline-none focus:border-[#6441a5]/50 text-white"
                                    onKeyDown={(e) => e.key === 'Enter' && handleTwitchConnect()}
                                />
                                <Key size={12} className="text-gray-500" />
                                <input
                                    type="password"
                                    value={twitchToken}
                                    onChange={(e) => setTwitchTokenLocal(e.target.value)}
                                    placeholder="OAuth Token (Optional)"
                                    className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs w-28 focus:outline-none focus:border-[#6441a5]/50 text-white"
                                />
                                <button
                                    onClick={handleTwitchConnect}
                                    className="p-1 bg-[#6441a5]/20 hover:bg-[#6441a5]/40 text-[#6441a5] rounded-md transition-colors"
                                >
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        )}

                        {/* YouTube Connection */}
                        {activeTab === 'youtube' && (
                            <div className="flex items-center gap-2 no-drag">
                                <Youtube size={14} className="text-[#FF0000]" />
                                <input
                                    type="text"
                                    value={youtubeVideoId}
                                    onChange={(e) => setYoutubeVideoId(e.target.value)}
                                    placeholder="Video ID"
                                    className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs w-28 focus:outline-none focus:border-[#FF0000]/50 text-white"
                                />
                                <Key size={12} className="text-gray-500" />
                                <input
                                    type="password"
                                    value={youtubeApiKey}
                                    onChange={(e) => setYoutubeApiKeyLocal(e.target.value)}
                                    placeholder="API Key"
                                    className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs w-28 focus:outline-none focus:border-[#FF0000]/50 text-white"
                                    onKeyDown={(e) => e.key === 'Enter' && handleYoutubeConnect()}
                                />
                                <Key size={12} className="text-gray-500" />
                                <input
                                    type="password"
                                    value={youtubeAccessToken}
                                    onChange={(e) => setYoutubeAccessTokenLocal(e.target.value)}
                                    placeholder="Access Token (Optional)"
                                    className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs w-28 focus:outline-none focus:border-[#FF0000]/50 text-white"
                                    onKeyDown={(e) => e.key === 'Enter' && handleYoutubeConnect()}
                                />
                                <button
                                    onClick={handleYoutubeConnect}
                                    className="p-1 bg-[#FF0000]/20 hover:bg-[#FF0000]/40 text-[#FF0000] rounded-md transition-colors"
                                >
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        )}

                        {/* Kick Connection */}
                        {activeTab === 'kick' && (
                            <div className="flex items-center gap-2 no-drag">
                                <Play size={14} className="text-[#53FC18]" />
                                <input
                                    type="text"
                                    value={kickChannel}
                                    onChange={(e) => setKickChannel(e.target.value)}
                                    placeholder="Channel (e.g. xqc)"
                                    className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs w-32 focus:outline-none focus:border-[#53FC18]/50 text-white"
                                    onKeyDown={(e) => e.key === 'Enter' && handleKickConnect()}
                                />
                                <button
                                    onClick={handleKickConnect}
                                    className="p-1 bg-[#53FC18]/20 hover:bg-[#53FC18]/40 text-[#53FC18] rounded-md transition-colors"
                                >
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <ConnectionStatus />
                        <span className="text-xs text-gray-500">v0.1.0</span>
                    </div>
                </header>

                {/* Unified Chat Area */}
                <div className="flex-1 overflow-hidden bg-[#000000] flex flex-col">
                    <ViewCounters />
                    <ChatList />
                    <ChatInput />
                </div>
            </main>
        </div>
    )
}

export default App
