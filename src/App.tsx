import { Layout, MessageSquare, Twitch, Play, Unplug, Settings as SettingsIcon, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'
import { ChatList } from './components/Chat/ChatList'
import { ConnectionStatus } from './components/ConnectionStatus'
import { ViewCounters } from './components/ViewCounters'
import { ChatInput } from './components/Chat/ChatInput'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { twitchService } from './services/twitchService'
import { kickService } from './services/kickService'
import { useSettingsStore } from './store/useSettingsStore'
import { useConnectionStore } from './store/useConnectionStore'

function App() {
    const setGlobalChannel = useSettingsStore((s) => s.setGlobalChannel);

    const twitchToken = useSettingsStore((s) => s.twitchToken);
    const setTwitchToken = useSettingsStore((s) => s.setTwitchToken);
    const twitchUsername = useSettingsStore((s) => s.twitchUsername);
    const setTwitchUsername = useSettingsStore((s) => s.setTwitchUsername);

    const kickToken = useSettingsStore((s) => s.kickToken);
    const setKickToken = useSettingsStore((s) => s.setKickToken);
    const kickUsername = useSettingsStore((s) => s.kickUsername);
    const setKickUsername = useSettingsStore((s) => s.setKickUsername);

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
                        setTwitchChannel(username);
                        setGlobalChannel(username);
                        twitchService.connect([username], username, res.token);
                    }
                }
            }
        } catch (e) {
            console.error('Twitch Auth Failed:', e);
        }
    };

    // Auto-connect to Kick: fetches user info then connects to their channel
    const connectKick = async (token: string) => {
        try {
            // Step 1: Get the authenticated user's info (slug, user_id)
            const userInfo = await window.electronAPI.getKickUser(token);
            if (!userInfo) {
                console.error('Kick: Could not fetch user info — token may be expired');
                // Clear the expired token
                setKickToken('');
                setKickUsername('');
                setKickChannel('');
                return;
            }

            const displayName = userInfo.name || userInfo.slug || userInfo.username || '';
            const userId = userInfo.user_id;
            console.log('Kick: Authenticated as', displayName, 'user_id:', userId);
            setKickUsername(displayName);

            // Step 2: Connect to the user's own channel chat
            // Pass userId so the channel can be found by broadcaster_user_id
            // (display name may differ from channel slug)
            kickService.connect(displayName, token, userId);
        } catch (e) {
            console.error('Kick: Auto-connect failed:', e);
        }
    };

    const handleKickAuth = async () => {
        try {
            const res = await window.electronAPI.loginKick();
            if (res.success && res.token) {
                setKickToken(res.token);
                await connectKick(res.token);
            }
        } catch (e) {
            console.error('Kick Auth Failed:', e);
        }
    };

    const disconnectTwitch = () => {
        twitchService.disconnect();
        setTwitchToken('');
        setTwitchUsername('');
        setTwitchChannel('');
    };

    const disconnectKick = () => {
        kickService.disconnect();
        setKickToken('');
        setKickUsername('');
        setKickChannel('');
    };

    // Auto-connect on startup if we have stored credentials
    useEffect(() => {
        // Kick: always validate token first via connectKick (detects expired tokens)
        if (kickToken) {
            connectKick(kickToken);
        }

        // Twitch: auto-connect if we have stored credentials
        if (twitchChannel) {
            if (twitchToken && twitchUsername) {
                setGlobalChannel(twitchChannel);
                twitchService.connect([twitchChannel], twitchUsername, twitchToken);
            } else {
                // Connect anonymously (read-only)
                twitchService.connect([twitchChannel]);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount

    // Listen for messages from OBS dock widget
    useEffect(() => {
        window.electronAPI.onDockSendMessage(async (data) => {
            const { message, platform } = data;
            if (!message?.trim()) return;

            try {
                if (platform === 'twitch' || platform === 'all') {
                    const { twitch: tw } = useConnectionStore.getState();
                    if (tw.connected && tw.channels.length > 0) {
                        tw.channels.forEach((ch: string) => twitchService.sendMessage(ch, message));
                    }
                }
                if (platform === 'kick' || platform === 'all') {
                    const kt = useSettingsStore.getState().kickToken;
                    if (kt) kickService.sendMessage(message, kt);
                }
            } catch (e) {
                console.error('Dock send-message error:', e);
            }
        });
    }, []);

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
                                    {!twitchToken ? (
                                        <button onClick={handleTwitchAuth} className="flex items-center gap-1 bg-[#6441a5] hover:bg-[#7b5dfa] transition-colors px-2 py-1 rounded-md text-xs font-semibold shadow-sm">
                                            Login
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1 bg-[#6441a5]/10 border border-[#6441a5]/30 px-2 py-1 rounded-md text-xs">
                                            <span className="text-gray-300 font-medium">{twitchUsername || twitchChannel || 'Connected'}</span>
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
                                    {!kickToken ? (
                                        <button onClick={handleKickAuth} className="flex items-center gap-1 bg-[#53FC18] hover:bg-[#66ff33] text-black transition-colors px-2 py-1 rounded-md text-xs font-semibold shadow-sm">
                                            Login
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1 bg-[#53FC18]/10 border border-[#53FC18]/30 px-2 py-1 rounded-md text-xs">
                                            <span className="text-gray-300 font-medium">{kickUsername || kickChannel || 'Connected'}</span>
                                            <button onClick={disconnectKick} className="text-red-400 hover:text-red-300" title="Logout">
                                                <Unplug size={11} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 no-drag">
                            <button
                                onClick={() => window.electronAPI.popOutChat()}
                                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-2 py-1 rounded-md transition-colors text-xs font-medium"
                                title="Pop out chat as separate window (for OBS Window Capture)"
                            >
                                <ExternalLink size={12} />
                                Pop Out
                            </button>
                            <ConnectionStatus />
                            <span className="text-xs text-gray-500">v1.2.4</span>
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
