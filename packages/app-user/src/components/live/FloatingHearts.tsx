import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PiHeartFill as Heart } from 'react-icons/pi';

interface HeartItem {
  id: number;
  x: number;
  size: number;
  drift: number;
}

/** Manages the pool of floating hearts; returns state + burst trigger. */
export const useFloatingHearts = () => {
  const [hearts, setHearts] = useState<HeartItem[]>([]);
  const idRef = useRef(0);

  const burst = useCallback((n = 4) => {
    const items: HeartItem[] = Array.from({ length: n }, () => ({
      id: ++idRef.current,
      x: Math.random() * 100,
      size: 14 + Math.random() * 18,
      drift: Math.random() * 48 - 24,
    }));
    setHearts((prev) => [...prev.slice(-24), ...items]);
    window.setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !items.some((i) => i.id === h.id)));
    }, 1700);
  }, []);

  return { hearts, burst };
};

interface FloatingHeartsProps {
  hearts: HeartItem[];
}

/** Decorative layer rendering the heart pool. */
export const FloatingHearts = ({ hearts }: FloatingHeartsProps) => (
  <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden" aria-hidden>
    <AnimatePresence>
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          initial={{ opacity: 0, y: 24, scale: 0.6, x: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: -150, scale: 1.15, x: h.drift }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.7, ease: 'easeOut' }}
          className="absolute bottom-28"
          style={{ left: `${h.x}%` }}
        >
          <Heart
            className="text-pink-500 fill-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.9)]"
            style={{ width: h.size, height: h.size }}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);
