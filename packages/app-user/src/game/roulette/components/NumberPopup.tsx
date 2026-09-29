import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colorOf, wheelLabel, EUROPEAN_WHEEL } from '../utils/wheel';

interface NumberPopupProps {
  winningIndex: number | null;
  winningNumber?: number | null;
  visible: boolean; // true only while ball is settled + before next bet phase
}

const BG: Record<string, string> = {
  red: 'from-red-600 via-rose-600 to-red-800 shadow-red-500/50',
  black: 'from-zinc-700 via-zinc-800 to-zinc-950 shadow-zinc-600/40',
  green: 'from-emerald-600 via-green-600 to-emerald-900 shadow-emerald-500/50',
};

const RING: Record<string, string> = {
  red: 'border-red-400/80',
  black: 'border-zinc-400/80',
  green: 'border-emerald-400/80',
};

const NumberPopupInner = ({ winningIndex, winningNumber: directNumber, visible }: NumberPopupProps) => {
  const resolvedNumber = directNumber !== undefined && directNumber !== null
    ? directNumber
    : winningIndex !== null && winningIndex >= 0 && winningIndex < EUROPEAN_WHEEL.length
    ? EUROPEAN_WHEEL[winningIndex]
    : null;

  const color = resolvedNumber !== null ? colorOf(resolvedNumber) : 'black';
  const label = resolvedNumber !== null ? wheelLabel(resolvedNumber) : '';

  return (
    <AnimatePresence>
      {visible && resolvedNumber !== null && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Floating animated container */}
          <motion.div
            className="relative flex flex-col items-center justify-center"
            initial={{ scale: 0.2, y: 30, opacity: 0 }}
            animate={{
              scale: 1,
              y: [0, -10, 0],
              opacity: 1,
            }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{
              scale: { type: 'spring', stiffness: 350, damping: 20 },
              y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' },
            }}
          >
            {/* Glowing background blur aura */}
            <div
              className={`absolute w-36 h-36 rounded-full bg-gradient-to-br ${BG[color]} opacity-40 blur-2xl animate-pulse`}
            />

            {/* Floating Glass Container */}
            <div
              className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${BG[color]} border-2 ${RING[color]} flex flex-col items-center justify-center shadow-2xl backdrop-blur-md`}
              style={{
                boxShadow: `0 0 35px ${color === 'red' ? 'rgba(239,68,68,0.6)' : color === 'green' ? 'rgba(16,185,129,0.6)' : 'rgba(161,161,170,0.4)'}`,
              }}
            >
              <span className="text-[10px] font-black tracking-widest text-white/80 uppercase">
                WINNER
              </span>
              <span className="text-4xl font-black text-white leading-none tracking-tight drop-shadow-md my-0.5">
                {label}
              </span>
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/30">
                {color}
              </span>
            </div>

            {/* Expanding pulse ring */}
            <motion.div
              className={`absolute w-32 h-32 rounded-full border-2 ${RING[color]} opacity-50`}
              animate={{ scale: [1, 1.25, 1.5], opacity: [0.5, 0.2, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const NumberPopup = memo(NumberPopupInner);
