import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiPaperPlaneRightFill as Send, PiSmileyFill as Smile } from 'react-icons/pi';

const EMOJIS = ['😀', '😂', '😍', '😎', '🔥', '❤️', '👍', '🎉', '😮', '🥳'];

interface MessageInputProps {
  onSend: (message: string) => void;
}

export const MessageInput = ({ onSend }: MessageInputProps) => {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [focused, setFocused] = useState(false);

  const submit = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
    setShowEmoji(false);
  };

  const insertEmoji = (e: string) => setInput((v) => v + e);

  return (
    <div className="relative flex items-center gap-2 flex-1 min-w-0">
      <motion.div
        animate={{ flex: focused ? 1 : 0.8 }}
        className={`glass-pill flex items-center gap-1.5 pl-2 pr-1.5 py-1.5 min-w-0 ${
          focused ? 'border-white/25' : ''
        }`}
      >
        <button
          onClick={() => setShowEmoji((s) => !s)}
          aria-label="Emoji picker"
          aria-expanded={showEmoji}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0"
        >
          <Smile className="w-5 h-5 text-yellow-300" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Say something..."
          aria-label="Message"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-white/40 text-white"
        />
        <motion.button
          onClick={submit}
          whileTap={{ scale: 0.88 }}
          aria-label="Send message"
          className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary flex items-center justify-center text-white btn-glow disabled:opacity-40"
          disabled={!input.trim()}
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </motion.div>

      <AnimatePresence>{showEmoji && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-14 left-0 glass-card p-2 grid grid-cols-5 gap-1 z-30"
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => insertEmoji(e)}
              className="w-9 h-9 text-xl rounded-lg hover:bg-white/10 transition-colors"
              aria-label={`Emoji ${e}`}
            >
              {e}
            </button>
          ))}
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
};
