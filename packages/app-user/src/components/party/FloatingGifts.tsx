import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface FloatingGiftItem {
  id: string;
  icon: string;
  name: string;
  xOffset: number;
  scale: number;
}

export const useFloatingGifts = () => {
  const [items, setItems] = useState<FloatingGiftItem[]>([]);
  const idRef = useRef(0);

  const triggerGifts = useCallback((icon: string, name: string, count = 4) => {
    const newItems: FloatingGiftItem[] = Array.from({ length: Math.min(count, 8) }, (_, i) => ({
      id: `${Date.now()}-${++idRef.current}-${i}`,
      icon: icon || '🎁',
      name: name || 'Gift',
      xOffset: (Math.random() - 0.5) * 140, // float in center area
      scale: 0.8 + Math.random() * 0.4,
    }));

    setItems((prev) => [...prev.slice(-20), ...newItems]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => !newItems.some((n) => n.id === item.id)));
    }, 2400);
  }, []);

  return { items, triggerGifts };
};

export const FloatingGifts = ({ items }: { items: FloatingGiftItem[] }) => (
  <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden flex items-center justify-center" aria-hidden>
    <AnimatePresence>
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 120, scale: 0.4, x: item.xOffset }}
          animate={{ opacity: [0, 1, 1, 0], y: -260, scale: item.scale, x: item.xOffset }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.2, ease: 'easeOut' }}
          className="absolute bottom-1/3 flex flex-col items-center gap-1 drop-shadow-[0_0_20px_rgba(236,72,153,0.9)]"
        >
          {item.icon.startsWith('http') ? (
            <img src={item.icon} alt={item.name} className="w-16 h-16 object-contain" />
          ) : (
            <span className="text-5xl">{item.icon}</span>
          )}
          <span className="text-[10px] font-black text-yellow-300 bg-black/60 px-2 py-0.5 rounded-full border border-yellow-400/40">
            {item.name}
          </span>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);
