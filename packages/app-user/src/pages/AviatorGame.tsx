import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft } from 'react-icons/pi';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores';
import { useAviator, AviatorProvider } from '../game/aviator/context';
import { FlightCanvas, BetPanel, HistoryPanel, BetsHistory, ResultToast } from '../game/aviator/components';
import '../game/aviator/index.scss';

const AviatorScreen = () => {
  const navigate = useNavigate();
  const { user, fetchProfile, updateUser } = useAuthStore();
  const game = useAviator();

  const [activeBets, setActiveBets] = useState<{
    bet1: { betId: string; amount: number } | null;
    bet2: { betId: string; amount: number } | null;
  }>({ bet1: null, bet2: null });

  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Sync fresh profile & balance on entering game
  useEffect(() => {
    fetchProfile().catch(() => {});
  }, [fetchProfile]);

  // Join the shared flight room as soon as connected
  useEffect(() => {
    if (game.connected) game.join();
  }, [game.connected]);

  // Track whether we have live bets in the current round
  useEffect(() => {
    if (game.state?.phase === 'BET') {
      setActiveBets({ bet1: null, bet2: null });
      setHistoryRefreshKey((k) => k + 1);
    }
  }, [game.state?.phase, game.state?.roundNumber]);

  useEffect(() => {
    if (game.result) {
      setHistoryRefreshKey((k) => k + 1);
      fetchProfile().catch(() => {});
    }
  }, [game.result, fetchProfile]);

  const phase = game.state?.phase ?? 'BET';
  const balance = Math.floor(user?.diamonds ?? 0);

  const handleBetPlaced1 = (betId: string, amount: number) => {
    setActiveBets((prev) => ({ ...prev, bet1: { betId, amount } }));
    setHistoryRefreshKey((k) => k + 1);
    fetchProfile().catch(() => {});
  };

  const handleBetPlaced2 = (betId: string, amount: number) => {
    setActiveBets((prev) => ({ ...prev, bet2: { betId, amount } }));
    setHistoryRefreshKey((k) => k + 1);
    fetchProfile().catch(() => {});
  };

  const handleCashOut1 = (betId: string) => {
    game.cashOut(betId, (res: any) => {
      setActiveBets((prev) => ({ ...prev, bet1: null }));
      setHistoryRefreshKey((k) => k + 1);
      if (res?.success && typeof res?.balance === 'number') {
        updateUser({ diamonds: res.balance });
      } else {
        fetchProfile().catch(() => {});
      }
    });
  };

  const handleCashOut2 = (betId: string) => {
    game.cashOut(betId, (res: any) => {
      setActiveBets((prev) => ({ ...prev, bet2: null }));
      setHistoryRefreshKey((k) => k + 1);
      if (res?.success && typeof res?.balance === 'number') {
        updateUser({ diamonds: res.balance });
      } else {
        fetchProfile().catch(() => {});
      }
    });
  };

  const myCashOuts = useMemo(() => {
    const r = game.result;
    if (!r) return [];
    return r.results.filter((b) => b.userId === user?._id && b.status === 'cashed_out');
  }, [game.result, user?._id]);

  return (
    <div className="min-h-screen bg-black text-white pb-6">
      <ToastContainer theme="dark" position="top-center" />

      {/* Top bar */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 sticky top-0 z-20 bg-black/95 backdrop-blur-xl">
        <button onClick={() => { game.leave(); navigate(-1); }}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold flex-1">Fly High</h1>

        {/* Diamond Balance Badge (Pure Integer) */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 shadow-sm shadow-cyan-900/40">
          <span className="text-base leading-none">💎</span>
          <span className="text-sm font-black tracking-tight">{balance.toLocaleString()}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 opacity-90 hidden xs:inline">Diamonds</span>
        </div>
      </div>

      {/* Round status strip */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-end text-xs text-dark-300">
          {!game.state ? (
            <span className="text-dark-400 font-medium">Syncing…</span>
          ) : phase === 'PLAYING' ? (
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
              Flying at {game.state.multiplier.toFixed(2)}x
            </span>
          ) : phase === 'CRASHED' ? (
            <span className="text-red-400 font-bold">Crashed at {game.state.crashPoint?.toFixed(2)}x</span>
          ) : (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Place your bets
            </span>
          )}
        </div>
      </div>

      {/* Top Recent Rounds Strip (Classic Aviator multiplier bar) */}
      {game.history && game.history.length > 0 && (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {game.history.slice(0, 15).map((h) => {
              const isHigh = h.crashPoint >= 10.0;
              const isMidHigh = h.crashPoint >= 2.0;
              const isLowMid = h.crashPoint >= 1.5;

              const badgeColor = isHigh
                ? 'bg-rose-600/90 border-rose-400 text-rose-100'
                : isMidHigh
                ? 'bg-amber-600/90 border-amber-400 text-amber-100'
                : isLowMid
                ? 'bg-purple-600/90 border-purple-400 text-purple-100'
                : 'bg-blue-600/90 border-blue-400 text-blue-100';

              return (
                <span
                  key={h.roundNumber}
                  className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black border shadow-sm select-none ${badgeColor}`}
                  title={`Round #${h.roundNumber}: ${h.crashPoint.toFixed(2)}x`}
                >
                  {h.crashPoint.toFixed(2)}x
                </span>
              );
            })}
          </div>
        </div>
      )}

      <FlightCanvas state={game.state} />

      <div className="p-3 space-y-3">
        {/* Dual Bet Control Section (Phone responsive, 2nd picture style, Green button) */}
        <BetPanel
          phase={game.state ? phase : null}
          balance={balance}
          activeBets={activeBets}
          onBetPlaced1={handleBetPlaced1}
          onBetPlaced2={handleBetPlaced2}
          onCashOut1={handleCashOut1}
          onCashOut2={handleCashOut2}
        />

        {/* Previous Rounds Multiplier Pills */}
        <HistoryPanel history={game.history} />

        {/* My Bets History Table */}
        <BetsHistory triggerRefresh={historyRefreshKey} />
      </div>

      {/* Result toast */}
      {game.result && myCashOuts.length > 0 && <ResultToast result={game.result} userId={user?._id} />}

      {/* Recharge prompt */}
      {game.rechargeNeeded && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121216] border border-white/15 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center justify-center mx-auto text-2xl">
              💎
            </div>
            <p className="font-black text-lg">Insufficient Diamonds</p>
            <p className="text-sm text-dark-300">Recharge your diamonds to keep playing Fly High.</p>
            <button
              onClick={() => { game.setRechargeNeeded(false); navigate('/recharge'); }}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-sm font-bold text-white shadow-lg shadow-cyan-900/30 transition-all"
            >Recharge Diamonds</button>
            <button onClick={() => game.setRechargeNeeded(false)} className="text-xs font-semibold text-dark-400 hover:text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AviatorGame = () => (
  <AviatorProvider>
    <AviatorScreen />
  </AviatorProvider>
);

export default AviatorGame;
