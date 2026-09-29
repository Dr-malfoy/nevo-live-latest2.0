// Win badge — "You won!" banner with balance count-up.

import React, { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WinBadgeProps {
  amount: number;
  visible: boolean;
  onDone: () => void;
}

const BadgeInner = ({ amount, visible, onDone }: WinBadgeProps) => {
  const [shown, setShown] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const dur = 900;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(amount * eased));
      if (t < 1) raf.current = requestAnimationFrame(step);
      else {
        onDone();
      }
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [visible, amount, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-6 py-3 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-300/40 backdrop-blur-xl shadow-2xl"
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          role="status"
          aria-live="polite"
        >
          <p className="text-yellow-300 font-black text-lg text-center">
            +{shown.toLocaleString()} <span className="text-xs font-bold">YOU WIN</span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const WinBadge = memo(BadgeInner);
