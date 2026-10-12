import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PiSparkleFill as Sparkles, PiFireFill as Fire } from 'react-icons/pi';
import { CoinIcon } from '../ui/CurrencyIcon';
import { getMediaUrl } from '../../lib/media';
import type { Gift } from '../../types';

export interface GiftBurst {
  id: string;
  nickname: string;
  gift: Gift;
  count: number;
}

interface GiftOverlayProps {
  burst: GiftBurst | null;
}

const sparklePositions = [
  { top: '8%', left: '15%', delay: 0.1 },
  { top: '16%', right: '14%', delay: 0.3 },
  { top: '35%', left: '8%', delay: 0.5 },
  { top: '48%', right: '10%', delay: 0.2 },
  { top: '10%', left: '52%', delay: 0.4 },
  { bottom: '25%', left: '18%', delay: 0.35 },
  { bottom: '20%', right: '20%', delay: 0.45 },
];

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

// Subtle Web Audio sound chime on gift appearance (zero external dependencies)
const playGiftChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.12, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.35);
    });
  } catch {}
};

export const GiftOverlay = ({ burst }: GiftOverlayProps) => {
  useEffect(() => {
    if (burst) {
      playGiftChime();
    }
  }, [burst?.id]);

  if (!burst) return null;

  const giftName = burst.gift?.name || 'Gift';
  const count = burst.count || 1;
  const rawIcon = burst.gift?.icon || burst.gift?.animation || (burst.gift as any)?.animationUrl || '🎁';
  const hasMediaIcon = isMediaUrl(rawIcon);
  const mediaUrl = hasMediaIcon ? getMediaUrl(rawIcon) : '';
  const price = burst.gift?.priceDiamonds || (burst.gift as any)?.price || 1;
  const totalCoins = price * count;

  return (
    <AnimatePresence>
      <motion.div
        key={burst.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        role="alert"
        className="fixed inset-0 z-[70] flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[3px]"
      >
        {/* Glow halo background */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.8, 1.25, 1.1], opacity: [0, 1, 0.9] }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative flex flex-col items-center"
        >
          {/* Radial light wash */}
          <div className="absolute inset-0 -m-16 rounded-full bg-gradient-to-r from-pink-500/50 via-purple-600/40 to-yellow-500/40 blur-3xl animate-pulse-glow" />

          {/* Icon card with 3D spring pop */}
          <motion.div
            initial={{ scale: 0.2, rotate: -15, y: 30 }}
            animate={{ scale: [0.2, 1.2, 1], rotate: [ -15, 5, 0 ], y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-br from-[#2D124D]/90 via-[#1F0B38]/95 to-[#120524]/95 border-2 border-yellow-400/50 flex items-center justify-center shadow-[0_0_50px_rgba(245,197,24,0.45)] overflow-hidden"
          >
            {hasMediaIcon ? (
              <img
                src={mediaUrl}
                alt={giftName}
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_0_24px_rgba(245,197,24,0.8)]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-7xl sm:text-8xl drop-shadow-[0_0_28px_rgba(245,197,24,0.85)] select-none">
                {rawIcon}
              </span>
            )}

            {/* Shine light sweep */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-gift-shine" />
            </div>

            {/* Combo badge for quantities > 1 */}
            {count > 1 && (
              <motion.div
                initial={{ scale: 0, x: 20 }}
                animate={{ scale: [0, 1.35, 1], x: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 14 }}
                className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-amber-500 text-white text-xs font-black border-2 border-white shadow-lg flex items-center gap-1"
              >
                <Fire className="w-3.5 h-3.5 text-yellow-200 animate-bounce" />
                <span>×{count}</span>
              </motion.div>
            )}
          </motion.div>

          {/* Sparkling orbiting stars */}
          {sparklePositions.map((p, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.4, 0.7], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, delay: p.delay, repeat: Infinity }}
              className="absolute text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]"
              style={p}
            >
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.span>
          ))}
        </motion.div>

        {/* Sender details and gift text */}
        <motion.div
          initial={{ y: 25, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.4, ease: 'easeOut' }}
          className="mt-6 text-center px-4"
        >
          <div className="inline-block px-5 py-2.5 rounded-2xl bg-black/70 border border-white/20 shadow-2xl backdrop-blur-md">
            <p className="text-base sm:text-lg font-bold text-white">
              <span className="bg-gradient-to-r from-[#F5C518] via-[#FF8A2A] to-[#EC4899] bg-clip-text text-transparent">
                {burst.nickname || 'Someone'}
              </span>{' '}
              sent a gift!
            </p>
            <p className="text-sm sm:text-base text-pink-300 font-extrabold mt-0.5">
              {giftName} <span className="text-yellow-400">×{count}</span>
            </p>
            <div className="mt-2 flex items-center justify-center">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/50 text-xs font-black text-yellow-300 shadow-sm">
                <CoinIcon className="w-4 h-4 text-yellow-400" />
                <span>{totalCoins.toLocaleString()} Coins</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
