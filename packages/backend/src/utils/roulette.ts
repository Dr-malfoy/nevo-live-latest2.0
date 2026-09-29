// Pure Roulette helpers (mirrors utils/teenpattiHand.ts — no IO, unit-testable).

import { createHash, randomBytes } from 'crypto';

// European wheel layout, 37 pockets. Index 0 = '0', indexes 1-36 = the numbers.
// This is the physical clockwise order of pockets on a real European wheel.
export const WHEEL: number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const GREEN_NUMBERS = new Set([0]);

export type BetType =
  | 'straight'
  | 'split'
  | 'street'
  | 'corner'
  | 'sixline'
  | 'column'
  | 'dozen'
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high';

export const BET_TYPES: BetType[] = [
  'straight', 'split', 'street', 'corner', 'sixline',
  'column', 'dozen', 'red', 'black', 'even', 'odd', 'low', 'high',
];

// Payout multiplier (paid winnings on top of the returned stake-equivalent).
export const BET_PAYOUTS: Record<BetType, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  sixline: 5,
  column: 2,
  dozen: 2,
  red: 1,
  black: 1,
  even: 1,
  odd: 1,
  low: 1,
  high: 1,
};

export const BET_LABELS: Record<BetType, string> = {
  straight: 'Straight',
  split: 'Split',
  street: 'Street',
  corner: 'Corner',
  sixline: 'Six Line',
  column: 'Column',
  dozen: 'Dozen',
  red: 'Red',
  black: 'Black',
  even: 'Even',
  odd: 'Odd',
  low: '1-18',
  high: '19-36',
};

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// Number coverage per bet type (values are the 1-36 numbers, except 0 handled
// only via straight bets on the zero pocket).
export const BET_TARGETS: Record<BetType, number[]> = {
  straight: [], // resolved per-cell at bet time (1-36 or 0)
  split: [],
  street: [],
  corner: [],
  sixline: [],
  column: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], // "2 to 1" first column
  dozen: range(1, 12),
  red: [...RED_NUMBERS],
  black: range(1, 36).filter((n) => !RED_NUMBERS.has(n)),
  even: range(2, 36).filter((n) => n % 2 === 0),
  odd: range(1, 35).filter((n) => n % 2 === 1),
  low: range(1, 18),
  high: range(19, 36),
};

/** Map a wheel index (0-36) to the display number ('0' | '1'...'36'). */
export function wheelNumberLabel(index: number): string {
  return String(index);
}

export function isRed(index: number): boolean {
  return RED_NUMBERS.has(index);
}

export function pocketColor(index: number): 'red' | 'black' | 'green' {
  if (GREEN_NUMBERS.has(index)) return 'green';
  return isRed(index) ? 'red' : 'black';
}

// ─── Provably fair ─────────────────────────────────────────────────────

/** 32 random bytes as hex — the round seed, revealed after the spin. */
export function generateRoundSeed(): string {
  return randomBytes(32).toString('hex');
}

/** SHA-256 hex digest of the seed (committed before the spin). */
export function hashSeed(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

/** Deterministic wheel index (0-36) derived from a seed. */
export function seedToIndex(seed: string): number {
  return parseInt(seed.slice(0, 8), 16) % WHEEL.length;
}

/** Random wheel index 0-36 (legacy/unseeded path kept for compatibility). */
export function spinWheel(): number {
  return seedToIndex(generateRoundSeed());
}

/** Does a bet (covering the given wheel indexes) win on winIndex? */
export function isWin(numbers: number[], winIndex: number): boolean {
  return numbers.includes(winIndex);
}

/** Gross payout for a winning bet (amount * multiplier). */
export function calcPayout(betAmount: number, betType: BetType): number {
  return betAmount * BET_PAYOUTS[betType];
}

/** Validate a client-supplied bet selection for a bet type. */
export function validateSelection(betType: BetType, numbers: number[] | undefined): { ok: true; numbers: number[] } | { ok: false; error: string } {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return { ok: false, error: 'Invalid bet selection' };
  }

  switch (betType) {
    case 'straight':
      if (numbers.length !== 1) return { ok: false, error: 'Straight bet must cover exactly 1 pocket' };
      if (numbers[0] < 0 || numbers[0] > 36) return { ok: false, error: 'Invalid pocket' };
      return { ok: true, numbers };
    case 'split':
      if (numbers.length !== 2) return { ok: false, error: 'Split bet must cover exactly 2 pockets' };
      break;
    case 'street':
      if (numbers.length !== 3) return { ok: false, error: 'Street bet must cover exactly 3 numbers' };
      break;
    case 'corner':
      if (numbers.length !== 4) return { ok: false, error: 'Corner bet must cover exactly 4 numbers' };
      break;
    case 'sixline':
      if (numbers.length !== 6) return { ok: false, error: 'Six line bet must cover exactly 6 numbers' };
      break;
    case 'column':
    case 'dozen':
    case 'red':
    case 'black':
    case 'even':
    case 'odd':
    case 'low':
    case 'high': {
      const expected = BET_TARGETS[betType];
      // For outside bets, the client sends the covered numbers; verify set equality.
      const a = [...new Set(numbers)].sort((x, y) => x - y);
      const b = [...expected].sort((x, y) => x - y);
      if (a.length !== b.length || a.some((n, i) => n !== b[i])) {
        return { ok: false, error: 'Invalid selection for bet type' };
      }
      return { ok: true, numbers: b };
    }
    default:
      return { ok: false, error: 'Invalid bet type' };
  }

  // Inside multi-pockets: all must be valid 1-36 (0 only allowed for straight).
  if (numbers.some((n) => n < 1 || n > 36 || !Number.isInteger(n))) {
    return { ok: false, error: 'Invalid pocket(s) in selection' };
  }
  return { ok: true, numbers };
}
