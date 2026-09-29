// Teen Patti shared frontend types

export type TPSuit = 's' | 'h' | 'd' | 'c';

export interface TPCard {
  suit: TPSuit;
  rank: number; // 2-14 (Ace = 14)
}

export type TPPhase = 'lobby' | 'countdown' | 'betting' | 'showdown';

export interface TPSeat {
  userId: string;
  nickname: string;
  avatar: string;
  seen: boolean;
  folded: boolean;
  active: boolean;
  connected: boolean;
  roundContributed: number;
  sessionContributed: number;
  cards: (TPCard | { back: true })[];
  isYou: boolean;
}

export interface TPTableState {
  tableId: string;
  currency: 'diamond' | 'coin';
  phase: TPPhase;
  pot: number;
  stake: number;
  roundNumber: number;
  roundId: string | null;
  raises: number;
  turnIndex: number;
  countdownTo: number;
  turnDeadline: number;
  seats: TPSeat[];
}

export interface TPLobbyState {
  currency: 'diamond' | 'coin';
  inQueue: number;
  tables: { id: string; phase: TPPhase; players: number; pot: number }[];
}

export interface TPCardsPayload {
  tableId: string;
  cards: TPCard[];
  seen: boolean;
}

export interface TPWinnerInfo {
  userId: string;
  nickname: string;
  handName: string;
  cards: TPCard[];
}

export interface TPHandInfo {
  userId: string;
  nickname: string;
  handName: string;
  cards: TPCard[];
  folded: boolean;
}

export interface TPResult {
  tableId?: string;
  reason?: string;
  winners?: TPWinnerInfo[];
  houseCut?: number;
  pot?: number;
  payout?: number;
  split?: boolean;
  hands?: TPHandInfo[];
  seats?: TPSeat[];
}

export interface TPHistoryEntry {
  _id: string;
  roundId: string | { roundNumber: number; pot: number; winnerId?: string; endedAt?: string; houseCut: number; currency: 'diamond' | 'coin' };
  currency: 'diamond' | 'coin';
  ante: number;
  totalBet: number;
  winAmount: number;
  status: 'playing' | 'folded' | 'won' | 'lost';
  handRank?: number;
  handName?: string;
  createdAt: string;
}
