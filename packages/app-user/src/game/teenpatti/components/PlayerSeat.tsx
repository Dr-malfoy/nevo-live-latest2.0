import { useEffect, useState } from 'react';
import type { TPSeat } from '../../../types/teenpatti';
import { Card } from './Card';
import { CoinIcon, DiamondIcon } from '../../../components/ui/CurrencyIcon';

// One player seat around the table
export const PlayerSeat = ({
  seat,
  isTurn,
  turnDeadline,
  currency,
  showCards,
}: {
  seat: TPSeat;
  isTurn: boolean;
  turnDeadline: number;
  currency: 'diamond' | 'coin';
  showCards: boolean;
}) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!isTurn || turnDeadline <= 0) return;
    setRemaining(Math.max(0, (turnDeadline - Date.now()) / 1000));
    const iv = setInterval(() => {
      setRemaining(Math.max(0, (turnDeadline - Date.now()) / 1000));
    }, 200);
    return () => clearInterval(iv);
  }, [isTurn, turnDeadline]);

  const Ccy = currency === 'coin' ? CoinIcon : DiamondIcon;

  return (
    <div className="flex flex-col items-center gap-1.5 relative">
      {/* Turn ring + countdown */}
      {isTurn && (
        <div className="absolute -inset-2 rounded-full border-2 border-brand-accent animate-pulse" />
      )}
      <div className="relative">
        <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${seat.folded ? 'border-dark-600 opacity-50' : 'border-brand-accent'}`}>
          {seat.avatar ? (
            <img src={seat.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-black">
              {(seat.nickname || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        {isTurn && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-accent text-white text-[10px] font-bold flex items-center justify-center shadow">
            {Math.ceil(remaining)}
          </span>
        )}
      </div>

      {/* Cards (face down unless showCards and revealed) */}
      {seat.cards?.length > 0 && (
        <div className="flex gap-1">
          {seat.cards.slice(0, 3).map((c, i) => (
            <Card key={i} card={c} small />
          ))}
        </div>
      )}

      {/* Name + seen badge */}
      <div className="flex items-center gap-1 max-w-[88px]">
        <span className={`text-[10px] font-semibold truncate ${seat.folded ? 'text-dark-500 line-through' : 'text-white'}`}>
          {seat.nickname}
        </span>
        {seat.seen && !seat.folded && <span className="text-[9px] text-cyan-300 font-bold">EYE</span>}
      </div>

      {/* Chips */}
      <div className="glass-chip px-2 py-0.5 flex items-center gap-1">
        <Ccy className="w-3 h-3" />
        <span className="text-[10px] font-bold text-white">{seat.roundContributed > 0 ? seat.roundContributed : seat.sessionContributed}</span>
      </div>

      {seat.folded && <span className="text-[9px] text-red-400 font-bold uppercase -mt-1">Fold</span>}
    </div>
  );
};
