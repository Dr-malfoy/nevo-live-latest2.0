// History panel — last 20 winning numbers, slide-in animation.

import React, { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { rouletteApi } from '../../../api';
import type { RouletteHistoryEntry } from '../../../types/roulette';
import { colorOf } from '../utils/wheel';
import { wheelLabel } from '../utils/wheel';

const DOT: Record<string, string> = {
  red: 'bg-gradient-to-b from-red-500 to-red-700',
  black: 'bg-gradient-to-b from-zinc-600 to-zinc-900',
  green: 'bg-gradient-to-b from-emerald-500 to-emerald-700',
};

const HistoryInner = () => {
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

  if (history.length === 0) return null;

  return (
    <div className="bg-dark-800/80 backdrop-blur-xl border border-dark-700 rounded-xl p-3">
      <p className="text-xs font-bold text-dark-300 mb-2">Recent Numbers</p>
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence initial={false}>
          {history.map((h, i) => {
            const idx = h.winningNumber;
            const isLegacy = idx < 0 || idx > 36;
            const color = isLegacy ? 'green' : colorOf(idx);
            return (
              <motion.span
                key={h._id || h.roundNumber}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`w-7 h-7 rounded-full ${DOT[color]} text-[10px] font-bold text-white flex items-center justify-center shadow`}
                title={`Round #${h.roundNumber}`}
              >
                {isLegacy ? '—' : wheelLabel(idx)}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const HistoryPanel = memo(HistoryInner);
