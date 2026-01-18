import { useRef, useEffect } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { ChatMessage } from './ChatMessage';

export function ChatList() {
    const messages = useChatStore((state) => state.messages);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-[1px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {messages.length === 0 && (
                <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                    No messages yet. Connect to a channel!
                </div>
            )}
            {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
        </div>
    );
}
