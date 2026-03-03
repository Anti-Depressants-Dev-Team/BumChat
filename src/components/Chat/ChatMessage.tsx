import { ChatMessage as ChatMessageType } from '../../store/useChatStore';
import { cn } from '../../lib/utils';
import { Twitch, Play } from 'lucide-react';
import { useMemo } from 'react';

interface ChatMessageProps {
    message: ChatMessageType;
}

// Parse Twitch emotes from the emotes object
const parseEmotes = (content: string, emotes?: Record<string, string[]>) => {
    if (!emotes || Object.keys(emotes).length === 0) {
        return [{ type: 'text' as const, content }];
    }

    // Build a map of positions to emote IDs
    const emoteParts: { start: number; end: number; id: string }[] = [];

    for (const [emoteId, positions] of Object.entries(emotes)) {
        for (const pos of positions) {
            const [start, end] = pos.split('-').map(Number);
            emoteParts.push({ start, end, id: emoteId });
        }
    }

    // Sort by position
    emoteParts.sort((a, b) => a.start - b.start);

    // Build the result array
    const result: { type: 'text' | 'emote'; content: string; emoteId?: string }[] = [];
    let lastIndex = 0;

    for (const emote of emoteParts) {
        // Add text before this emote
        if (emote.start > lastIndex) {
            result.push({ type: 'text', content: content.slice(lastIndex, emote.start) });
        }
        // Add the emote
        result.push({
            type: 'emote',
            content: content.slice(emote.start, emote.end + 1),
            emoteId: emote.id,
        });
        lastIndex = emote.end + 1;
    }

    // Add remaining text
    if (lastIndex < content.length) {
        result.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return result;
};

export function ChatMessage({ message }: ChatMessageProps) {
    const parsedContent = useMemo(() => {
        if (message.platform === 'twitch' && message.emotes) {
            return parseEmotes(message.content, message.emotes);
        }
        return [{ type: 'text' as const, content: message.content }];
    }, [message.content, message.emotes, message.platform]);

    return (
        <div className={cn(
            "flex items-start gap-2 p-1 hover:bg-white/5 group text-[13px] leading-5 font-medium",
            message.platform === 'twitch' ? "border-l-2 border-transparent hover:border-[#6441a5]" : "",
            message.platform === 'kick' ? "border-l-2 border-transparent hover:border-[#53FC18]" : ""
        )}>
            {/* Time */}
            <span className="text-xs text-gray-500 w-[50px] shrink-0 font-mono">
                {new Date(message.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>

            {/* Badges / Platform Icon */}
            <span className={cn("shrink-0", message.platform === 'twitch' ? "text-[#6441a5]" : message.platform === 'kick' ? "text-[#53FC18]" : "text-gray-400")}>
                {message.platform === 'twitch' && <Twitch size={14} />}
                {message.platform === 'kick' && <Play size={14} />}
            </span>

            {/* Username */}
            <span style={{ color: message.color }} className="font-bold whitespace-nowrap shrink-0">
                {message.displayName}:
            </span>

            {/* Content with Emotes */}
            <span className="break-words text-gray-200">
                {parsedContent.map((part, i) => (
                    part.type === 'emote' ? (
                        <img
                            key={i}
                            src={`https://static-cdn.jtvnw.net/emoticons/v2/${part.emoteId}/default/dark/1.0`}
                            alt={part.content}
                            title={part.content}
                            className="inline-block h-5 align-middle mx-0.5"
                        />
                    ) : (
                        <span key={i}>{part.content}</span>
                    )
                ))}
            </span>
        </div>
    );
}
