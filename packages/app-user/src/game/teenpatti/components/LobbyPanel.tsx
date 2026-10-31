import type { TPLobbyState } from '../../../types/teenpatti';
import { DiamondIcon, CoinIcon } from '../../../components/ui/CurrencyIcon';

// Shown before joining: queue status, open tables, currency pick
export const LobbyPanel = ({
  lobby,
  currency,
  onCurrency,
  onJoin,
  onLeave,
  joined,
  busy,
}: {
  lobby: TPLobbyState | null;
  currency: 'diamond' | 'coin';
  onCurrency: (c: 'diamond' | 'coin') => void;
  onJoin: () => void;
  onLeave: () => void;
  joined: boolean;
  busy: boolean;
}) => {
  const current = lobby && lobby.currency === currency ? lobby : null;

  return (
    <div className="bg-[#0c121d] border border-[#1e2a3f] rounded-3xl p-5 space-y-4 shadow-xl text-white">
      <div className="text-center">
        <h2 className="text-xl font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
          Teen Patti 🎴
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Classic 3-card poker — 1 Real Player vs 3 Bots with Diamond betting!
        </p>
      </div>

      {/* Currency toggle (Diamond default) */}
      <div className="flex gap-1 bg-[#070b13] rounded-xl p-1 border border-white/5">
        {(['diamond', 'coin'] as const).map((c) => (
          <button
            key={c}
            onClick={() => onCurrency(c)}
            className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition ${
              currency === c
                ? c === 'coin'
                  ? 'bg-yellow-600 text-black'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {c === 'coin' ? <CoinIcon /> : <DiamondIcon />}
            {c === 'coin' ? 'Coin' : 'Diamond'}
          </button>
        ))}
      </div>

      {!joined ? (
        <>
          <button
            onClick={onJoin}
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:brightness-110 text-black font-black text-sm shadow-[0_0_20px_rgba(245,197,24,0.4)] active:scale-95 transition disabled:opacity-50"
          >
            {busy ? 'Entering Table…' : 'Play Now (vs 3 Bots)'}
          </button>
          {current && (
            <div className="space-y-1 text-xs text-zinc-400 text-center font-medium">
              <p>👥 Ready to play instantly</p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="text-center text-sm text-cyan-400 font-black animate-pulse">
            <p>Seating players at table…</p>
          </div>
          <button
            onClick={onLeave}
            disabled={busy}
            className="w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 text-xs font-black hover:bg-red-950/30 active:scale-95 transition disabled:opacity-50"
          >
            Leave
          </button>
        </div>
      )}

      <p className="text-[10px] text-zinc-500 text-center font-bold">
        Min boot 5 💎 • 100% Diamond Stakes & Net Pot Payouts
      </p>
    </div>
  );
};
