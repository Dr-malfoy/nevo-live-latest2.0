import { initial } from '../../lib/time';
import { useState, useRef, useEffect } from 'react';
import { PiPaperPlaneRightFill as Send } from 'react-icons/pi';
import { useAuthStore } from '../../stores';

interface ChatMessage {
  userId: string;
  nickname: string;
  avatar?: string;
  message: string;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
}

export const ChatBox = ({ messages, onSend }: ChatBoxProps) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-2 ${msg.userId === user?._id ? 'justify-end' : ''}`}>
            {msg.userId !== user?._id && (
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {initial(msg.nickname)}
              </div>
            )}
            <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm ${
              msg.userId === user?._id
                ? 'bg-black text-white'
                : 'bg-dark-700 text-dark-200'
            }`}>
              <span className="font-medium text-[10px] block opacity-70">{msg.nickname}</span>
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-line-strong">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Chat..."
          className="flex-1 bg-dark-700 rounded-full px-4 py-2 text-sm text-ink placeholder-dark-500 focus:outline-none"
        />
        <button onClick={handleSend} className="p-2 bg-black text-white rounded-full hover:bg-ink-soft transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
