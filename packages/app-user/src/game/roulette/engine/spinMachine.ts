// Client-side spin state machine — derived from server roulette:state.
// IDLE → BETTING → NO_MORE_BETS → SPINNING → BALL_ROLLING → WINNING_HIGHLIGHT → PAYOUT → RESET

export type SpinPhase =
  | 'IDLE'
  | 'BETTING'
  | 'NO_MORE_BETS'
  | 'SPINNING'
  | 'BALL_ROLLING'
  | 'WINNING_HIGHLIGHT'
  | 'PAYOUT'
  | 'RESET';

export interface SpinState {
  phase: SpinPhase;
  roundNumber: number;
  winningIndex: number | null;
  endsAt: number;
  liveBetCount: number;
  hash: string | null;
}

export type ServerPhase = 'betting' | 'spinning';

/**
 * Map the server's two-phase state into the richer client FSM.
 * Transitions:
 * - betting → BETTING
 * - spinning, no winningIndex yet → NO_MORE_BETS
 * - spinning + winningIndex, wheel anim → SPINNING (client advances to
 *   BALL_ROLLING after the wheel reaches target, then WINNING_HIGHLIGHT,
 *   PAYOUT, RESET when a new betting round arrives).
 */
export function deriveSpinState(
  serverPhase: ServerPhase | undefined,
  roundNumber: number,
  winningIndex: number | null,
  endsAt: number,
  liveBetCount: number,
  hash: string | null,
  prev: SpinState | null
): SpinState {
  const base: SpinState = {
    phase: 'IDLE',
    roundNumber,
    winningIndex,
    endsAt,
    liveBetCount,
    hash,
  };

  if (!serverPhase) {
    base.phase = 'IDLE';
    return base;
  }

  if (serverPhase === 'betting') {
    // A fresh betting window always resets the wheel state.
    base.phase = 'BETTING';
    base.winningIndex = null;
    return base;
  }

  // serverPhase === 'spinning'
  if (winningIndex === null) {
    base.phase = 'NO_MORE_BETS';
    return base;
  }

  // We have a winning pocket — the wheel must spin to it.
  if (!prev || prev.roundNumber !== roundNumber || prev.phase === 'RESET') {
    base.phase = 'SPINNING';
    return base;
  }

  // Same round we've already animated: keep the deepest phase reached.
  base.phase = prev.phase;
  return base;
}
