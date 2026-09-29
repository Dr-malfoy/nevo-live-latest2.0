import type { TPTableState, TPSeat } from '../../../types/teenpatti';
import { PlayerSeat } from './PlayerSeat';
import { CoinIcon, DiamondIcon } from '../../../components/ui/CurrencyIcon';

const seatPositions = (n: number) => {
  // Your seat is always index 0 (bottom-center). Others arc around it.
  switch (n) {
    case 3:
      return ['bottom', 'left', 'right'];
    case 4:
      return ['bottom', 'left', 'top', 'right'];
    case 5:
      return ['bottom', 'left', 'top-left', 'top-right', 'right'];
    case 6:
      return ['bottom', 'left', 'top-left', 'top', 'top-right', 'right'];
    default:
      return Array.from({ length: n }, (_, i) => (i === 0 ? 'bottom' : i % 2 ? 'left' : 'right'));
  }
};

const positionClass: Record<string, string> = {
  bottom: 'absolute left-1/2 -translate-x-1/2 bottom-0',
  left: 'absolute left-0 top-1/2 -translate-y-1/2',
  right: 'absolute right-0 top-1/2 -translate-y-1/2',
  top: 'absolute left-1/2 -translate-x-1/2 top-0',
  'top-left': 'absolute left-4 top-2',
  'top-right': 'absolute right-4 top-2',
};

const phaseBanner: Record<string, { text: string; cls: string }> = {
  lobby: { text: 'Waiting for players…', cls: 'text-amber-300' },
  countdown: { text: 'Round starting…', cls: 'text-brand-accent' },
  betting: { text: 'Betting open', cls: 'text-emerald-300' },
  showdown: { text: 'Showdown!', cls: 'text-pink-400' },
};

// The felt table: seats around, pot in the middle
export const Table = ({ state }: { state: TPTableState }) => {
  const positions = seatPositions(state.seats.length || 3);
  const Ccy = state.currency === 'coin' ? CoinIcon : DiamondIcon;
  const banner = phaseBanner[state.phase] || phaseBanner.lobby;

  return (
    <div className="relative w-full rounded-[2rem] border border-brand-primary/40 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
      style={{
        height: 'min(78vh, 560px)',
        background: 'radial-gradient(ellipse at 50% 35%, #1b5e3a 0%, #0f3d24 55%, #082b19 100%)',
      }}
    >
      {/* Felt texture + vignette */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Center pot */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
        <div className="glass-pill px-4 py-2 flex items-center gap-2">
          <Ccy className="w-4 h-4" />
          <span className="text-xl font-black text-white">{state.pot.toLocaleString()}</span>
        </div>
        <span className="text-[10px] text-white/60 font-semibold tracking-wider">POT</span>
      </div>

      {/* Phase banner */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <span className={`text-xs font-bold tracking-widest uppercase ${banner.cls}`}>{banner.text}</span>
      </div>

      {/* Round number */}
      {state.roundNumber > 0 && (
        <div className="absolute bottom-2 right-3 z-10">
          <span className="text-[10px] text-white/40 font-semibold">Round #{state.roundNumber}</span>
        </div>
      )}

      {/* Seats */}
      {state.seats.map((seat, i) => {
        const pos = positions[i] || 'bottom';
        const isTurn = state.phase === 'betting' && state.turnIndex === i;
        return (
          <div key={seat.userId + i} className={`absolute z-10 ${positionClass[pos]}`}>
            <PlayerSeat
              seat={seat}
              isTurn={isTurn}
              turnDeadline={state.turnDeadline}
              currency={state.currency}
              showCards={state.phase === 'showdown' || isTurn}
            />
          </div>
        );
      })}

      {/* Empty seats */}
      {state.seats.length < 6 && (
        <div className="absolute bottom-1 right-1/2 translate-x-1/2 z-0">
          <span className="text-[10px] text-white/30">{6 - state.seats.length} open</span>
        </div>
      )}
    </div>
  );
};
