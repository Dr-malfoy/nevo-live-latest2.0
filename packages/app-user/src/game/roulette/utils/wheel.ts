// European wheel geometry + color helpers (mirrors backend utils/roulette.ts).

// Physical clockwise pocket order on a European wheel (index 0 = '0').
export const EUROPEAN_WHEEL: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const POCKET_COUNT = EUROPEAN_WHEEL.length; // 37
export const POCKET_ANGLE = 360 / POCKET_COUNT;

export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const GREEN_NUMBERS = new Set([0]);

export type PocketColor = 'red' | 'black' | 'green';

export function colorOf(index: number): PocketColor {
  if (GREEN_NUMBERS.has(index)) return 'green';
  return RED_NUMBERS.has(index) ? 'red' : 'black';
}

export function colorOfNumber(n: number): PocketColor {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

export function wheelLabel(index: number): string {
  return String(index);
}

/** Wheel neighbors of a number: the 2 pockets on each side (5 total incl. itself). */
export function wheelNeighbors(index: number): number[] {
  const pos = EUROPEAN_WHEEL.indexOf(index);
  if (pos < 0) return [index];
  const out: number[] = [];
  for (let d = -2; d <= 2; d += 1) {
    out.push(EUROPEAN_WHEEL[(pos + d + POCKET_COUNT) % POCKET_COUNT]);
  }
  return out;
}

/** Physical wheel indexes for the board layout (1-36, 0). */
export function boardNumbers(): number[] {
  return Array.from({ length: 37 }, (_, i) => i);
}
