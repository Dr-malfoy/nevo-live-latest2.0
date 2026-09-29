// Compact "recent numbers" strip — always visible above the betting board.
// Mirrors the classic roulette history ribbon: color-coded winning numbers
// in a horizontally scrollable row.

import React, { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { rouletteApi } from '../../../api';
import type { RouletteHistoryEntry } from '../../../types/roulette';
import { colorOf } from '../utils/wheel';
import { wheelLabel } from '../utils/wheel';

const DOT: Record<string, string> = {
  red: 'bg-gradient-to-b from-red-500 to-red-700',
  black: 'bg-gradient-to-b from-zinc-600 to-zinc-900',
  green: 'bg-gradient-to-b from-emerald-500 to-emerald-700',
};

const RecentNumbersInner = () => {
  const [history, setHistory] = useState<RouletteHistoryEntry[]>([]);

  useEffect(() => {
    let alive = true;
    rouletteApi
      .getHistory({ page: 1, limit: 20 })
      .then(({ data }) => {
        if (alive && data.success && Array.isArray(data.data)) setHistory(data.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="roulette-glass p-2.5">
      <p className="text-[10px] font-bold text-dark-400 uppercase tracking-wider mb-1.5">Recent Numbers</p>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {history.length === 0 ? (
          <p className="text-[11px] text-dark-500">Waiting for results…</p>
        ) : (
          history.map((h, i) => {
            const idx = h.winningNumber;
            const isLegacy = idx < 0 || idx > 36;
            const color = isLegacy ? 'green' : colorOf(idx);
            return (
              <motion.span
                key={h._id || h.roundNumber}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.015 }}
                className={`w-7 h-7 shrink-0 rounded-full ${DOT[color]} text-[10px] font-bold text-white flex items-center justify-center shadow-md border border-white/10`}
                title={`Round #${h.roundNumber}`}
              >
                {isLegacy ? '—' : wheelLabel(idx)}
              </motion.span>
            );
          })
        )}
      </div>
    </div>
  );
};

export const RecentNumbers = memo(RecentNumbersInner);
