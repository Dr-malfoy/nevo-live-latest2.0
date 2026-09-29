// Teen Patti card + hand evaluation utilities (pure functions, no state)

export type TPSuit = 's' | 'h' | 'd' | 'c';
export type TPRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface TPCard {
  suit: TPSuit;
  rank: TPRank;
}

export const SUITS: TPSuit[] = ['s', 'h', 'd', 'c'];
export const RANKS: TPRank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const SUIT_SYMBOL: Record<TPSuit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };

// Hand ranks: higher = better
export const HAND_RANK = {
  HIGH_CARD: 1,
  PAIR: 2,
  COLOR: 3, // flush
  SEQUENCE: 4, // straight
  PURE_SEQUENCE: 5, // straight flush
  TRAIL: 6, // three of a kind
} as const;

export const HAND_NAMES: Record<number, string> = {
  [HAND_RANK.HIGH_CARD]: 'High Card',
  [HAND_RANK.PAIR]: 'Pair',
  [HAND_RANK.COLOR]: 'Color',
  [HAND_RANK.SEQUENCE]: 'Sequence',
  [HAND_RANK.PURE_SEQUENCE]: 'Pure Sequence',
  [HAND_RANK.TRAIL]: 'Trail',
};

export function createDeck(): TPCard[] {
  const deck: TPCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

// Fisher–Yates shuffle (returns a new array, input untouched)
export function shuffleDeck(cards: TPCard[]): TPCard[] {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function isSequence(ranks: number[]): boolean {
  const sorted = [...ranks].sort((a, b) => a - b);
  // Straight: consecutive. A-2-3 counts as the HIGHEST sequence in Teen Patti.
  if (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14) return true;
  return sorted[2] - sorted[0] === 2;
}

// Return the "high" value of a sequence: A-2-3 → 15 (beats K-Q-J = 14), else max rank
function sequenceHigh(ranks: number[]): number {
  const sorted = [...ranks].sort((a, b) => a - b);
  if (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14) return 15;
  return sorted[2];
}

export interface HandResult {
  rank: number;
  // tiebreak values: [primary group, high card(s) desc]
  tiebreak: number[];
}

export function evaluateHand(cards: TPCard[]): HandResult {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);
  const suits = sorted.map((c) => c.suit);
  const sameSuit = suits.every((s) => s === suits[0]);
  const seq = isSequence(ranks);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);

  const groups = [...counts.entries()].sort((a, b) => {
    if (a[1] !== b[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  // Trail (3 of a kind)
  if (groups[0][1] === 3) {
    return { rank: HAND_RANK.TRAIL, tiebreak: [groups[0][0]] };
  }

  // Pure sequence (straight flush)
  if (sameSuit && seq) {
    return { rank: HAND_RANK.PURE_SEQUENCE, tiebreak: [sequenceHigh(ranks)] };
  }

  // Sequence (straight)
  if (seq) {
    return { rank: HAND_RANK.SEQUENCE, tiebreak: [sequenceHigh(ranks)] };
  }

  // Color (flush)
  if (sameSuit) {
    return { rank: HAND_RANK.COLOR, tiebreak: ranks };
  }

  // Pair
  if (groups[0][1] === 2) {
    const pairRank = groups[0][0];
    const kickers = groups.filter((g) => g[0] !== pairRank).map((g) => g[0]);
    return { rank: HAND_RANK.PAIR, tiebreak: [pairRank, ...kickers] };
  }

  // High card
  return { rank: HAND_RANK.HIGH_CARD, tiebreak: ranks };
}

// Negative → a wins, positive → b wins, 0 → tie
export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rank !== b.rank) return b.rank - a.rank;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const av = a.tiebreak[i] || 0;
    const bv = b.tiebreak[i] || 0;
    if (av !== bv) return bv - av;
  }
  return 0;
}
