// Roulette shared frontend types (mirrors types/teenpatti.ts conventions)

export type RouletteBetType =
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

export type RoulettePhase = 'betting' | 'spinning';

export interface RouletteState {
  phase: RoulettePhase;
  roundNumber: number;
  winningIndex: number | null;
  endsAt: number;
  liveBetCount: number;
  /** SHA-256 of the round seed — committed before the spin (provably fair). */
  hash: string | null;
}

export interface RouletteBetResult {
  betId: string;
  betType: RouletteBetType;
  numbers: number[];
  betAmount: number;
  winAmount: number;
  status: 'won' | 'lost';
  userId: string;
  currency: 'diamond' | 'coin';
}

export interface RouletteResult {
  roundNumber: number;
  winningIndex: number;
  winningNumber: string;
  results: RouletteBetResult[];
  /** Revealed after the spin so clients can verify fairness. */
  seed?: string;
  hash?: string;
}

export interface RouletteHistoryEntry {
  _id: string;
  roundNumber: number;
  winningNumber: number;
  winningLabel: string;
  endedAt?: string;
}

export interface RouletteHistoryItem {
  _id: string;
  roundId: string | { roundNumber: number; winningNumber: number; endedAt?: string };
  currency: 'diamond' | 'coin';
  betType: RouletteBetType;
  numbers: number[];
  betAmount: number;
  winAmount: number;
  status: 'active' | 'won' | 'lost';
  createdAt: string;
}
