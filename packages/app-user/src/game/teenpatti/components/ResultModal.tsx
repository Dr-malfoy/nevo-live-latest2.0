import { useEffect, useState } from 'react';
import type { TPResult } from '../../../types/teenpatti';
import { Card } from './Card';
import { DiamondIcon } from '../../../components/ui/CurrencyIcon';

export const ResultModal = ({
  result,
  onClose,
  onLeave,
}: {
  result: TPResult;
  onClose?: () => void;
  onLeave?: () => void;
}) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onClose]);

  const winners = result.winners || [];
  const primaryWinner = winners[0];
  const isHumanWinner = Boolean((result as any).isHumanWinner);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-none"
    >
      <div className="bg-[#0c121d] border-2 border-amber-400/70 rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-[0_0_60px_rgba(245,197,24,0.35)] relative overflow-hidden text-white cursor-default">
        {/* Glow header banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

        {/* Back / Exit Button Top-Left */}
        {onLeave && (
          <button
            onClick={onLeave}
            className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#182338] hover:bg-[#253554] text-zinc-300 hover:text-white flex items-center gap-1 text-[11px] font-black transition active:scale-95 border border-white/10 z-20 shadow"
            title="Leave Table"
          >
            ← Exit
          </button>
        )}

        {/* Close ✕ Button Top-Right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#182338] hover:bg-[#253554] text-zinc-300 hover:text-white flex items-center justify-center font-black transition active:scale-95 border border-white/10 z-20 shadow"
          title="Close Modal"
        >
          ✕
        </button>

        {/* Victory / Defeat Header */}
        <div className="text-center space-y-1.5 pt-4">
          {isHumanWinner ? (
            <>
              <div className="text-4xl animate-bounce">🏆🎉</div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                YOU WON 2X DIAMONDS!
              </h2>
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 font-black text-sm shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                <DiamondIcon className="w-4 h-4 text-cyan-400" />
                <span>+{(result.payout || 0).toLocaleString()} Diamonds Added to Account!</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl">👑</div>
              <h2 className="text-xl font-black text-amber-300">
                {primaryWinner?.nickname || 'Opponent'} Won!
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Opponent had a higher hand this round.
              </p>
            </>
          )}

          {primaryWinner?.handName && (
            <p className="text-xs font-black text-amber-400 pt-1">
              Winning Hand: <span className="underline decoration-amber-400">{primaryWinner.handName}</span>
            </p>
          )}
        </div>

        {/* Winning Cards Preview */}
        {primaryWinner?.cards && primaryWinner.cards.length > 0 && (
          <div className="bg-[#070b13] p-3 rounded-2xl border border-amber-500/30 flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-black">
              {isHumanWinner ? 'Your Winning Cards' : `${primaryWinner.nickname}'s Winning Cards`}
            </span>
            <div className="flex gap-2 justify-center">
              {primaryWinner.cards.map((c, i) => (
                <Card key={i} card={c} />
              ))}
            </div>
          </div>
        )}

        {/* All 4 Players Hand Comparison Table */}
        {(result.hands || []).length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block text-center">
              All 4 Players' Hands (Showdown)
            </span>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {result.hands!.map((h) => {
                const isWinner = winners.some((w) => w.userId === h.userId);
                return (
                  <div
                    key={h.userId}
                    className={`flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 border transition ${
                      isWinner
                        ? 'bg-amber-950/80 border-amber-500/80 shadow-md ring-2 ring-amber-400/50'
                        : 'bg-[#121a29] border-[#1e2a3f]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black truncate max-w-[120px] ${isWinner ? 'text-amber-300' : 'text-white'}`}>
                          {h.nickname}
                        </span>
                        {isWinner && (
                          <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase shadow">
                            👑 Winner
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold ${isWinner ? 'text-amber-400' : 'text-zinc-400'}`}>
                        {h.handName}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      {h.cards?.map((c, i) => (
                        <Card key={i} card={c} small />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Button: Play Next Round */}
        <div className="pt-2 text-center border-t border-white/10 space-y-2">
          {onClose && (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-black text-sm shadow-[0_0_25px_rgba(245,197,24,0.55)] active:scale-95 transition"
            >
              Play Next Round (Bet Again) ➔
            </button>
          )}
          <p className="text-[11px] text-amber-300 font-bold">
            Auto continuing to table in <span className="font-black text-white bg-black/60 px-1.5 py-0.5 rounded">{countdown}s</span>
          </p>
        </div>
      </div>
    </div>
  );
};
