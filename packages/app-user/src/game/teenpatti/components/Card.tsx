import type { TPCard } from '../../../types/teenpatti';

export const SUIT_SYMBOL: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_COLOR: Record<string, string> = {
  s: 'text-zinc-950',
  h: 'text-red-600',
  d: 'text-red-600',
  c: 'text-zinc-950',
};

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
export const Card = ({
  card,
  small,
  large,
  className = '',
}: {
  card: TPCard | { back: true };
  small?: boolean;
  large?: boolean;
  className?: string;
}) => {
  if ('back' in card && card.back) {
    return (
      <div
        className={`${
          large
            ? 'w-16 h-24 sm:w-20 sm:h-28'
            : small
            ? 'w-7 h-10 sm:w-8 sm:h-11'
            : 'w-11 h-15 sm:w-13 sm:h-18'
        } rounded-lg bg-gradient-to-br from-red-800 via-amber-900 to-red-950 border-2 border-amber-400/60 shadow-lg flex items-center justify-center relative overflow-hidden select-none ${className}`}
      >
        <div className="absolute inset-1 rounded border border-amber-300/30 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/20 via-transparent to-black/40">
          <span className={`${large ? 'text-2xl' : small ? 'text-xs' : 'text-sm'} text-amber-300/80 font-black`}>🎴</span>
        </div>
      </div>
    );
  }

  const c = card as TPCard;
  const color = SUIT_COLOR[c.suit] || 'text-zinc-900';
  const label = RANK_LABEL[c.rank] || String(c.rank);
  const symbol = SUIT_SYMBOL[c.suit] || '';

  return (
    <div
      className={`${
        large
          ? 'w-16 h-24 sm:w-20 sm:h-28 p-1.5'
          : small
          ? 'w-7 h-10 sm:w-8 sm:h-11 p-0.5'
          : 'w-11 h-15 sm:w-13 sm:h-18 p-1'
      } rounded-lg bg-gradient-to-b from-white via-zinc-50 to-zinc-100 border border-zinc-300 shadow-[0_4px_14px_rgba(0,0,0,0.5)] flex flex-col justify-between select-none relative transition-transform ${className}`}
    >
      {/* Top Left Index */}
      <div className="flex flex-col items-center leading-none">
        <span className={`${large ? 'text-base sm:text-lg' : small ? 'text-[10px]' : 'text-xs sm:text-sm'} font-black ${color}`}>
          {label}
        </span>
        <span className={`${large ? 'text-xs sm:text-sm' : small ? 'text-[8px]' : 'text-[10px]'} ${color}`}>
          {symbol}
        </span>
      </div>

      {/* Center Suit Symbol */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`${large ? 'text-3xl sm:text-4xl' : small ? 'text-sm' : 'text-xl'} ${color} opacity-90`}>
          {symbol}
        </span>
      </div>

      {/* Bottom Right Index (inverted) */}
      <div className="flex flex-col items-center leading-none rotate-180 self-end">
        <span className={`${large ? 'text-base sm:text-lg' : small ? 'text-[10px]' : 'text-xs sm:text-sm'} font-black ${color}`}>
          {label}
        </span>
        <span className={`${large ? 'text-xs sm:text-sm' : small ? 'text-[8px]' : 'text-[10px]'} ${color}`}>
          {symbol}
        </span>
      </div>
    </div>
  );
};

// Row of 3 cards with optional flip animation
export const CardRow = ({
  cards,
  small,
  large,
  animateKey,
}: {
  cards: (TPCard | { back: true })[];
  small?: boolean;
  large?: boolean;
  animateKey?: string | number;
}) => (
  <div key={animateKey} className="flex gap-1.5 justify-center">
    {cards.map((c, i) => (
      <div key={i} className="card-flip" style={{ animationDelay: `${i * 120}ms` }}>
        <Card card={c} small={small} large={large} />
      </div>
    ))}
  </div>
);
