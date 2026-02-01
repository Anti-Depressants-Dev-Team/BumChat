import { useState, useEffect } from 'react';
import { Copy, Check, Server, RefreshCw } from 'lucide-react';

interface WidgetsPanelProps {
    onClose: () => void;
}

export function WidgetsPanel({ onClose }: WidgetsPanelProps) {
    const [wsUrl, setWsUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [serverStatus, setServerStatus] = useState<{ running: boolean; port: number; clients: number } | null>(null);

    useEffect(() => {
        // Get initial status
        updateStatus();

        // Poll status every 5 seconds
        const interval = setInterval(updateStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const updateStatus = async () => {
        try {
            const url = await window.electronAPI.getWidgetServerUrl();
            setWsUrl(url);

            // We'll need to expose a status endpoint if we want real stats, 
            // but for now we assume running if we got the URL
            setServerStatus({
                running: true,
                port: 8765,
                clients: 0 // We'd need to expose this via IPC to get real count
            });
        } catch (error) {
            console.error('Failed to get widget info', error);
            setServerStatus({ running: false, port: 0, clients: 0 });
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(wsUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-full bg-[#0a0a0a] flex flex-col border-l border-white/10 w-80 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#111]">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    <Server size={18} className="text-primary" />
                    Widgets Server
                </h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <RefreshCw size={16} className="text-gray-400" />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">

                {/* Status Card */}
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${serverStatus?.running ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                        <span className="font-medium">
                            {serverStatus?.running ? 'Server Running' : 'Server Stopped'}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 pl-6">
                        Listening on port {serverStatus?.port || '...'}
                    </p>
                </div>

                {/* Instructions */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-300">How to use with Axelchat Widgets</h3>

                    <div className="text-sm text-gray-400 space-y-2">
                        <p>1. Open your Axelchat Widget HTML file (e.g. index.html)</p>
                        <p>2. Add the following parameter to the URL:</p>
                    </div>

                    <div className="bg-black/50 p-3 rounded-lg border border-white/10 font-mono text-xs break-all">
                        ?wsUrl={wsUrl || 'ws://localhost:8765'}
                    </div>

                    <p className="text-sm text-gray-400">
                        3. Add that full URL as a Browser Source in OBS.
                    </p>
                </div>

                {/* Copy URL Section */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">WebSocket URL</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={wsUrl}
                            readOnly
                            className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 w-full focus:outline-none focus:border-primary/50"
                        />
                        <button
                            onClick={copyToClipboard}
                            className="bg-primary/20 hover:bg-primary/30 text-primary p-2 rounded-lg transition-colors"
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-500 text-center">
                        This server speaks the Axelchat protocol. Any widget compatible with Axelchat will work here.
                    </p>
                </div>
            </div>
        </div>
    );
}
