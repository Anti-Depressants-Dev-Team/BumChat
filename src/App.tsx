import { Layout, MessageSquare, Twitch, Play, Unplug, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { ChatList } from './components/Chat/ChatList'
import { ConnectionStatus } from './components/ConnectionStatus'
import { ViewCounters } from './components/ViewCounters'
import { ChatInput } from './components/Chat/ChatInput'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { twitchService } from './services/twitchService'
import { kickService } from './services/kickService'
import { useSettingsStore } from './store/useSettingsStore'

function App() {
    const setGlobalChannel = useSettingsStore((s) => s.setGlobalChannel);

    const twitchToken = useSettingsStore((s) => s.twitchToken);
    const setTwitchToken = useSettingsStore((s) => s.setTwitchToken);
    const twitchUsername = useSettingsStore((s) => s.twitchUsername);
    const setTwitchUsername = useSettingsStore((s) => s.setTwitchUsername);

    const kickToken = useSettingsStore((s) => s.kickToken);
    const setKickToken = useSettingsStore((s) => s.setKickToken);

    // Persisted channel names (remembered across restarts)
    const twitchChannel = useSettingsStore((s) => s.twitchChannel);
    const setTwitchChannel = useSettingsStore((s) => s.setTwitchChannel);
    const kickChannel = useSettingsStore((s) => s.kickChannel);
    const setKickChannel = useSettingsStore((s) => s.setKickChannel);

    const [activeTab, setActiveTab] = useState<'chat' | 'settings'>('chat');

    const handleTwitchAuth = async () => {
        try {
            const res = await window.electronAPI.loginTwitch();
            if (res.success && res.token) {
                setTwitchToken(res.token);

                const userRes = await fetch('https://api.twitch.tv/helix/users', {
                    headers: {
                        'Authorization': `Bearer ${res.token} `,
                        'Client-Id': 'fxsevpfcyqohtjqruissg3776uf5ng'
                    }
                });

                if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData.data && userData.data.length > 0) {
                        const username = userData.data[0].login;
                        setTwitchUsername(username);

                        if (twitchChannel) {
                            setGlobalChannel(twitchChannel);
                            twitchService.connect([twitchChannel], username, res.token);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Twitch Auth Failed:', e);
        }
    };

    const handleKickAuth = async () => {
        try {
            const res = await window.electronAPI.loginKick();
            if (res.success && res.token) {
                setKickToken(res.token);
                if (kickChannel) {
                    kickService.connect(kickChannel, res.token);
                }
            }
        } catch (e) {
            console.error('Kick Auth Failed:', e);
        }
    };

    const disconnectTwitch = () => {
        twitchService.disconnect();
        setTwitchToken('');
        setTwitchUsername('');
    };

    const disconnectKick = () => {
        kickService.disconnect();
        setKickToken('');
    };

    return (
        <div className="flex h-screen w-full bg-background text-white overflow-hidden font-sans">
            {/* Sidebar minimal */}
            <aside className="w-16 flex flex-col items-center py-4 bg-[#0a0a0a] border-r border-primary/20 space-y-4">
                <div className="p-2 bg-primary/20 rounded-lg text-primary mb-4">
                    <Layout size={24} />
                </div>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`p - 3 rounded - xl transition - colors ${activeTab === 'chat' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'} `}
                    title="Chat"
                >
                    <MessageSquare size={20} />
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`p-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    title="Settings"
                >
                    <SettingsIcon size={20} />
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Header */}
                <header className="border-b border-white/10 bg-[#050505] draggable">
                    <div className="flex items-center justify-between px-4 h-14">
                        <div className="flex items-center gap-4">
                            <h1 className="text-sm font-semibold text-gray-300">BumpChat</h1>

                            {/* Per-platform channel inputs with individual Watch buttons */}
                            <div className="flex items-center gap-3 no-drag">
                                {/* Twitch */}
                                <div className="flex items-center gap-1">
                                    <Twitch size={14} className="text-[#6441a5] shrink-0" />
                                    <input
                                        type="text"
                                        value={twitchChannel}
                                        onChange={(e) => setTwitchChannel(e.target.value)}
                                        placeholder="Twitch channel"
                                        className="bg-white/5 border border-[#6441a5]/30 rounded-md px-2 py-1 text-xs w-28 focus:outline-none focus:border-[#6441a5]/60 text-white placeholder:text-gray-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && twitchChannel) {
                                                setGlobalChannel(twitchChannel);
                                                if (twitchToken && twitchUsername) {
                                                    twitchService.connect([twitchChannel], twitchUsername, twitchToken);
                                                } else {
                                                    twitchService.connect([twitchChannel]);
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            if (!twitchChannel) return;
                                            setGlobalChannel(twitchChannel);
                                            if (twitchToken && twitchUsername) {
                                                twitchService.connect([twitchChannel], twitchUsername, twitchToken);
                                            } else {
                                                twitchService.connect([twitchChannel]);
                                            }
                                        }}
                                        className="bg-[#6441a5]/20 hover:bg-[#6441a5]/40 text-[#6441a5] rounded-md transition-colors px-2 py-1 text-xs font-semibold"
                                    >
                                        Watch
                                    </button>
                                    {/* Twitch Login */}
                                    {!twitchToken ? (
                                        <button onClick={handleTwitchAuth} className="flex items-center gap-1 bg-[#6441a5] hover:bg-[#7b5dfa] transition-colors px-2 py-1 rounded-md text-xs font-semibold shadow-sm">
                                            Login
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1 bg-[#6441a5]/10 border border-[#6441a5]/30 px-2 py-1 rounded-md text-xs">
                                            <span className="text-gray-300 font-medium">{twitchUsername || 'OK'}</span>
                                            <button onClick={disconnectTwitch} className="text-red-400 hover:text-red-300" title="Logout">
                                                <Unplug size={11} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="w-[1px] h-5 bg-white/10"></div>

                                {/* Kick */}
                                <div className="flex items-center gap-1">
                                    <Play size={14} className="text-[#53FC18] shrink-0" />
                                    <input
                                        type="text"
                                        value={kickChannel}
                                        onChange={(e) => setKickChannel(e.target.value)}
                                        placeholder="Kick channel"
                                        className="bg-white/5 border border-[#53FC18]/30 rounded-md px-2 py-1 text-xs w-28 focus:outline-none focus:border-[#53FC18]/60 text-white placeholder:text-gray-500"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && kickChannel) {
                                                kickService.connect(kickChannel, kickToken || undefined);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            if (!kickChannel) return;
                                            kickService.connect(kickChannel, kickToken || undefined);
                                        }}
                                        className="bg-[#53FC18]/20 hover:bg-[#53FC18]/40 text-[#53FC18] rounded-md transition-colors px-2 py-1 text-xs font-semibold"
                                    >
                                        Watch
                                    </button>
                                    {/* Kick Login */}
                                    {!kickToken ? (
                                        <button onClick={handleKickAuth} className="flex items-center gap-1 bg-[#53FC18] hover:bg-[#66ff33] text-black transition-colors px-2 py-1 rounded-md text-xs font-semibold shadow-sm">
                                            Login
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1 bg-[#53FC18]/10 border border-[#53FC18]/30 px-2 py-1 rounded-md text-xs">
                                            <span className="text-gray-300 font-medium">OK</span>
                                            <button onClick={disconnectKick} className="text-red-400 hover:text-red-300" title="Logout">
                                                <Unplug size={11} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <ConnectionStatus />
                            <span className="text-xs text-gray-500">v0.1.0</span>
                        </div>
                    </div>
                </header>

                {/* Main View Area */}
                {activeTab === 'chat' ? (
                    <div className="flex-1 overflow-hidden bg-[#000000] flex flex-col">
                        <ViewCounters />
                        <ChatList />
                        <ChatInput />
                    </div>
                ) : (
                    <SettingsPanel />
                )}
            </main>
        </div>
    )
}

export default App
