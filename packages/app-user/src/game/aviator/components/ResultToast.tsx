import React from 'react';
import type { AviatorResult } from '../../../types/aviator';

// Flashes the round outcome once a crash happens.
export const ResultToast: React.FC<{ result: AviatorResult | null; userId?: string }> = ({
  result,
  userId,
}) => {
  if (!result) return null;

  const mine = result.results.find((r) => r.userId === userId && r.status === 'cashed_out');
  const crashed = result.results.length === 0 || result.results.some((r) => r.status === 'lost');

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-2xl bg-black/95 border border-white/20 shadow-2xl text-center backdrop-blur-md">
      {mine ? (
        <p className="text-sm font-black text-emerald-400 flex items-center gap-1.5 justify-center">
          <span>🎉</span>
          <span>Cashed out at {mine.cashOutAt?.toFixed(2)}x — won {Math.floor(mine.winAmount || 0).toLocaleString()} 💎!</span>
        </p>
      ) : crashed ? (
        <p className="text-sm font-black text-rose-500">
          💥 Plane flew away at {result.crashPoint.toFixed(2)}x
        </p>
      ) : (
        <p className="text-sm font-black text-dark-200">
          Round #{result.roundNumber} — ended at {result.crashPoint.toFixed(2)}x
        </p>
      )}
    </div>
  );
};
