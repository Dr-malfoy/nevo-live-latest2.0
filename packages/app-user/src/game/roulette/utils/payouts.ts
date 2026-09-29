// European Roulette payouts + bet labels (mirrors backend BET_PAYOUTS).

export type PayoutKey = 'straight' | 'split' | 'street' | 'corner' | 'sixline' | 'column' | 'dozen' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high';

export const PAYOUTS: Record<PayoutKey, number> = {
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

export const BET_LABELS: Record<PayoutKey, string> = {
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

/** Gross win for a winning bet of `amount` on `type`. */
export function calcPayout(amount: number, type: PayoutKey): number {
  return Math.floor(amount * PAYOUTS[type]);
}

/** Chip denomination → color scheme. */
export const CHIP_STYLES: Record<string, string> = {
  '1': 'bg-gray-400 text-gray-900 border-gray-200',
  '5': 'bg-red-500 text-white border-red-300',
  '10': 'bg-blue-500 text-white border-blue-300',
  '25': 'bg-emerald-500 text-white border-emerald-300',
  '50': 'bg-cyan-500 text-white border-cyan-300',
  '100': 'bg-purple-500 text-white border-purple-300',
  '500': 'bg-yellow-400 text-gray-900 border-yellow-200',
  '1000': 'bg-pink-500 text-white border-pink-300',
};

export const CHIP_VALUES = [1, 5, 10, 25, 50, 100, 500, 1000];

export function formatNumber(n: number): string {
  return n.toLocaleString();
}
