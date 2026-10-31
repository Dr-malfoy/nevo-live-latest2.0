import React from 'react';
import type { AviatorHistoryEntry } from '../../../types/aviator';

export const HistoryPanel: React.FC<{ history: AviatorHistoryEntry[] }> = ({ history }) => {
  // Show ALL previous completed rounds (newest first, no skipping!)
  const display = history;
  if (!display || display.length === 0) return null;

  return (
    <div className="bg-[#0e0e12] rounded-2xl p-3.5 border border-white/10 shadow-md">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <p className="text-xs font-bold text-dark-200 uppercase tracking-wider">Previous rounds</p>
        </div>
        <span className="text-[10px] text-dark-400 font-semibold">{display.length} rounds recorded</span>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
        {display.map((h) => {
          const isHigh = h.crashPoint >= 10.0;
          const isMidHigh = h.crashPoint >= 2.0;
          const isLowMid = h.crashPoint >= 1.5;

          const badgeClass = isHigh
            ? 'bg-rose-600/90 border-rose-400 text-rose-100 shadow-rose-900/40'
            : isMidHigh
            ? 'bg-amber-600/90 border-amber-400 text-amber-100 shadow-amber-900/40'
            : isLowMid
            ? 'bg-purple-600/90 border-purple-400 text-purple-100 shadow-purple-900/40'
            : 'bg-blue-600/90 border-blue-400 text-blue-100 shadow-blue-900/40';

          return (
            <span
              key={h.roundNumber}
              className={`px-2.5 py-1 rounded-full text-[11px] font-black border shadow-sm transition-transform hover:scale-105 select-none ${badgeClass}`}
              title={`Round #${h.roundNumber}: ${h.crashPoint.toFixed(2)}x`}
            >
              {h.crashPoint.toFixed(2)}x
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryPanel;
