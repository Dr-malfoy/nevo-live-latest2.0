import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiAirplaneFill as Plane, PiDiceFiveFill as Dices, PiCircleFill as CircleDot } from 'react-icons/pi';
import { useStreamStore } from '../stores';
import { StreamCard } from '../components/stream';
import { Loading } from '../components/ui';
import { DiamondIcon } from '../components/ui/CurrencyIcon';

export const GameHub = () => {
  const navigate = useNavigate();
  const { streams, isLoading, fetchStreams } = useStreamStore();

  useEffect(() => {
    fetchStreams('newest', 'game');
  }, []);

  const gameStreams = streams.filter((s) => s.type === 'game' || s.category === 'game');

  return (
    <div className="pb-20">
      <div className="p-4 border-b border-line">
        <h1 className="text-lg font-bold">Game Hub</h1>
        <p className="text-xs text-ink-muted mt-1">Play games & watch gaming streams</p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Aviator */}
          <button
            onClick={() => navigate('/game/aviator')}
            className="relative h-[120px] rounded-2xl p-3.5 text-left flex flex-col justify-between overflow-hidden shadow-md active:scale-95 transition-all text-white bg-gradient-to-br from-[#FF416C] to-[#FF4B2B]"
          >
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 inline-block mb-1">
                HOT 🚀
              </span>
              <p className="text-base font-bold leading-tight drop-shadow-sm">Aviator</p>
              <p className="text-[11px] text-white/80 mt-0.5">Crash Game</p>
            </div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white shadow-sm">
                PLAY
              </span>
            </div>
            <Plane className="absolute -bottom-2 -right-2 w-16 h-16 text-white/30 pointer-events-none" />
          </button>

          {/* 3 Patti */}
          <button
            onClick={() => navigate('/game/teenpatti')}
            className="relative h-[120px] rounded-2xl p-3.5 text-left flex flex-col justify-between overflow-hidden shadow-md active:scale-95 transition-all text-white bg-gradient-to-br from-[#11998E] to-[#38EF7D]"
          >
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 inline-block mb-1">
                POPULAR ♠️
              </span>
              <p className="text-base font-bold leading-tight drop-shadow-sm">3 Patti</p>
              <p className="text-[11px] text-white/80 mt-0.5">3-Card Poker</p>
            </div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white shadow-sm">
                PLAY
              </span>
            </div>
            <Dices className="absolute -bottom-2 -right-2 w-16 h-16 text-white/30 pointer-events-none" />
          </button>

          {/* Roulette */}
          <button
            onClick={() => navigate('/game/roulette')}
            className="relative h-[120px] rounded-2xl p-3.5 text-left flex flex-col justify-between overflow-hidden shadow-md active:scale-95 transition-all text-white bg-gradient-to-br from-[#8E2DE2] to-[#4A00E0] col-span-2"
          >
            <div className="flex justify-between items-start z-10">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 inline-block mb-1">
                  NEW 🎰
                </span>
                <p className="text-lg font-bold leading-tight drop-shadow-sm">Roulette</p>
                <p className="text-xs text-white/80 mt-0.5">Spin the wheel & win big rewards</p>
              </div>
              <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-white text-black shadow-md shrink-0">
                PLAY
              </span>
            </div>
            <CircleDot className="absolute -bottom-4 -right-4 w-20 h-20 text-white/25 pointer-events-none" />
          </button>
        </div>

        <h2 className="text-sm font-medium text-ink-muted mb-3">Live Gaming Streams</h2>

        {isLoading ? (
          <Loading className="pt-10" />
        ) : gameStreams.length === 0 ? (
          <div className="text-center pt-10 text-ink-muted">
            <p className="text-lg mb-1">No game streams live</p>
            <p className="text-sm">Start a gaming stream!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {gameStreams.map((stream) => (
              <StreamCard key={stream._id} stream={stream} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
