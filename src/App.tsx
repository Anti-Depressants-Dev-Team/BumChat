import { useState } from 'react'
import { Layout, MessageSquare, Link2, Server } from 'lucide-react'
import { ChatList } from './components/Chat/ChatList'
import { ConnectionStatus } from './components/ConnectionStatus'
import { ChatInput } from './components/Chat/ChatInput'
import { ConnectionsPanel } from './components/ConnectionsPanel'
import { WidgetsPanel } from './components/WidgetsPanel'
import { SidebarViewerCounts } from './components/SidebarViewerCounts'
import { useAutoReconnect } from './hooks/useAutoReconnect'

type ViewType = 'chat' | 'connections' | 'widgets';

function App() {
    const [currentView, setCurrentView] = useState<ViewType>('chat');

    // Auto-reconnect to platforms using saved tokens
    useAutoReconnect();

    return (
        <div className="flex h-screen w-full bg-background text-white overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-16 flex flex-col items-center py-4 bg-[#0a0a0a] border-r border-primary/20">
                {/* Logo */}
                <div className="p-2 bg-primary/20 rounded-lg text-primary mb-4">
                    <Layout size={24} />
                </div>

                {/* Navigation Buttons */}
                <div className="flex flex-col items-center gap-2">
                    {/* Chat View Button */}
                    <button
                        onClick={() => setCurrentView('chat')}
                        className={`p - 3 rounded - xl transition - all duration - 200 ${currentView === 'chat'
                            ? 'bg-primary/20 text-primary shadow-lg shadow-primary/20'
                            : 'hover:bg-white/10 text-gray-400 hover:text-white'
                            } `}
                        title="Chat"
                    >
                        <MessageSquare size={20} />
                    </button>

                    {/* Connections Button */}
                    <button
                        onClick={() => setCurrentView('connections')}
                        className={`p - 3 rounded - xl transition - all duration - 200 ${currentView === 'connections'
                            ? 'bg-primary/20 text-primary shadow-lg shadow-primary/20'
                            : 'hover:bg-white/10 text-gray-400 hover:text-white'
                            } `}
                        title="Connect Platforms"
                    >
                        <Link2 size={20} />
                    </button>

                    {/* Widgets Button */}
                    <button
                        onClick={() => setCurrentView('widgets')}
                        className={`p - 3 rounded - xl transition - all duration - 200 ${currentView === 'widgets'
                            ? 'bg-primary/20 text-primary shadow-lg shadow-primary/20'
                            : 'hover:bg-white/10 text-gray-400 hover:text-white'
                            } `}
                        title="Stream Widgets"
                    >
                        <Server size={20} />
                    </button>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Viewer Counts in Sidebar */}
                <SidebarViewerCounts />

                {/* Version */}
                <div className="text-xs text-gray-600 mt-2">v0.2.0</div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative">
                {/* Chat Panel (always rendered to keep connection alive, just hidden if not active) */}
                <div className={`flex-1 flex flex-col h-full ${currentView === 'chat' ? 'flex' : 'hidden'}`}>
                    {/* Header */}
                    <header className="h-14 border-b border-white/10 flex items-center px-4 bg-[#050505] draggable justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-sm font-semibold text-gray-300">DepressedChat</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <ConnectionStatus />
                        </div>
                    </header>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-hidden bg-[#000000] flex flex-col">
                        <ChatList />
                        <ChatInput />
                    </div>
                </div>

                {/* Overlays */}
                {currentView === 'connections' && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
                        <ConnectionsPanel onClose={() => setCurrentView('chat')} />
                    </div>
                )}

                {currentView === 'widgets' && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
                        <WidgetsPanel onClose={() => setCurrentView('chat')} />
                    </div>
                )}
            </main>
        </div>
    )
}

export default App
