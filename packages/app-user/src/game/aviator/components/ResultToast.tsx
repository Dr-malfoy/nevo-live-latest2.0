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
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-dark-800/95 border border-dark-700 shadow-xl text-center">
      {mine ? (
        <p className="text-sm font-black text-emerald-400">
          Cashed out at {mine.cashOutAt?.toFixed(2)}x — won {mine.winAmount?.toLocaleString()}!
        </p>
      ) : crashed ? (
        <p className="text-sm font-black text-red-400">
          Plane crashed at {result.crashPoint.toFixed(2)}x
        </p>
      ) : (
        <p className="text-sm font-black text-dark-200">
          Round {result.roundNumber} — crashed at {result.crashPoint.toFixed(2)}x
        </p>
      )}
    </div>
  );
};
