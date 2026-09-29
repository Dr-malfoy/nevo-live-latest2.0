// Keyboard betting: arrow keys move a cursor across board cells, Enter bets,
// Escape clears the cursor. Returns cursor index + handlers.

import { useCallback, useEffect, useState } from 'react';

export const BOARD_COLS = 12;
export const BOARD_ROWS = 3;

export function useKeyboardBetting(totalCells: number, enabled: boolean, onBet: (cellIndex: number) => void) {
  const [cursor, setCursor] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCursor(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCursor(null);
        return;
      }
      let next = cursor;
      if (e.key === 'ArrowUp') next = cursor === null ? 0 : Math.max(0, cursor - BOARD_COLS);
      else if (e.key === 'ArrowDown') next = cursor === null ? 0 : Math.min(totalCells - 1, cursor + BOARD_COLS);
      else if (e.key === 'ArrowLeft') next = cursor === null ? 0 : Math.max(0, cursor - 1);
      else if (e.key === 'ArrowRight') next = cursor === null ? 0 : Math.min(totalCells - 1, cursor + 1);
      else if (e.key === 'Enter' && cursor !== null) onBet(cursor);
      if (next !== cursor) setCursor(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, cursor, totalCells, onBet]);

  return { cursor, setCursor, clear: () => setCursor(null) };
}
