import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiPaperPlaneRightFill as Send, PiSmileyFill as Smile, PiXBold as CloseIcon } from 'react-icons/pi';

const POPULAR_EMOJIS = [
  '❤️', '🔥', '👏', '😍', '😂', '🎉',
  '✨', '💎', '🚀', '👑', '💯', '🌹',
  '🥰', '😎', '🙌', '🥳', '🤩', '👍',
  '🙏', '💪', '💖', '⭐', '🎈', '⚡',
];

interface MessageInputProps {
  onSend: (message: string) => void;
}

export const MessageInput = ({ onSend }: MessageInputProps) => {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
    setShowEmoji(false);
  };

  const insertEmoji = (e: string) => {
    setInput((v) => v + e);
  };

  return (
    <div className="relative flex items-center w-full min-w-0">
      {/* Input container */}
      <div
        className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:py-1.5 w-full min-w-0 rounded-full bg-black/45 border backdrop-blur-md transition-all shadow-lg ${
          focused || showEmoji ? 'border-pink-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)] bg-black/65' : 'border-white/15'
        }`}
      >
        <button
          type="button"
          onClick={() => setShowEmoji((s) => !s)}
          aria-label="Emoji picker"
          aria-expanded={showEmoji}
          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all shrink-0 text-amber-300"
        >
          <Smile className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow" />
        </button>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Say something..."
          aria-label="Message"
          className="flex-1 min-w-0 bg-transparent outline-none text-xs sm:text-sm placeholder-white/40 text-white"
        />

        <motion.button
          type="button"
          onClick={submit}
          whileTap={{ scale: 0.88 }}
          aria-label="Send message"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-brand-primary flex items-center justify-center text-white disabled:opacity-30 disabled:pointer-events-none shadow-md shrink-0 active:scale-95 transition-all"
          disabled={!input.trim()}
        >
          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </motion.button>
      </div>

      {/* Floating Responsive Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <>
            {/* Backdrop click-outside listener to close */}
            <div
              className="fixed inset-0 z-40 bg-black/10"
              onClick={() => setShowEmoji(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed bottom-16 left-3 right-3 sm:left-4 sm:right-auto sm:w-[320px] max-w-[340px] z-50 bg-[#161426]/95 border border-white/15 rounded-2xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Reactions & Emojis</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmoji(false)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <CloseIcon className="w-3 h-3" />
                </button>
              </div>

              {/* Emoji Grid */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2 max-h-48 overflow-y-auto no-scrollbar">
                {POPULAR_EMOJIS.map((e) => (
                  <motion.button
                    type="button"
                    key={e}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => insertEmoji(e)}
                    className="w-9 h-9 sm:w-10 sm:h-10 text-xl flex items-center justify-center rounded-xl hover:bg-white/10 active:bg-white/20 transition-all select-none"
                    aria-label={`Emoji ${e}`}
                  >
                    {e}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
