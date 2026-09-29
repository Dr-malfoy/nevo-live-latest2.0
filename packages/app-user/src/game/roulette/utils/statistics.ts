// Statistics computed from history — hot/cold numbers, streaks, color parity.

import type { RouletteHistoryEntry } from '../../../types/roulette';
import { colorOf } from './wheel';

export interface RouletteStats {
  redPct: number;
  blackPct: number;
  greenPct: number;
  oddPct: number;
  evenPct: number;
  hot: number[]; // most frequent numbers (top 5, sorted desc by count)
  cold: number[]; // least frequent (bottom 5 among seen numbers)
  lastStreak: { color: 'red' | 'black' | 'green'; length: number };
}

/** Compute stats over the last `window` history entries (default 100). */
export function computeStats(history: RouletteHistoryEntry[], window = 100): RouletteStats {
  const recent = history.slice(0, window).filter((h) => h.winningNumber >= 0 && h.winningNumber <= 36);

  let red = 0;
  let black = 0;
  let green = 0;
  let odd = 0;
  let even = 0;
  const counts = new Map<number, number>();

  for (const h of recent) {
    const idx = h.winningNumber;
    const c = colorOf(idx);
    if (c === 'red') red += 1;
    else if (c === 'black') black += 1;
    else green += 1;
    if (idx !== 0) {
      if (idx % 2 === 0) even += 1;
      else odd += 1;
    }
    counts.set(idx, (counts.get(idx) || 0) + 1);
  }

  const total = recent.length || 1;
  const pct = (n: number) => Math.round((n / total) * 100);

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const hot = sorted.slice(0, 5).map(([n]) => n);
  const cold = sorted.slice(-5).map(([n]) => n).reverse();

  // Current streak of the last few results.
  let lastStreak: RouletteStats['lastStreak'] = { color: 'red', length: 0 };
  if (recent.length > 0) {
    const lastColor = colorOf(recent[0].winningNumber);
    let length = 1;
    for (let i = 1; i < recent.length; i += 1) {
      if (colorOf(recent[i].winningNumber) === lastColor) length += 1;
      else break;
    }
    lastStreak = { color: lastColor, length };
  }

  return { redPct: pct(red), blackPct: pct(black), greenPct: pct(green), oddPct: pct(odd), evenPct: pct(even), hot, cold, lastStreak };
}

/** Best multiplier from my last-round results. */
export function lastWinMultiplier(results: { winAmount: number; betAmount: number }[]): number {
  let best = 0;
  for (const r of results) {
    if (r.betAmount > 0 && r.winAmount > 0) {
      best = Math.max(best, r.winAmount / r.betAmount);
    }
  }
  return best;
}
