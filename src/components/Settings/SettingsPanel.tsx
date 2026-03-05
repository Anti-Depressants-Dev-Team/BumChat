import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Settings as SettingsIcon, Link2, MonitorPlay, Info, MessageSquare, Copy, Check, ExternalLink } from 'lucide-react';

export function SettingsPanel() {
    const axelChatWidgetUrl = useSettingsStore((s) => s.axelChatWidgetUrl);
    const setAxelChatWidgetUrl = useSettingsStore((s) => s.setAxelChatWidgetUrl);

    const [localAxelUrl, setLocalAxelUrl] = useState(axelChatWidgetUrl);
    const [activeTab, setActiveTab] = useState<'integrations' | 'about'>('integrations');

    // Local Overlay Customization State
    const [chatFontSize, setChatFontSize] = useState('14px');
    const [chatTheme, setChatTheme] = useState('dark');
    const [chatBgOpacity, setChatBgOpacity] = useState('0.7');
    const [chatTimeout, setChatTimeout] = useState('15'); // 15 seconds by default

    const [viewerFontSize, setViewerFontSize] = useState('16px');
    const [viewerTransparent, setViewerTransparent] = useState(true);

    const [copiedChat, setCopiedChat] = useState(false);
    const [copiedViewer, setCopiedViewer] = useState(false);

    // Sync from store
    useEffect(() => {
        setLocalAxelUrl(axelChatWidgetUrl);
    }, [axelChatWidgetUrl]);

    const handleSaveAxelUrl = () => {
        setAxelChatWidgetUrl(localAxelUrl);
    };

    const localChatUrl = `http://127.0.0.1:8356/widgets/chat/index.html?fontSize=${chatFontSize}&theme=${chatTheme}&bgOpacity=${chatBgOpacity}&timeout=${chatTimeout}`;
    const localViewerUrl = `http://127.0.0.1:8356/widgets/viewer/index.html?fontSize=${viewerFontSize}&transparent=${viewerTransparent}`;

    const handleCopy = (url: string, setter: (val: boolean) => void) => {
        navigator.clipboard.writeText(url);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    return (
        <div className="flex-1 flex bg-[#000000] text-gray-200 overflow-hidden">
            {/* Settings Sidebar */}
            <div className="w-48 bg-[#050505] border-r border-white/5 p-4 flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-white/80 mb-2 px-2 flex items-center gap-2">
                    <SettingsIcon size={14} /> Settings
                </h2>
                <button
                    onClick={() => setActiveTab('integrations')}
                    className={`text-left px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${activeTab === 'integrations' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-gray-400'
                        }`}
                >
                    <Link2 size={14} /> Integrations
                </button>
                <button
                    onClick={() => setActiveTab('about')}
                    className={`text-left px-3 py-2 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${activeTab === 'about' ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-gray-400'
                        }`}
                >
                    <Info size={14} /> About
                </button>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'integrations' && (
                    <div className="max-w-2xl space-y-8">

                        {/* LOCAL OBS OVERLAYS SECTION */}
                        <div>
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <MonitorPlay size={20} className="text-primary" />
                                Local OBS Overlays
                            </h3>
                            <p className="text-sm text-gray-400 mb-6">
                                BumChat hosts these widgets locally. Copy the URL and add it as a "Browser Source" in OBS. Backgrounds are transparent by default.
                            </p>

                            {/* Pop Out Chat Window */}
                            <div className="bg-[#0a0a0a] border border-primary/20 rounded-xl p-5 mb-6">
                                <h4 className="text-sm font-semibold text-white/90 mb-2 flex items-center gap-2">
                                    <ExternalLink size={14} className="text-primary" /> Pop Out Chat Window
                                </h4>
                                <p className="text-xs text-gray-400 mb-4">
                                    Opens a detachable, always-on-top mini-window showing live chat. Add it to OBS as a <strong>Window Capture</strong> source (select "BumChat Chat"). Includes built-in settings for font size and chroma-key backgrounds.
                                </p>
                                <button
                                    onClick={() => window.electronAPI.popOutChat()}
                                    className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 px-4 py-2 rounded-md font-semibold text-sm transition-colors flex items-center gap-2"
                                >
                                    <ExternalLink size={14} />
                                    Open PiP Chat Window
                                </button>
                            </div>

                            {/* Chat Widget */}
                            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 mb-6">
                                <h4 className="text-sm font-semibold text-white/90 mb-4">💬 Chat Widget</h4>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Theme</label>
                                        <select value={chatTheme} onChange={(e) => setChatTheme(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none">
                                            <option value="dark">Dark (Default)</option>
                                            <option value="light">Light</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Font Size</label>
                                        <select value={chatFontSize} onChange={(e) => setChatFontSize(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none">
                                            <option value="12px">Small (12px)</option>
                                            <option value="14px">Medium (14px)</option>
                                            <option value="18px">Large (18px)</option>
                                            <option value="24px">Huge (24px)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Duration</label>
                                        <select value={chatTimeout} onChange={(e) => setChatTimeout(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none">
                                            <option value="0">Never Disappear</option>
                                            <option value="5">5 seconds</option>
                                            <option value="15">15 seconds</option>
                                            <option value="30">30 seconds</option>
                                            <option value="60">60 seconds</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Overlay Opacity</label>
                                        <input type="range" min="0" max="1" step="0.1" value={chatBgOpacity} onChange={(e) => setChatBgOpacity(e.target.value)} className="w-full mt-2" />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <input type="text" readOnly value={localChatUrl} className="flex-1 bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 font-mono outline-none" />
                                    <button onClick={() => handleCopy(localChatUrl, setCopiedChat)} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-md transition-colors flex items-center justify-center w-10">
                                        {copiedChat ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Viewer Count Widget */}
                            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5 mb-6">
                                <h4 className="text-sm font-semibold text-white/90 mb-4">👁️ Viewer Count Widget</h4>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Font Size</label>
                                        <select value={viewerFontSize} onChange={(e) => setViewerFontSize(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none">
                                            <option value="16px">Medium (16px)</option>
                                            <option value="24px">Large (24px)</option>
                                            <option value="32px">Huge (32px)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center mt-6">
                                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                            <input type="checkbox" checked={viewerTransparent} onChange={(e) => setViewerTransparent(e.target.checked)} className="rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary" />
                                            Transparent Background
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <input type="text" readOnly value={localViewerUrl} className="flex-1 bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-300 font-mono outline-none" />
                                    <button onClick={() => handleCopy(localViewerUrl, setCopiedViewer)} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-md transition-colors flex items-center justify-center w-10">
                                        {copiedViewer ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>

                        </div>

                        {/* EXTERNAL INTEGRATIONS (AXELCHAT) */}
                        <div className="pt-6 border-t border-white/10">
                            <h3 className="text-lg font-bold text-white mb-4">External Integrations</h3>

                            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-5">
                                <h4 className="text-sm font-semibold text-white/90 mb-2">AxelChat Widget URL</h4>
                                <p className="text-xs text-gray-400 mb-4">
                                    Alternatively, embed an external AxelChat widget overlay into BumChat.
                                </p>

                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={localAxelUrl}
                                        onChange={(e) => setLocalAxelUrl(e.target.value)}
                                        placeholder="http://127.0.0.1:8356/widgets/..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50 text-white placeholder:text-gray-600 font-mono"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveAxelUrl()}
                                    />
                                    <button
                                        onClick={handleSaveAxelUrl}
                                        className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 px-4 py-2 rounded-md font-semibold text-sm transition-colors"
                                    >
                                        Save & Connect
                                    </button>
                                    {axelChatWidgetUrl && (
                                        <button
                                            onClick={() => { setLocalAxelUrl(''); setAxelChatWidgetUrl(''); }}
                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-md font-semibold text-sm transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    )}
                                </div>

                                {/* AxelChat Preview Area */}
                                {axelChatWidgetUrl && (
                                    <div className="bg-[#050505] border border-white/10 rounded-xl overflow-hidden flex flex-col h-[200px]">
                                        <div className="bg-[#0a0a0a] border-b border-white/5 px-4 py-2 text-xs font-medium text-gray-400 flex justify-between items-center">
                                            <span>AxelChat Preview</span>
                                            <span className="text-green-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Active</span>
                                        </div>
                                        <div className="flex-1 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDAwMDAwIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDExTDggM1pNMCArOEw4IDBaTTAgLTE2TDggLThabTAgMjRMMCAxNlYyNFoiIHN0cm9rZT0iIzA1MDUwNSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIj48L3BhdGg+Cjwvc3ZnPg==')]">
                                            <webview
                                                src={axelChatWidgetUrl}
                                                className="w-full h-full"
                                                style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="max-w-2xl">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Info size={20} className="text-primary" />
                            About BumChat
                        </h3>
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                                    <MessageSquare size={32} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white">BumChat <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full align-middle ml-2">Beta</span></h4>
                                    <p className="text-sm text-gray-400">The unified streaming chat aggregator.</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-sm text-gray-300">
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-500">Version</span>
                                    <span className="font-mono">0.1.0</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-500">Electron</span>
                                    <span className="font-mono">{window.electronAPI?.versions?.electron || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-gray-500">Chrome</span>
                                    <span className="font-mono">{window.electronAPI?.versions?.chrome || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-gray-500">Node</span>
                                    <span className="font-mono">{window.electronAPI?.versions?.node || 'Unknown'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
