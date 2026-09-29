import type { TPCard } from '../../../types/teenpatti';

export const SUIT_SYMBOL: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_COLOR: Record<string, string> = { s: 'text-slate-200', h: 'text-red-500', d: 'text-red-500', c: 'text-slate-200' };

export const RANK_LABEL: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export const HAND_NAMES: Record<number, string> = {
  1: 'High Card',
  2: 'Pair',
  3: 'Color',
  4: 'Sequence',
  5: 'Pure Sequence',
  6: 'Trail',
};

// A single playing card (face-up or face-down)
export const Card = ({ card, small }: { card: TPCard | { back: true }; small?: boolean }) => {
  if ('back' in card && card.back) {
    return (
      <div
        className={`${small ? 'w-8 h-11' : 'w-12 h-16'} sm:${small ? 'w-9 h-12' : 'w-14 h-19'} rounded-lg bg-gradient-to-br from-brand-primary/80 via-purple-600 to-brand-secondary/80 border border-white/20 shadow-lg flex items-center justify-center`}
      >
        <span className={`${small ? 'text-xs' : 'text-sm'} text-white/60 font-black`}>🂠</span>
      </div>
    );
  }
  const c = card as TPCard;
  const color = SUIT_COLOR[c.suit];
  return (
    <div
      className={`${small ? 'w-8 h-11' : 'w-12 h-16'} sm:${small ? 'w-9 h-12' : 'w-14 h-19'} rounded-lg bg-gradient-to-br from-white to-slate-200 border border-white/40 shadow-[0_4px_16px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-0.5 select-none`}
    >
      <span className={`${small ? 'text-sm' : 'text-lg'} font-black leading-none ${color}`}>
        {RANK_LABEL[c.rank]}
      </span>
      <span className={`${small ? 'text-xs' : 'text-base'} leading-none ${color}`}>
        {SUIT_SYMBOL[c.suit]}
      </span>
    </div>
  );
};

// Row of 3 cards, with optional flip-in animation keyed by round
export const CardRow = ({ cards, small, animateKey }: { cards: (TPCard | { back: true })[]; small?: boolean; animateKey?: string | number }) => (
  <div key={animateKey} className="flex gap-1.5">
    {cards.map((c, i) => (
      <div key={i} className="card-flip" style={{ animationDelay: `${i * 120}ms` }}>
        <Card card={c} small={small} />
      </div>
    ))}
  </div>
);
