import { motion, AnimatePresence } from 'framer-motion';
import { PiSparkleFill as Sparkles } from 'react-icons/pi';
import { Avatar } from '../user';

export interface HighlightEntry {
  id: string;
  nickname: string;
  avatar?: string;
  message: string;
}

interface HighlightOverlayProps {
  entry: HighlightEntry | null;
}

/**
 * Center-screen BIGO-style highlighted message (SMS Highlight).
 * A diamond-paid chat message that bursts across the middle of the screen.
 */
export const HighlightOverlay = ({ entry }: HighlightOverlayProps) => (
  <AnimatePresence>
    {entry && (
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.15 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
      >
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60" />

        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.06, 1] }}
          transition={{ duration: 0.5, times: [0, 0.6, 1] }}
          className="relative mx-8 max-w-[85vw] text-center"
        >
          {/* Sparkle accent */}
          <motion.div
            animate={{ rotate: [0, 12, -12, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="absolute -top-10 left-1/2 -translate-x-1/2"
          >
            <Sparkles className="w-9 h-9 text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.8)]" />
          </motion.div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-amber-300/40 mb-3">
            <Avatar src={entry.avatar} nickname={entry.nickname} size="sm" className="!w-6 !h-6 text-[10px]" />
            <span className="text-sm font-bold text-amber-200">{entry.nickname}</span>
          </div>

          <div
            className="px-6 py-4 rounded-3xl bg-gradient-to-br from-amber-400/25 via-pink-500/20 to-purple-600/25 border border-amber-300/50 shadow-[0_0_40px_rgba(252,211,77,0.35)] backdrop-blur-lg"
          >
            <p className="text-xl sm:text-2xl font-extrabold text-white break-words [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
              {entry.message}
            </p>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
