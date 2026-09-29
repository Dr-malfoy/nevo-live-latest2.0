// Board geometry in a unit coordinate system.
// The board is 14 units wide × 5 units tall:
//   x 0-1   = zero column (spans 3 rows)
//   x 1-13  = number grid (12 columns × 3 rows)
//   x 13-14 = 2:1 columns (right side)
//   y 0-3   = number rows
//   y 3-4   = outside row 1 (dozens / 1-18 / EVEN / RED)
//   y 4-5   = outside row 2 (2:1 / 19-36 / ODD / BLACK)

import type { RouletteBetType } from '../../../../types/roulette';
import { colorOfNumber } from '../../utils/wheel';

export const GRID_W = 14;
export const GRID_H = 5;

export const BOARD: number[][] = Array.from({ length: 3 }, (_, r) =>
  Array.from({ length: 12 }, (_, c) => 3 - r + 3 * c)
);

/** Stable id for a bet spot (sorted numbers so split [3,6] === [6,3]). */
export function betKey(type: RouletteBetType, numbers: number[]): string {
  return `${type}:${numbers.slice().sort((a, b) => a - b).join(',')}`;
}

export interface Spot {
  key: string;
  type: RouletteBetType;
  numbers: number[];
  x: number; // unit x center
  y: number; // unit y center
  w?: number; // unit width (hotspots only)
  h?: number; // unit height
  kind: 'zero' | 'number' | 'column' | 'outside' | 'split' | 'street' | 'corner' | 'sixline';
  label?: string;
  aria: string;
}

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const DOZENS = [range(1, 12), range(13, 24), range(25, 36)];
const COLUMNS = [range(3, 36).filter((n) => n % 3 === 0), range(2, 35).filter((n) => n % 3 === 2), range(1, 34).filter((n) => n % 3 === 1)];

function numberAria(n: number): string {
  const color = colorOfNumber(n);
  return `${n} ${color}, straight`;
}

