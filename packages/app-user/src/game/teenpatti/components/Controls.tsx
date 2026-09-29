import { useMemo } from 'react';
import type { TPTableState } from '../../../types/teenpatti';

// Betting controls for the current player
export const Controls = ({
  state,
  busy,
  onAct,
}: {
  state: TPTableState;
  busy: boolean;
  onAct: (action: 'fold' | 'call' | 'raise' | 'see') => void;
}) => {
  const me = state.seats.find((s) => s.isYou);
  const isMyTurn = me && state.turnIndex === state.seats.indexOf(me) && state.phase === 'betting';

  const callAmount = useMemo(() => {
    if (!me) return 0;
    return Math.max(0, state.stake - me.roundContributed);
  }, [state.stake, me]);

  const raiseTarget = useMemo(() => {
    if (!me) return 0;
    // Blind raise = ~1.5x stake (rounded to even), seen raise = 2x
    const t = me.seen ? state.stake * 2 : Math.ceil((state.stake * 3) / 2 / 2) * 2;
    return Math.min(t, 100000);
  }, [state.stake, me]);

  const raiseCost = Math.max(0, raiseTarget - (me?.roundContributed || 0));

  if (!isMyTurn) {
    return (
      <div className="glass-card p-4 text-center">
        <p className="text-sm text-dark-400">
          {state.phase === 'betting' ? 'Waiting for other players…' : 'Place your bets when the round starts'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-dark-400">Your hand: {me?.seen ? 'Seen' : 'Blind'}</span>
        <span className="text-xs text-dark-400">Stake to match: <b className="text-white">{state.stake}</b></span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onAct('fold')}
          disabled={busy}
          className="py-3 rounded-xl bg-gradient-to-b from-red-600 to-red-700 text-white font-bold text-sm active:scale-95 transition disabled:opacity-50"
        >
          Fold
        </button>
        <button
          onClick={() => onAct('call')}
          disabled={busy}
          className="py-3 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 text-white font-bold text-sm active:scale-95 transition disabled:opacity-50"
        >
          Call {callAmount > 0 ? callAmount : ''}
        </button>
        <button
          onClick={() => onAct('raise')}
          disabled={busy}
          className="py-3 rounded-xl bg-gradient-to-b from-brand-primary to-purple-700 text-white font-bold text-sm active:scale-95 transition disabled:opacity-50"
        >
          Raise {raiseCost > 0 ? raiseCost : ''}
        </button>
      </div>

      {!me?.seen && (
        <button
          onClick={() => onAct('see')}
          disabled={busy}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-brand-accent text-white font-bold text-sm active:scale-95 transition disabled:opacity-50"
        >
          👁 See cards (then play seen)
        </button>
      )}

      <div className="flex items-center justify-between text-[10px] text-dark-500">
        <span>Raises: {state.raises}/4</span>
        <span>Raise max: 100,000</span>
      </div>
    </div>
  );
};
