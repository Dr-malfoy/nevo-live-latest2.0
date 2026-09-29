import React from 'react';
import type { AviatorResult } from '../../../types/aviator';

// Shows the current round's bettors: who bet, their target, and whether
// they cashed out (with the multiplier they cashed at).
export const LiveBets: React.FC<{ results: AviatorResult | null; liveBetCount: number }> = ({
  results,
  liveBetCount,
}) => {
  const bets = results?.results ?? [];

  if (bets.length === 0) {
    return (
      <div className="bg-dark-800 rounded-xl p-3">
        <p className="text-xs font-bold text-dark-300 mb-2">Live bets</p>
        <p className="text-xs text-dark-400">
          {liveBetCount > 0 ? `${liveBetCount} bet(s) placed this round` : 'No bets yet this round'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-xl p-3">
      <p className="text-xs font-bold text-dark-300 mb-2">
        Round #{results?.roundNumber} · {liveBetCount} bets
      </p>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {bets.map((b) => (
          <div key={b.betId} className="flex items-center justify-between text-xs">
            <span className="text-dark-300">
              {b.status === 'cashed_out' ? '✅' : '💥'} bet {b.betAmount.toLocaleString()}
            </span>
            <span className={b.status === 'cashed_out' ? 'font-bold text-emerald-400' : 'font-bold text-dark-400'}>
              {b.status === 'cashed_out' ? `${b.cashOutAt?.toFixed(2)}x` : 'lost'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