export function generateSpots(): Spot[] {
  const spots: Spot[] = [];

  // Zero
  spots.push({
    key: betKey('straight', [0]),
    type: 'straight',
    numbers: [0],
    x: 0.5,
    y: 1.5,
    w: 1,
    h: 3,
    kind: 'zero',
    aria: '0 green, straight',
  });

  // Numbers + straights
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 12; c += 1) {
      const n = BOARD[r][c];
      spots.push({
        key: betKey('straight', [n]),
        type: 'straight',
        numbers: [n],
        x: c + 1.5,
        y: r + 0.5,
        w: 1,
        h: 1,
        kind: 'number',
        aria: numberAria(n),
      });
    }
  }

  // Horizontal splits (adjacent in a row)
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 11; c += 1) {
      const nums = [BOARD[r][c], BOARD[r][c + 1]];
      spots.push({
        key: betKey('split', nums),
        type: 'split',
        numbers: nums,
        x: c + 2,
        y: r + 0.5,
        w: 0.6,
        h: 0.7,
        kind: 'split',
        aria: `${nums.join(' and ')}, split`,
      });
    }
  }

  // Vertical splits (stacked in a column)
  for (let r = 0; r < 2; r += 1) {
    for (let c = 0; c < 12; c += 1) {
      const nums = [BOARD[r][c], BOARD[r + 1][c]];
      spots.push({
        key: betKey('split', nums),
        type: 'split',
        numbers: nums,
        x: c + 1.5,
        y: r + 1,
        w: 0.7,
        h: 0.6,
        kind: 'split',
        aria: `${nums.join(' and ')}, split`,
      });
    }
  }

  // Streets (3 numbers, right edge of each triplet)
  for (let r = 0; r < 3; r += 1) {
    for (let t = 0; t < 4; t += 1) {
      const nums = BOARD[r].slice(3 * t, 3 * t + 3);
      spots.push({
        key: betKey('street', nums),
        type: 'street',
        numbers: nums,
        x: 4 + 3 * t,
        y: r + 0.5,
        w: 0.5,
        h: 0.8,
        kind: 'street',
        aria: `${nums.join(', ')}, street`,
      });
    }
  }

  // Corners (4 numbers at row/column intersections)
  for (let r = 0; r < 2; r += 1) {
    for (let c = 0; c < 11; c += 1) {
      const nums = [BOARD[r][c], BOARD[r][c + 1], BOARD[r + 1][c], BOARD[r + 1][c + 1]];
      spots.push({
        key: betKey('corner', nums),
        type: 'corner',
        numbers: nums,
        x: c + 2,
        y: r + 1,
        w: 0.6,
        h: 0.6,
        kind: 'corner',
        aria: `${nums.join(', ')}, corner`,
      });
    }
  }

  // Six lines (2 adjacent triplets)
  for (let r = 0; r < 2; r += 1) {
    for (let t = 0; t < 4; t += 1) {
      const nums = [...BOARD[r].slice(3 * t, 3 * t + 3), ...BOARD[r + 1].slice(3 * t, 3 * t + 3)];
      spots.push({
        key: betKey('sixline', nums),
        type: 'sixline',
        numbers: nums,
        x: 4 + 3 * t,
        y: r + 1,
        w: 0.5,
        h: 1.6,
        kind: 'sixline',
        aria: `${nums.join(', ')}, six line`,
      });
    }
  }

  // Columns (right side 2:1)
  for (let c = 0; c < 3; c += 1) {
    const nums = COLUMNS[c];
    spots.push({
      key: betKey('column', nums),
      type: 'column',
      numbers: nums,
      x: 13.5,
      y: c + 0.5,
      w: 1,
      h: 1,
      kind: 'column',
      label: '2:1',
      aria: `Column ${nums[0]} to ${nums[nums.length - 1]}, 2 to 1`,
    });
  }

  // Outside row 1: dozens + 1-18 + EVEN + RED
  const row1: { label: string; type: RouletteBetType; nums: number[]; cls: string }[] = [
    { label: '1st 12', type: 'dozen', nums: DOZENS[0], cls: '' },
    { label: '2nd 12', type: 'dozen', nums: DOZENS[1], cls: '' },
    { label: '3rd 12', type: 'dozen', nums: DOZENS[2], cls: '' },
    { label: '1-18', type: 'low', nums: range(1, 18), cls: '' },
    { label: 'EVEN', type: 'even', nums: range(2, 36).filter((n) => n % 2 === 0), cls: '' },
    { label: 'RED', type: 'red', nums: [...RED], cls: 'text-red-400' },
  ];
  row1.forEach((s, i) => {
    spots.push({
      key: betKey(s.type, s.nums),
      type: s.type,
      numbers: s.nums,
      x: ((i + 0.5) * GRID_W) / 6,
      y: 3.5,
      kind: 'outside',
      label: s.label,
      aria: `${s.label}, ${s.type}`,
    });
  });

  // Outside row 2: 2:1 columns + 19-36 + ODD + BLACK
  const row2: { label: string; type: RouletteBetType; nums: number[]; cls: string }[] = [
    { label: '2:1', type: 'column', nums: COLUMNS[0], cls: '' },
    { label: '2:1', type: 'column', nums: COLUMNS[1], cls: '' },
    { label: '2:1', type: 'column', nums: COLUMNS[2], cls: '' },
    { label: '19-36', type: 'high', nums: range(19, 36), cls: '' },
    { label: 'ODD', type: 'odd', nums: range(1, 35).filter((n) => n % 2 === 1), cls: '' },
    { label: 'BLACK', type: 'black', nums: range(1, 36).filter((n) => !RED.has(n)), cls: 'text-zinc-300' },
  ];
  row2.forEach((s, i) => {
    spots.push({
      key: betKey(s.type, s.nums),
      type: s.type,
      numbers: s.nums,
      x: ((i + 0.5) * GRID_W) / 6,
      y: 4.5,
      kind: 'outside',
      label: s.label,
      aria: `${s.label}, ${s.type}`,
    });
  });

  return spots;
}

/** Unit coordinates → percentage of the board. */
export function unitPct(x: number, y: number, w?: number, h?: number) {
  return {
    left: `${(x / GRID_W) * 100}%`,
    top: `${(y / GRID_H) * 100}%`,
    width: w ? `${(w / GRID_W) * 100}%` : undefined,
    height: h ? `${(h / GRID_H) * 100}%` : undefined,
  };
}
