import { useEffect, useState, useMemo } from 'react';
import type { TPSeat } from '../../../types/teenpatti';
import { Card } from './Card';
import { DiamondIcon, CoinIcon } from '../../../components/ui/CurrencyIcon';
import { evaluateHand } from '../handEval';

export const PlayerSeat = ({
  seat,
  isTurn,
  turnDeadline,
  currency,
  showCards,
  isBottom = false,
  onSeeCards,
}: {
  seat: TPSeat;
  isTurn: boolean;
  turnDeadline: number;
  currency: 'diamond' | 'coin';
  showCards: boolean;
  isBottom?: boolean;
  onSeeCards?: () => void;
}) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!isTurn || turnDeadline <= 0) {
      setRemaining(0);
      return;
    }
    const update = () => {
      const left = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setRemaining(left);
    };
    update();
    const iv = setInterval(update, 250);
    return () => clearInterval(iv);
  }, [isTurn, turnDeadline]);

  const Ccy = currency === 'coin' ? CoinIcon : DiamondIcon;

  // Hand rank evaluation (Trail / Pure Sequence / Sequence / Color / Pair / High Card)
  const handRank = useMemo(() => {
    if (seat.handRankName) return seat.handRankName;
    if (seat.cards && seat.cards.length === 3 && !('back' in (seat.cards[0] as any))) {
      return evaluateHand(seat.cards as any).name;
    }
    return null;
  }, [seat.handRankName, seat.cards]);

  const contributed = seat.roundContributed > 0 ? seat.roundContributed : seat.sessionContributed;

  // Special layout for Human Player at bottom: compact info bar on top, cards below
  if (isBottom) {
    return (
      <div className={`flex flex-col items-center gap-1.5 select-none ${seat.folded ? 'opacity-40 grayscale-[50%]' : ''}`}>
        {/* Top Info Bar: Avatar + Name + ⭐ You + Contributed Chips (No BD or blind/seen badges) */}
        <div className="flex items-center gap-2 bg-[#0c1322]/90 backdrop-blur-md px-3 py-1 rounded-full border border-amber-400/40 shadow-lg">
          {/* Avatar with Turn Ring */}
          <div className="relative">
            {isTurn && (
              <div className="absolute -inset-1 rounded-full border-2 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />
            )}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-amber-400 shadow bg-zinc-900">
              {seat.avatar ? (
                <img src={seat.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black font-black text-xs">
                  {(seat.nickname || 'Y').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            {/* Turn timer badge */}
            {isTurn && remaining > 0 && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-black text-[10px] font-black flex items-center justify-center shadow-lg border border-white/50 animate-bounce">
                {remaining}
              </span>
            )}
          </div>

          {/* Nickname & Role */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-amber-300 drop-shadow truncate max-w-[100px]">
              {seat.nickname}
            </span>
            <span className="text-[9px] text-amber-400 font-extrabold">⭐ You</span>
          </div>

          {/* Total Bet Chips Pill */}
          {contributed > 0 && (
            <div className="flex items-center gap-1 bg-[#141e30] px-2 py-0.5 rounded-full border border-cyan-500/30 ml-1 shadow-inner">
              <Ccy className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-black text-cyan-200">
                {contributed.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* 3 Playing Cards */}
        {seat.cards?.length > 0 && (
          <div
            onClick={() => {
              if (!seat.seen && onSeeCards) onSeeCards();
            }}
            className={`flex gap-1.5 items-center relative transition-transform ${
              !seat.seen ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
            }`}
          >
            {seat.cards.slice(0, 3).map((c, i) => (
              <Card
                key={i}
                card={seat.seen || showCards ? c : { back: true }}
                large
              />
            ))}
          </div>
        )}

        {/* Made hand badge: only show real hands (Pair, Sequence, Color, Trail) — HIDE "High Card" */}
        {showCards && handRank && handRank !== 'High Card' && (
          <span className="text-[10px] sm:text-[11px] font-black text-amber-300 bg-[#080d17]/95 px-3 py-0.5 rounded-full border border-amber-400/60 shadow-[0_0_12px_rgba(245,197,24,0.4)]">
            {handRank}
          </span>
        )}
      </div>
    );
  }

  // Layout for Opponents (Top, Left, Right)
  return (
    <div className={`flex flex-col items-center gap-1 relative select-none ${seat.folded ? 'opacity-40 grayscale-[50%]' : ''}`}>
      {/* Avatar */}
      <div className="relative">
        {isTurn && (
          <div className="absolute -inset-1 rounded-full border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" />
        )}

        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-zinc-500 shadow-md bg-zinc-900">
          {seat.avatar ? (
            <img src={seat.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-purple-900 flex items-center justify-center text-white font-black text-xs">
              {(seat.nickname || 'P').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        {/* Turn countdown badge */}
        {isTurn && remaining > 0 && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-black text-[10px] font-black flex items-center justify-center shadow-lg border border-white/40 animate-bounce">
            {remaining}
          </span>
        )}
      </div>

      {/* Clean Nickname (NO BD, NO Bot badge) */}
      <div className="flex flex-col items-center max-w-[100px] text-center leading-tight">
        <span className={`text-[10px] sm:text-[11px] font-black truncate max-w-full drop-shadow ${seat.folded ? 'text-zinc-500 line-through' : 'text-white'}`}>
          {seat.nickname}
        </span>
      </div>

      {/* 3 Opponent Cards (Small) */}
      {seat.cards?.length > 0 && (
        <div className="flex gap-0.5 items-center">
          {seat.cards.slice(0, 3).map((c, i) => (
            <Card
              key={i}
              card={showCards ? c : { back: true }}
              small
            />
          ))}
        </div>
      )}

      {/* Made hand badge: only show real hands (Pair, Sequence, Color, Trail) — HIDE "High Card" */}
      {showCards && handRank && handRank !== 'High Card' && (
        <span className="text-[9px] font-bold text-amber-300 bg-black/90 px-2 py-0.2 rounded border border-amber-500/50 shadow">
          {handRank}
        </span>
      )}

      {/* Contributed Bet Chips */}
      {contributed > 0 && (
        <div className="bg-[#0b101c]/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 shadow">
          <Ccy className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-black text-white">
            {contributed.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};
