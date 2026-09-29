// Full European betting board — all 13 bet types via generated hotspots.

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { RouletteBetType } from '../../../../types/roulette';
import { colorOfNumber } from '../../utils/wheel';
import { BOARD, GRID_W, GRID_H, generateSpots, unitPct, Spot } from './geometry';
import { ChipStack } from './ChipStack';

export interface PlacedBet {
  id: string;
  type: RouletteBetType;
  numbers: number[];
  amount: number;
}

interface BoardProps {
  bets: PlacedBet[];
  onCellClick: (type: RouletteBetType, numbers: number[], key: string) => void;
  disabled?: boolean;
  cursor: number | null; // keyboard cursor (straight-number cell index)
}

const CELL_CLASS: Record<string, string> = {
  red: 'bg-gradient-to-b from-red-600 to-red-800',
  black: 'bg-gradient-to-b from-zinc-700 to-zinc-900',
  green: 'bg-gradient-to-b from-emerald-600 to-emerald-800',
};

const HOTSPOT_STYLE: React.CSSProperties = {
  position: 'absolute',
  borderRadius: '4px',
  transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
  WebkitTapHighlightColor: 'transparent',
};

const BoardInner = ({ bets, onCellClick, disabled, cursor }: BoardProps) => {
  const spots = useMemo(() => generateSpots(), []);
  const betsBySpot = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const b of bets) {
      const key = b.type + ':' + b.numbers.slice().sort((a, b) => a - b).join(',');
      const arr = m.get(key) || [];
      arr.push(b.amount);
      m.set(key, arr);
    }
    return m;
  }, [bets]);

  // Cell index order matches BOARD row-major for the keyboard cursor.
  const numberCellIndex = (r: number, c: number) => r * 12 + c;

  const renderSpot = (spot: Spot) => {
    const values = betsBySpot.get(spot.key) || [];
    const style: React.CSSProperties = {
      ...HOTSPOT_STYLE,
      ...unitPct(spot.x, spot.y, spot.w, spot.h),
    };

    return (
      <motion.button
        key={spot.key}
        type="button"
        aria-label={spot.aria}
        aria-pressed={values.length > 0}
        disabled={disabled}
        style={style}
        onClick={() => onCellClick(spot.type, spot.numbers, spot.key)}
        className="group pointer-events-auto"
        whileTap={disabled ? undefined : { scale: 0.95 }}
      >
        <span className="absolute inset-0 rounded-[4px] bg-white/0 group-hover:bg-white/15 transition-colors" />
        {values.length > 0 && <ChipStack values={values} />}
      </motion.button>
    );
  };

  const zeroStyle = unitPct(0.5, 1.5, 1, 3);
  const zeroValues = betsBySpot.get('straight:0') || [];

  return (
    <div className="rounded-xl overflow-hidden border border-dark-700 bg-dark-800 shadow-xl relative select-none" style={{ aspectRatio: `${GRID_W} / ${GRID_H}` }}>
      {/* Base layout — zero column + number grid + outside */}
      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(14, 1fr)', gridTemplateRows: 'repeat(5, 1fr)' }}>
        {/* Zero */}
        <button
          type="button"
          aria-label="0 green, straight"
          onClick={() => onCellClick('straight', [0], 'straight:0')}
          disabled={disabled}
          className={`relative col-start-1 row-start-1 row-span-3 flex items-center justify-center text-white font-bold text-sm ${CELL_CLASS.green} hover:brightness-110 transition`}
        >
          0
          {zeroValues.length > 0 && <ChipStack values={zeroValues} />}
        </button>

        {/* Number grid */}
        {BOARD.map((row, r) =>
          row.map((n, c) => {
            const key = `straight:${n}`;
            const values = betsBySpot.get(key) || [];
            const cellCursor = cursor === numberCellIndex(r, c);
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} ${colorOfNumber(n)}, straight`}
                aria-pressed={values.length > 0}
                onClick={() => onCellClick('straight', [n], key)}
                disabled={disabled}
                className={`relative flex items-center justify-center text-white font-semibold text-xs ${CELL_CLASS[colorOfNumber(n)]} hover:brightness-110 transition ${
                  cellCursor ? 'ring-2 ring-yellow-300 z-20' : ''
                }`}
                style={{ gridColumn: c + 2, gridRow: r + 1 }}
              >
                {n}
                {values.length > 0 && <ChipStack values={values} />}
              </button>
            );
          })
        )}

        {/* Right 2:1 columns */}
        {[0, 1, 2].map((c) => {
          const nums = c === 0 ? Array.from({ length: 12 }, (_, i) => 3 + i * 3) : c === 1 ? Array.from({ length: 12 }, (_, i) => 2 + i * 3) : Array.from({ length: 12 }, (_, i) => 1 + i * 3);
          const key = `column:${nums.join(',')}`;
          const values = betsBySpot.get(key) || [];
          return (
            <button
              key={c}
              type="button"
              aria-label={`2 to 1 column ${c + 1}`}
              onClick={() => onCellClick('column', nums, key)}
              disabled={disabled}
              className="relative flex items-center justify-center text-[10px] font-bold text-dark-200 bg-dark-700 hover:bg-dark-600 transition"
              style={{ gridColumn: 14, gridRow: c + 1 }}
            >
              2:1
              {values.length > 0 && <ChipStack values={values} />}
            </button>
          );
        })}

        {/* Outside row 1 */}
        {[
          { label: '1st 12', type: 'dozen' as RouletteBetType, nums: Array.from({ length: 12 }, (_, i) => i + 1), cls: 'text-dark-200' },
          { label: '2nd 12', type: 'dozen' as RouletteBetType, nums: Array.from({ length: 12 }, (_, i) => i + 13), cls: 'text-dark-200' },
          { label: '3rd 12', type: 'dozen' as RouletteBetType, nums: Array.from({ length: 12 }, (_, i) => i + 25), cls: 'text-dark-200' },
          { label: '1-18', type: 'low' as RouletteBetType, nums: Array.from({ length: 18 }, (_, i) => i + 1), cls: 'text-dark-200' },
          { label: 'EVEN', type: 'even' as RouletteBetType, nums: Array.from({ length: 18 }, (_, i) => (i + 1) * 2), cls: 'text-dark-200' },
          { label: 'RED', type: 'red' as RouletteBetType, nums: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36], cls: 'text-red-400' },
        ].map((s, i) => {
          const key = `dozen:${s.nums.join(',')}`;
          const values = betsBySpot.get(key) || [];
          return (
            <button
              key={i}
              type="button"
              aria-label={`${s.label}`}
              onClick={() => onCellClick(s.type, s.nums, key)}
              disabled={disabled}
              className={`relative flex items-center justify-center text-[10px] font-bold bg-dark-700 hover:bg-dark-600 transition ${s.cls}`}
              style={{ gridColumn: i * 2 + 1, gridRow: 4, gridColumnEnd: i * 2 + 3 }}
            >
              {s.label}
              {values.length > 0 && <ChipStack values={values} />}
            </button>
          );
        })}

        {/* Outside row 2 */}
        {[
          { label: '2:1', type: 'column' as RouletteBetType, nums: Array.from({ length: 12 }, (_, i) => 3 + i * 3), cls: 'text-dark-200' },
          { label: '2:1', type: 'column' as RouletteBetType, nums: Array.from({ length: 12 }, (_, i) => 2 + i * 3), cls: 'text-dark-200' },
          { label: '2:1', type: 'column' as RouletteBetType, nums: Array.from({ length: 12 }, (_, i) => 1 + i * 3), cls: 'text-dark-200' },
          { label: '19-36', type: 'high' as RouletteBetType, nums: Array.from({ length: 18 }, (_, i) => i + 19), cls: 'text-dark-200' },
          { label: 'ODD', type: 'odd' as RouletteBetType, nums: Array.from({ length: 18 }, (_, i) => i * 2 + 1), cls: 'text-dark-200' },
          { label: 'BLACK', type: 'black' as RouletteBetType, nums: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35], cls: 'text-zinc-300' },
        ].map((s, i) => {
          const key = `column:${s.nums.join(',')}`;
          const values = betsBySpot.get(key) || [];
          return (
            <button
              key={i}
              type="button"
              aria-label={`${s.label}`}
              onClick={() => onCellClick(s.type, s.nums, key)}
              disabled={disabled}
              className={`relative flex items-center justify-center text-[10px] font-bold bg-dark-700 hover:bg-dark-600 transition ${s.cls}`}
              style={{ gridColumn: i * 2 + 1, gridRow: 5, gridColumnEnd: i * 2 + 3 }}
            >
              {s.label}
              {values.length > 0 && <ChipStack values={values} />}
            </button>
          );
        })}
      </div>

      {/* Hotspot overlay — splits / streets / corners / sixlines.
          pointer-events-none lets taps fall through to the base cells below;
          the hotspot buttons re-enable pointer events on themselves. */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {spots
          .filter((s) => s.kind === 'split' || s.kind === 'street' || s.kind === 'corner' || s.kind === 'sixline')
          .map(renderSpot)}
      </div>
    </div>
  );
};

export const Board = memo(BoardInner);
