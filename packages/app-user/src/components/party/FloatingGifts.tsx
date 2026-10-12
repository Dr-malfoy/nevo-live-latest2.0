import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getMediaUrl } from '../../lib/media';

export interface FloatingGiftItem {
  id: string;
  icon: string;
  name: string;
  xOffset: number;
  scale: number;
}

const isMediaUrl = (val?: string) => {
  if (!val || typeof val !== 'string') return false;
  const t = val.trim();
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('/') ||
    t.startsWith('data:') ||
    t.startsWith('blob:') ||
    /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(t)
  );
};

export const useFloatingGifts = () => {
  const [items, setItems] = useState<FloatingGiftItem[]>([]);
  const idRef = useRef(0);

  const triggerGifts = useCallback((icon: string, name: string, count = 4) => {
    const newItems: FloatingGiftItem[] = Array.from({ length: Math.min(count, 8) }, (_, i) => ({
      id: `${Date.now()}-${++idRef.current}-${i}`,
      icon: icon || '🎁',
      name: name || 'Gift',
      xOffset: (Math.random() - 0.5) * 160, // float in center area
      scale: 0.85 + Math.random() * 0.35,
    }));

    setItems((prev) => [...prev.slice(-20), ...newItems]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => !newItems.some((n) => n.id === item.id)));
    }, 2400);
  }, []);

  return { items, triggerGifts };
};

export const FloatingGifts = ({ items }: { items: FloatingGiftItem[] }) => (
  <div className="fixed inset-0 pointer-events-none z-[65] overflow-hidden flex items-center justify-center" aria-hidden>
    <AnimatePresence>
      {items.map((item) => {
        const hasMedia = isMediaUrl(item.icon);
        const mediaUrl = hasMedia ? getMediaUrl(item.icon) : '';

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 140, scale: 0.3, x: item.xOffset }}
            animate={{ opacity: [0, 1, 1, 0], y: -280, scale: item.scale, x: item.xOffset }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            className="absolute bottom-1/3 flex flex-col items-center gap-1 drop-shadow-[0_0_24px_rgba(236,72,153,0.9)]"
          >
            {hasMedia ? (
              <img
                src={mediaUrl}
                alt={item.name}
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-5xl select-none">{item.icon}</span>
            )}
            <span className="text-[10px] font-black text-yellow-300 bg-black/70 px-2.5 py-0.5 rounded-full border border-yellow-400/50 shadow-md">
              {item.name}
            </span>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);
