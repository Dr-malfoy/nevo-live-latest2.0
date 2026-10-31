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
      <div className="bg-[#0e0e12] border border-white/10 rounded-2xl p-3.5 shadow-md">
        <p className="text-xs font-bold text-dark-300 uppercase tracking-wider mb-2">Live bets</p>
        <p className="text-xs text-dark-400">
          {liveBetCount > 0 ? `${liveBetCount} active bet(s) this round` : 'No bets yet this round'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0e0e12] border border-white/10 rounded-2xl p-3.5 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-dark-300 uppercase tracking-wider">
          Round #{results?.roundNumber} Bets
        </p>
        <span className="text-[10px] text-dark-400 font-semibold">{bets.length} participants</span>
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {bets.map((b) => (
          <div key={b.betId} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
            <span className="text-dark-300 flex items-center gap-1.5">
              <span>{b.status === 'cashed_out' ? '✅' : '💥'}</span>
              <span>bet {Math.floor(b.betAmount).toLocaleString()} 💎</span>
            </span>
            <span className={b.status === 'cashed_out' ? 'font-black text-emerald-400' : 'font-bold text-dark-500'}>
              {b.status === 'cashed_out'
                ? `+${Math.floor(b.winAmount || b.betAmount * (b.cashOutAt || 1)).toLocaleString()} 💎 (${b.cashOutAt?.toFixed(2)}x)`
                : 'Lost'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
