// Teen Patti client-side hand evaluation helper

export type TPSuit = 's' | 'h' | 'd' | 'c';
export interface TPCard {
  suit: TPSuit;
  rank: number;
}

export const HAND_NAMES: Record<number, string> = {
  1: 'High Card',
  2: 'Pair',
  3: 'Color',
  4: 'Sequence',
  5: 'Pure Sequence',
  6: 'Trail (Set)',
};

function isSequence(ranks: number[]): boolean {
  const sorted = [...ranks].sort((a, b) => a - b);
  // A-2-3 counts as highest sequence in Teen Patti
  if (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14) return true;
  return sorted[1] - sorted[0] === 1 && sorted[2] - sorted[1] === 1;
}

export function evaluateHand(cards: TPCard[]): { rank: number; name: string } {
  if (!cards || cards.length < 3) return { rank: 1, name: 'High Card' };
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);
  const suits = sorted.map((c) => c.suit);
  const sameSuit = suits.every((s) => s === suits[0]);
  const seq = isSequence(ranks);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);

  const maxCount = Math.max(...counts.values());

  if (maxCount === 3) return { rank: 6, name: 'Trail (Set)' };
  if (sameSuit && seq) return { rank: 5, name: 'Pure Sequence' };
  if (seq) return { rank: 4, name: 'Sequence' };
  if (sameSuit) return { rank: 3, name: 'Color' };
  if (maxCount === 2) return { rank: 2, name: 'Pair' };
  return { rank: 1, name: 'High Card' };
}
