import React from 'react';
import type { AviatorHistoryEntry } from '../../../types/aviator';

// Previous rounds: skip the first (most recent) entry so the present
// session's crash point is never shown until the NEXT session begins.
export const HistoryPanel: React.FC<{ history: AviatorHistoryEntry[] }> = ({ history }) => {
  // Hide the very first (newest) value — show only previous sessions.
  const display = history.slice(1);
  if (display.length === 0) return null;

  return (
    <div className="bg-dark-800 rounded-xl p-3">
      <p className="text-xs font-bold text-dark-300 mb-2">Previous rounds</p>
      <div className="flex flex-wrap gap-1.5">
        {display.map((h) => (
          <span
            key={h.roundNumber}
            className={`px-2 py-1 rounded-full text-[10px] font-bold text-white ${
              h.crashPoint < 1.5 ? 'bg-blue-600' : h.crashPoint < 2 ? 'bg-purple-600' : 'bg-amber-500'
            }`}
          >
            {h.crashPoint.toFixed(2)}x
          </span>
        ))}
      </div>
    </div>
  );
};
