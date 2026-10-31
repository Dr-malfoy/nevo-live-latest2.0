import { useState } from 'react';
import type { TPTableState } from '../../../types/teenpatti';
import { DiamondIcon, CoinIcon } from '../../../components/ui/CurrencyIcon';

const QUICK_CHIPS = [10, 20, 50, 100, 500, 1000];

export const Controls = ({
  state,
  busy,
  onAct,
}: {
  state: TPTableState;
  busy: boolean;
  onAct: (action: 'fold' | 'call' | 'raise' | 'see' | 'show' | 'bet' | 'reset', amount?: number) => void;
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(50);
  const Ccy = state.currency === 'coin' ? CoinIcon : DiamondIcon;

  // Phase: Dealing cards
  if (state.phase === 'dealing') {
    return (
      <div className="bg-[#0c121d] border-2 border-cyan-500/40 rounded-2xl p-4 text-center shadow-[0_0_25px_rgba(6,182,212,0.25)] space-y-1.5 animate-pulse">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl animate-spin">🎴</span>
          <p className="text-sm font-black text-cyan-300 tracking-wide uppercase">
            Dealing cards to all 4 players...
          </p>
        </div>
        <p className="text-[11px] text-zinc-400 font-bold">
          Revealing cards & evaluating higher hand...
        </p>
      </div>
    );
  }

  // Phase: Showdown
  if (state.phase === 'showdown') {
    return (
      <div className="bg-[#0c121d] border-2 border-amber-500/50 rounded-2xl p-3.5 shadow-[0_0_25px_rgba(245,197,24,0.25)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
              Cards Revealed on Deck! 🎴
            </p>
          </div>
          <button
            onClick={() => onAct('reset')}
            disabled={busy}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-black font-black text-xs shadow-md transition active:scale-95"
          >
            Play Next Round ➔
          </button>
        </div>
      </div>
    );
  }

  // Phase: Betting (Ready to Place Bet & Play)
  const winMultiplier = selectedChip * 2;

  return (
    <div className="bg-[#0c121d] border-2 border-amber-500/40 rounded-2xl p-3.5 space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
      {/* Chip Selection Bar */}
      <div className="flex items-center justify-between gap-1.5 bg-[#070b13] p-1.5 rounded-xl border border-white/10 overflow-x-auto">
        <span className="text-[10px] font-black text-zinc-400 px-1 whitespace-nowrap">SELECT BET:</span>
        <div className="flex gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setSelectedChip(chip)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition active:scale-95 ${
                selectedChip === chip
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/40 ring-2 ring-white/80 scale-105'
                  : 'bg-[#141c2c] text-zinc-200 border border-white/5 hover:border-amber-400/40 hover:text-white'
              }`}
            >
              <Ccy className="w-3.5 h-3.5 text-cyan-400" />
              <span>{chip}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Bet & Deal Button */}
      <button
        onClick={() => onAct('bet', selectedChip)}
        disabled={busy}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:brightness-110 active:scale-98 transition shadow-[0_0_25px_rgba(245,197,24,0.45)] flex flex-col items-center justify-center border-2 border-white/40 disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎴</span>
          <span className="text-base font-black text-black tracking-wide">
            BET {selectedChip.toLocaleString()} 💎 & DEAL CARDS
          </span>
        </div>
        <span className="text-[11px] font-black text-black/80">
          Win 2X ({winMultiplier.toLocaleString()} 💎) on Higher Hand!
        </span>
      </button>
    </div>
  );
};
