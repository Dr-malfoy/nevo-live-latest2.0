// Result overlay — winning number, my outcomes, provably-fair summary.

import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RouletteResult } from '../../../types/roulette';
import { colorOf, wheelLabel } from '../utils/wheel';
import { verifyRound } from '../utils/verify';

interface ResultOverlayProps {
  result: RouletteResult | null;
  userId?: string;
  onClose: () => void;
}

const DOT: Record<string, string> = {
  red: 'bg-gradient-to-b from-red-500 to-red-700',
  black: 'bg-gradient-to-b from-zinc-600 to-zinc-900',
  green: 'bg-gradient-to-b from-emerald-500 to-emerald-700',
};

const OverlayInner = ({ result, userId, onClose }: ResultOverlayProps) => {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    setVerified(null);
    if (!result?.seed || !result?.hash) return;
    let alive = true;
    verifyRound(result.seed, result.hash, result.winningIndex).then((ok) => {
      if (alive) setVerified(ok);
    });
    return () => {
      alive = false;
    };
  }, [result]);

  if (!result) return null;
  const winColor = colorOf(result.winningIndex);
  const mine = userId ? result.results.filter((r) => r.userId === userId) : [];
  const myWins = mine.filter((r) => r.status === 'won');
  const totalWin = myWins.reduce((s, r) => s + r.winAmount, 0);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-dark-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 border border-dark-700 shadow-2xl"
          initial={{ scale: 0.85, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-bold text-dark-300">Round #{result.roundNumber}</p>

          <motion.div
            className={`w-16 h-16 mx-auto rounded-full ${DOT[winColor]} flex items-center justify-center text-2xl font-black text-white shadow-lg`}
            initial={{ scale: 0.5 }}
            animate={{ scale: [0.5, 1.15, 1] }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {result.winningNumber}
          </motion.div>
          <p className="text-xs text-dark-400 -mt-2">Winning number</p>

          {verified !== null && (
            <p className={`text-[11px] ${verified ? 'text-emerald-400' : 'text-red-400'}`}>
              {verified ? '✓ Verified fair' : '✗ Verification failed'}
            </p>
          )}

          <div className="text-sm">
            {totalWin > 0 ? (
              <p className="text-emerald-400 font-bold text-lg">You won {totalWin.toLocaleString()}!</p>
            ) : mine.length > 0 ? (
              <p className="text-dark-300">No winning bets this round</p>
            ) : (
              <p className="text-dark-500 text-xs">You didn't bet this round</p>
            )}
          </div>

          {myWins.length > 0 && (
            <div className="space-y-1 text-left">
              {myWins.map((r) => (
                <div key={r.betId} className="flex justify-between text-xs">
                  <span className="text-dark-300">{r.numbers.length} numbers</span>
                  <span className="text-yellow-400 font-bold">+{r.winAmount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-primary-600 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
          >
            OK
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const ResultOverlay = memo(OverlayInner);
