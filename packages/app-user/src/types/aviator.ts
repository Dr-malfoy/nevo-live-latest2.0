export type AviatorPhase = 'BET' | 'PLAYING' | 'CRASHED';

export interface AviatorState {
  phase: AviatorPhase;
  roundNumber: number;
  multiplier: number;
  crashPoint: number | null;
  endsAt: number;
  liveBetCount: number;
}

export interface AviatorHistoryEntry {
  roundNumber: number;
  crashPoint: number;
}

export interface AviatorBetResult {
  betId: string;
  userId: string;
  betAmount: number;
  cashOutAt?: number;
  winAmount?: number;
  status: 'cashed_out' | 'lost';
}

export interface AviatorResult {
  roundNumber: number;
  crashPoint: number;
  results: AviatorBetResult[];
}
