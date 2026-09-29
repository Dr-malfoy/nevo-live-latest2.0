import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ReactionItem {
  id: number;
  emoji: string;
  x: number;
  size: number;
}

const EMOJI_SET = ['🎉', '❤️', '🔥', '👍', '😮', '😂', '🥳', '💜'];

/** UI-local emoji reaction pool (decorative; no backend event). */
export const useReactions = () => {
  const [items, setItems] = useState<ReactionItem[]>([]);
  const idRef = useRef(0);

  const trigger = useCallback((emoji?: string) => {
    const item: ReactionItem = {
      id: ++idRef.current,
      emoji: emoji || EMOJI_SET[Math.floor(Math.random() * EMOJI_SET.length)],
      x: 20 + Math.random() * 60,
      size: 22 + Math.random() * 16,
    };
    setItems((prev) => [...prev.slice(-12), item]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((r) => r.id !== item.id));
    }, 2000);
  }, []);

  return { items, trigger };
};

interface ReactionOverlayProps {
  items: ReactionItem[];
}

export const ReactionOverlay = ({ items }: ReactionOverlayProps) => (
  <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden>
    <AnimatePresence>
      {items.map((r) => (
        <motion.span
          key={r.id}
          initial={{ opacity: 0, y: 30, scale: 0.4 }}
          animate={{ opacity: [0, 1, 1, 0], y: -140, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="absolute bottom-40"
          style={{ left: `${r.x}%`, fontSize: r.size }}
        >
          {r.emoji}
        </motion.span>
      ))}
    </AnimatePresence>
  </div>
);
