// My bets list + bet management actions (undo / double / repeat / clear).

import React, { memo } from 'react';
import { PiArrowUUpLeftBold as Undo2, PiCopyFill as Copy, PiXBold as X } from 'react-icons/pi';
import type { PlacedBet } from './board/Board';
import { BET_LABELS, formatNumber } from '../utils/payouts';

interface MyBetsProps {
  bets: PlacedBet[];
  total: number;
  onRemove: (id: string) => void;
  onUndo: () => void;
  onDouble: () => void;
  onRepeat: () => void;
  onClear: () => void;
  disabled?: boolean;
  hasLastRound: boolean;
}

function numbersLabel(type: PlacedBet['type'], numbers: number[]): string {
  if (type === 'straight') return String(numbers[0]);
  if (type === 'split') return numbers.join(' / ');
  return `${numbers.length} numbers`;
}

const BetsInner = ({ bets, total, onRemove, onUndo, onDouble, onRepeat, onClear, disabled, hasLastRound }: MyBetsProps) => {
  if (bets.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-center text-dark-400 text-xs py-3">Tap the board to place chips</div>
        <div className="flex gap-2">
          <button onClick={onRepeat} disabled={disabled || !hasLastRound} className="flex-1 py-2 rounded-lg bg-dark-700 text-xs font-medium hover:bg-dark-600 disabled:opacity-40 transition">
            Repeat last
          </button>
          <button onClick={onUndo} disabled={disabled} className="flex-1 py-2 rounded-lg bg-dark-700 text-xs font-medium hover:bg-dark-600 disabled:opacity-40 transition">
            Undo
          </button>
        </div>
      </div>
    );
  }

  // Group by spot for compact display.
  const groups = new Map<string, PlacedBet[]>();
  for (const b of bets) {
    const key = `${b.type}:${b.numbers.slice().sort((a, b) => a - b).join(',')}`;
    const arr = groups.get(key) || [];
    arr.push(b);
    groups.set(key, arr);
  }

  return (
    <div className="space-y-1.5">
      {[...groups.entries()].map(([key, group]) => {
        const b = group[0];
        const chipTotal = group.reduce((s, x) => s + x.amount, 0);
        return (
          <div key={key} className="flex items-center justify-between bg-dark-800 rounded-lg px-3 py-2 border border-dark-700">
            <div>
              <p className="text-xs font-bold">{BET_LABELS[b.type]}</p>
              <p className="text-[10px] text-dark-400">
                {numbersLabel(b.type, b.numbers)} × {group.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-yellow-400">{formatNumber(chipTotal)}</span>
              <button onClick={() => group.forEach((g) => onRemove(g.id))} disabled={disabled} aria-label="Remove bet" className="text-dark-400 hover:text-red-400 text-xs px-1">
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-xs text-dark-300 px-1 pt-1">
        <span>Total bet</span>
        <span className="font-bold text-white">{formatNumber(total)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button onClick={onUndo} disabled={disabled} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-dark-700 text-[11px] font-medium hover:bg-dark-600 disabled:opacity-40 transition">
          <Undo2 size={12} /> Undo
        </button>
        <button onClick={onDouble} disabled={disabled} className="py-2 rounded-lg bg-dark-700 text-[11px] font-medium hover:bg-dark-600 disabled:opacity-40 transition">
          2× Double
        </button>
        <button onClick={onClear} disabled={disabled} className="py-2 rounded-lg bg-dark-700 text-[11px] font-medium hover:bg-red-900/50 disabled:opacity-40 transition">
          Clear
        </button>
      </div>
      <button onClick={onRepeat} disabled={disabled || !hasLastRound} className="w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-dark-700 text-[11px] font-medium hover:bg-dark-600 disabled:opacity-40 transition">
        <Copy size={12} /> Repeat last round
      </button>
    </div>
  );
};

export const MyBets = memo(BetsInner);
