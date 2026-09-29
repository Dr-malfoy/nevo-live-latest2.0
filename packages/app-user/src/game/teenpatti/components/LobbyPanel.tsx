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
    <div className="glass-card p-5 space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-black text-gradient">Teen Patti</h2>
        <p className="text-xs text-dark-400 mt-1">Classic 3-card poker — join a table and beat the other players!</p>
      </div>

      {/* Currency toggle */}
      <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
        {(['diamond', 'coin'] as const).map((c) => (
          <button
            key={c}
            onClick={() => onCurrency(c)}
            className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 ${currency === c ? (c === 'coin' ? 'bg-yellow-600' : 'bg-primary-600') : 'text-dark-400'}`}
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
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-primary via-purple-600 to-brand-secondary text-white font-black text-base btn-glow active:scale-95 transition disabled:opacity-50"
          >
            {busy ? 'Joining…' : 'Join Table'}
          </button>
          {current && (
            <div className="space-y-1 text-xs text-dark-400">
              <p>👥 {current.inQueue} players waiting in queue</p>
              {current.tables.length > 0 && (
                <p>🃏 {current.tables.length} active table{current.tables.length > 1 ? 's' : ''} ({current.tables.reduce((a, t) => a + t.players, 0)} players seated)</p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="text-center text-sm text-brand-accent font-bold animate-pulse">
            <p>Searching for players…</p>
            <p className="text-xs text-dark-400 mt-1">You'll be seated as soon as a table has room</p>
          </div>
          <button
            onClick={onLeave}
            disabled={busy}
            className="w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 text-sm font-bold active:scale-95 transition disabled:opacity-50"
          >
            Leave
          </button>
        </div>
      )}

      <p className="text-[10px] text-dark-500 text-center">
        Min boot 5 • Stake 1–100,000 • House takes 3% of the pot
      </p>
    </div>
  );
};
