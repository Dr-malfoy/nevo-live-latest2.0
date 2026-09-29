// Statistics panel — SVG pie (red/black/green + odd/even), hot/cold, streak.

import React, { memo, useEffect, useState } from 'react';
import { rouletteApi } from '../../../api';
import type { RouletteHistoryEntry } from '../../../types/roulette';
import { computeStats, RouletteStats } from '../utils/statistics';
import { colorOf, wheelLabel } from '../utils/wheel';

const EMPTY: RouletteStats = { redPct: 0, blackPct: 0, greenPct: 0, oddPct: 0, evenPct: 0, hot: [], cold: [], lastStreak: { color: 'red', length: 0 } };

/** Pie slice path (SVG). */
function slice(cx: number, cy: number, r: number, start: number, end: number): string {
  const a0 = ((start - 90) * Math.PI) / 180;
  const a1 = ((end - 90) * Math.PI) / 180;
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${(cx + r * Math.cos(a0)).toFixed(2)} ${(cy + r * Math.sin(a0)).toFixed(2)}`,
    `A ${r} ${r} 0 ${large} 1 ${(cx + r * Math.cos(a1)).toFixed(2)} ${(cy + r * Math.sin(a1)).toFixed(2)}`,
    'Z',
  ].join(' ');
}

function Pie({ red, black, green }: { red: number; black: number; green: number }) {
  const total = red + black + green;
  if (total === 0) return null;
  const r = 26;
  const cx = 30;
  const cy = 30;
  const redEnd = (red / total) * 360;
  const blackEnd = redEnd + (black / total) * 360;
  return (
    <svg viewBox="0 0 60 60" className="w-20 h-20">
      <circle cx={cx} cy={cy} r={r + 2} fill="#0f172a" stroke="#1e293b" />
      {red > 0 && <path d={slice(cx, cy, r, 0, redEnd)} fill="#ef4444" />}
      {black > 0 && <path d={slice(cx, cy, r, redEnd, blackEnd)} fill="#1f2937" stroke="#374151" strokeWidth="0.5" />}
      {green > 0 && <path d={slice(cx, cy, r, blackEnd, 360)} fill="#10b981" />}
    </svg>
  );
}

const STAT_COLOR: Record<string, string> = { red: 'text-red-400', black: 'text-zinc-300', green: 'text-emerald-400' };

const StatsInner = () => {
  const [stats, setStats] = useState<RouletteStats>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    rouletteApi
      .getHistory({ page: 1, limit: 100 })
      .then(({ data }) => {
        if (alive && data.success && Array.isArray(data.data)) {
          setStats(computeStats(data.data as RouletteHistoryEntry[], 100));
          setLoaded(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!loaded) return null;

  return (
    <div className="bg-dark-800/80 backdrop-blur-xl border border-dark-700 rounded-xl p-3 space-y-3">
      <p className="text-xs font-bold text-dark-300">Statistics · last 100</p>

      <div className="flex items-center gap-3">
        <Pie red={stats.redPct} black={stats.blackPct} green={stats.greenPct} />
        <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <span className="flex justify-between"><span className="text-red-400">Red</span><b>{stats.redPct}%</b></span>
          <span className="flex justify-between"><span className="text-zinc-300">Black</span><b>{stats.blackPct}%</b></span>
          <span className="flex justify-between"><span className="text-emerald-400">Green</span><b>{stats.greenPct}%</b></span>
          <span className="flex justify-between"><span className="text-dark-300">Odd</span><b>{stats.oddPct}%</b></span>
          <span className="flex justify-between"><span className="text-dark-300">Even</span><b>{stats.evenPct}%</b></span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <div>
          <p className="text-dark-400 mb-1">Hot</p>
          <div className="flex gap-1">
            {stats.hot.map((n) => (
              <span key={n} className={`w-6 h-6 rounded-full ${STAT_COLOR[colorOf(n)]} bg-dark-700 flex items-center justify-center font-bold`}>{wheelLabel(n)}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-dark-400 mb-1">Cold</p>
          <div className="flex gap-1">
            {stats.cold.map((n) => (
              <span key={n} className={`w-6 h-6 rounded-full ${STAT_COLOR[colorOf(n)]} bg-dark-700 flex items-center justify-center font-bold`}>{wheelLabel(n)}</span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-dark-400">
        Streak: <span className={`font-bold ${STAT_COLOR[stats.lastStreak.color]}`}>{stats.lastStreak.color} ×{stats.lastStreak.length}</span>
      </p>
    </div>
  );
};

export const StatsPanel = memo(StatsInner);
