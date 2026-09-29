import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft } from 'react-icons/pi';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores';
import { useAviator, AviatorProvider } from '../game/aviator/context';
import { FlightCanvas, BetPanel, LiveBets, HistoryPanel, ResultToast } from '../game/aviator/components';
import '../game/aviator/index.scss';

const AviatorScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const game = useAviator();

  const [currency, setCurrency] = useState<'diamond' | 'coin'>('diamond');
  const [activeBetId, setActiveBetId] = useState<string | null>(null);

  // Join the shared flight room as soon as connected
  useEffect(() => {
    if (game.connected) game.join();
  }, [game.connected]);

  // Track whether we have a live bet in the current round
  useEffect(() => {
    if (game.state?.phase === 'BET') setActiveBetId(null);
  }, [game.state?.phase, game.state?.roundNumber]);

  const phase = game.state?.phase ?? 'BET';
  const flying = phase === 'PLAYING';
  const balance = currency === 'coin' ? (user?.coins ?? 0) : (user?.diamonds ?? 0);

  const handleBet = (betId: string) => {
    setActiveBetId(betId);
  };

  const myCashOuts = useMemo(() => {
    const r = game.result;
    if (!r) return [];
    return r.results.filter((b) => b.userId === user?._id && b.status === 'cashed_out');
  }, [game.result, user?._id]);

  return (
    <div className="min-h-screen bg-dark-950 pb-6">
      <ToastContainer theme="dark" position="top-center" />

      {/* Top bar */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-800 sticky top-0 z-20 bg-dark-950/90 backdrop-blur-xl">
        <button onClick={() => { game.leave(); navigate(-1); }}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold flex-1">Aviator</h1>
        {/* Balance Badge with dynamic Diamond (Cyan) and Coin (Gold) color */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 ${
          currency === 'diamond'
            ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-900/30'
            : 'bg-amber-950/60 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-900/30'
        }`}>
          <span className="text-base leading-none">{currency === 'diamond' ? '💎' : '🪙'}</span>
          <span className="text-sm font-black tracking-tight">{balance?.toLocaleString() ?? 0}</span>
          <span className="text-[10px] font-bold uppercase opacity-80 hidden xs:inline">{currency === 'diamond' ? 'Diamond' : 'Coin'}</span>
        </div>

        {/* Currency Switcher */}
        <div className="flex bg-dark-900/90 p-1 rounded-full border border-dark-700/80 shadow-inner">
          <button
            onClick={() => setCurrency('diamond')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
              currency === 'diamond'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                : 'text-dark-400 hover:text-cyan-300'
            }`}
            aria-label="Use Diamonds"
          >
            <span>💎</span>
            <span className="hidden sm:inline">Diamond</span>
          </button>
          <button
            onClick={() => setCurrency('coin')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
              currency === 'coin'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/30'
                : 'text-dark-400 hover:text-amber-300'
            }`}
            aria-label="Use Coins"
          >
            <span>🪙</span>
            <span className="hidden sm:inline">Coin</span>
          </button>
        </div>
      </div>

      {/* Round status strip */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between text-xs text-dark-300">
          <span>
            Round #{game.state?.roundNumber ?? '—'} · {game.state?.liveBetCount ?? 0} bets
          </span>
          {phase === 'PLAYING' ? (
            <span className="text-amber-400 font-bold">Flying…</span>
          ) : phase === 'CRASHED' ? (
            <span className="text-red-400 font-bold">Crashed at {game.state?.crashPoint?.toFixed(2)}x</span>
          ) : (
            <span className="text-emerald-400 font-bold">Place your bets</span>
          )}
        </div>
      </div>

      <FlightCanvas state={game.state} />

      <div className="p-3 space-y-3">
        <LiveBets results={game.result} liveBetCount={game.state?.liveBetCount ?? 0} />

        <BetPanel
          phase={phase}
          balance={balance}
          currency={currency}
          hasActiveBet={!!activeBetId && phase === 'PLAYING'}
          onBetPlaced={handleBet}
        />

        <HistoryPanel history={game.history} />
      </div>

      {/* Result toast */}
      {game.result && myCashOuts.length > 0 && <ResultToast result={game.result} userId={user?._id} />}

      {/* Recharge prompt */}
      {game.rechargeNeeded && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-xl p-6 max-w-sm w-full text-center space-y-4">
            <p className="font-bold">Insufficient balance</p>
            <p className="text-sm text-dark-400">Recharge your wallet to keep playing.</p>
            <button
              onClick={() => { game.setRechargeNeeded(false); navigate('/recharge'); }}
              className="w-full py-2.5 bg-primary-600 rounded-lg text-sm font-medium"
            >Go to Recharge</button>
            <button onClick={() => game.setRechargeNeeded(false)} className="text-sm text-dark-400">Close</button>
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
