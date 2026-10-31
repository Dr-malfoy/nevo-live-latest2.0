import { useMemo } from 'react';
import type { TPTableState } from '../../../types/teenpatti';
import { PlayerSeat } from './PlayerSeat';

const DEFAULT_OPPONENTS: any[] = [
  {
    userId: 'bd_bot_1',
    nickname: 'Tanvir Ahmed',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
    cards: [],
    seen: false,
    folded: false,
    active: true,
    roundContributed: 0,
    sessionContributed: 0,
    connected: true,
    isBot: false,
    isYou: false,
  },
  {
    userId: 'bd_bot_2',
    nickname: 'Sadia Islam',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces',
    cards: [],
    seen: false,
    folded: false,
    active: true,
    roundContributed: 0,
    sessionContributed: 0,
    connected: true,
    isBot: false,
    isYou: false,
  },
  {
    userId: 'bd_bot_3',
    nickname: 'Arafat Hossain',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces',
    cards: [],
    seen: false,
    folded: false,
    active: true,
    roundContributed: 0,
    sessionContributed: 0,
    connected: true,
    isBot: false,
    isYou: false,
  },
];

export const Table = ({
  state,
  onSeeCards,
}: {
  state: TPTableState;
  onSeeCards?: () => void;
}) => {
  // Find human player seat ("You") and place them at the bottom
  const { me, leftBot, topBot, rightBot } = useMemo(() => {
    const userSeat = state.seats.find((s) => s.isYou) || state.seats[0];
    const others = state.seats.filter((s) => s !== userSeat);
    return {
      me: userSeat,
      leftBot: others[0] || DEFAULT_OPPONENTS[0],
      topBot: others[1] || DEFAULT_OPPONENTS[1],
      rightBot: others[2] || DEFAULT_OPPONENTS[2],
    };
  }, [state.seats]);

  const activeTurnSeat = state.seats[state.turnIndex];
  const isMyTurn = activeTurnSeat && activeTurnSeat.isYou && state.phase === 'betting';

  // Status banner text
  const statusInfo = useMemo(() => {
    if (state.phase === 'dealing') {
      return { text: '🎲 DEALING CARDS...', cls: 'text-cyan-300 animate-pulse bg-cyan-950/90 border-cyan-500/60 shadow-lg' };
    }
    if (state.phase === 'showdown') {
      return { text: '🏆 SHOWDOWN! REVEALING HANDS', cls: 'text-amber-300 bg-amber-950/90 border-amber-500/70 shadow-lg animate-bounce' };
    }
    if (state.phase === 'betting') {
      return { text: '🔥 SELECT BET • WIN 2X ON HIGHER HAND', cls: 'text-amber-300 bg-black/80 border-amber-500/50 shadow' };
    }
    return { text: 'READY TO PLAY', cls: 'text-zinc-400 bg-zinc-900/80 border-zinc-700/50' };
  }, [state.phase]);

  return (
    <div
      className="relative w-full rounded-[2.5rem] border-[4px] border-[#c89b3c] shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_80px_rgba(0,0,0,0.8)] overflow-hidden transition-all select-none"
      style={{
        height: 'min(76vh, 540px)',
        background: 'radial-gradient(ellipse at 50% 40%, #155533 0%, #0c331f 65%, #051b10 100%)',
      }}
    >
      {/* Felt cloth texture pattern */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      />
      {/* Table inner rim gold line */}
      <div className="absolute inset-2.5 rounded-[2.2rem] border border-amber-500/25 pointer-events-none" />

      {/* Center Table Status (Anchored high enough to prevent bottom player overlap) */}
      <div className="absolute left-1/2 top-[32%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-10 pointer-events-none">
        {/* Phase / Status Banner */}
        <div className={`px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider uppercase border ${statusInfo.cls}`}>
          {statusInfo.text}
        </div>
      </div>

      {/* Top Seat: Priya (Bot) */}
      {topBot && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10">
          <PlayerSeat
            seat={topBot}
            isTurn={state.phase === 'betting' && state.seats[state.turnIndex] === topBot}
            turnDeadline={state.turnDeadline}
            currency={state.currency}
            showCards={state.phase === 'showdown'}
          />
        </div>
      )}

      {/* Left Seat: Rohan (Bot) */}
      {leftBot && (
        <div className="absolute left-2 sm:left-4 top-[38%] -translate-y-1/2 z-10">
          <PlayerSeat
            seat={leftBot}
            isTurn={state.phase === 'betting' && state.seats[state.turnIndex] === leftBot}
            turnDeadline={state.turnDeadline}
            currency={state.currency}
            showCards={state.phase === 'showdown'}
          />
        </div>
      )}

      {/* Right Seat: Vikram (Bot) */}
      {rightBot && (
        <div className="absolute right-2 sm:right-4 top-[38%] -translate-y-1/2 z-10">
          <PlayerSeat
            seat={rightBot}
            isTurn={state.phase === 'betting' && state.seats[state.turnIndex] === rightBot}
            turnDeadline={state.turnDeadline}
            currency={state.currency}
            showCards={state.phase === 'showdown'}
          />
        </div>
      )}

      {/* Bottom Seat: YOU (Human Player) */}
      {me && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <PlayerSeat
            seat={me}
            isTurn={isMyTurn}
            turnDeadline={state.turnDeadline}
            currency={state.currency}
            showCards={state.phase === 'showdown' || me.seen}
            isBottom
            onSeeCards={onSeeCards}
          />
        </div>
      )}
    </div>
  );
};
