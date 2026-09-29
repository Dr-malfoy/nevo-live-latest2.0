import { AnimatePresence, motion } from 'framer-motion';
import { PiSparkleFill as Sparkles } from 'react-icons/pi';
import { CoinIcon } from '../ui/CurrencyIcon';
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
  { top: '12%', left: '20%', delay: 0.2 },
  { top: '22%', right: '18%', delay: 0.5 },
  { top: '45%', left: '10%', delay: 0.8 },
  { top: '55%', right: '12%', delay: 0.3 },
  { top: '15%', left: '55%', delay: 0.65 },
];

export const GiftOverlay = ({ burst }: GiftOverlayProps) => (
  <AnimatePresence>
    {burst && (
      <motion.div
        key={burst.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        role="alert"
        className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[2px]"
      >
        {/* Glow ring */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1.15, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-full bg-pink-500/40 blur-3xl animate-pulse-glow" />
          <motion.div
            initial={{ scale: 0.2, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15 }}
            className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-brand-primary/40 to-brand-secondary/40 border border-white/20 flex items-center justify-center overflow-hidden"
          >
            <span className="text-6xl sm:text-7xl drop-shadow-[0_0_24px_rgba(168,85,247,0.9)]">
              {burst.gift.icon.startsWith('http') ? (
                <img src={burst.gift.icon} alt={burst.gift.name} className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
              ) : (
                burst.gift.icon
              )}
            </span>
            {/* Shine sweep */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-gift-shine" />
            </div>
          </motion.div>

          {/* Sparkles */}
          {sparklePositions.map((p, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 0.6], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, delay: p.delay, repeat: Infinity }}
              className="absolute text-yellow-300"
              style={p}
            >
              <Sparkles className="w-5 h-5" />
            </motion.span>
          ))}
        </motion.div>

        {/* Sender + gift name */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-5 text-center"
        >
          <p className="text-lg font-bold text-white">
            <span className="text-gradient">{burst.nickname}</span> sent a gift!
          </p>
          <p className="text-sm text-white/80 font-semibold mt-1">
            {burst.gift.name} ×{burst.count}
          </p>
          <div className="mt-2.5 flex items-center justify-center">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-yellow-400/40 text-xs font-black text-yellow-300 shadow-md">
              <CoinIcon className="w-3.5 h-3.5 text-yellow-400" />
              <span>{((burst.gift.priceDiamonds || 0) * (burst.count || 1)).toLocaleString()} Coins</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
