import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiClockCounterClockwiseFill as History, PiGearFill as Settings, PiUsersFill as Users } from 'react-icons/pi';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores';
import { useRoulette, RouletteProvider } from '../game/roulette/context';
import {
  Wheel,
  Ball,
  Board,
  ChipPicker,
  BettingTimer,
  MyBets,
  ResultOverlay,
  HistoryPanel,
  StatsPanel,
  SettingsPanel,
  FloatingActions,
  WinEffects,
  WinBadge,
  RecentNumbers,
  NumberPopup,
} from '../game/roulette/components';
import type { PlacedBet } from '../game/roulette/components';
import type { RouletteBetType } from '../types/roulette';
import { useSpinAnimation } from '../game/roulette/hooks/useSpinAnimation';
import { useBallAnimation } from '../game/roulette/hooks/useBallAnimation';
import { useKeyboardBetting } from '../game/roulette/hooks/useKeyboardBetting';
import { useSound } from '../game/roulette/hooks/useSound';
import { betKey } from '../game/roulette/components/board/geometry';
import { useSettingsStore } from '../game/roulette/store/settingsStore';
import { lastWinMultiplier } from '../game/roulette/utils/statistics';
import { EUROPEAN_WHEEL } from '../game/roulette/utils/wheel';
import '../game/roulette/index.scss';

const RouletteScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const game = useRoulette();
  const sound = useSound();
  const settings = useSettingsStore();

  const [currency, setCurrency] = useState<'diamond' | 'coin'>('diamond');
  const [chipValue, setChipValue] = useState(10);
  const [bets, setBets] = useState<PlacedBet[]>([]);
  const [lastRoundBets, setLastRoundBets] = useState<PlacedBet[]>([]);
  const [placing, setPlacing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [showWinBadge, setShowWinBadge] = useState(false);
  const [spinComplete, setSpinComplete] = useState(false);
  const [hasBetThisRound, setHasBetThisRound] = useState(false);
  const [showNumberPopup, setShowNumberPopup] = useState(false);
  const [persistedWinningIndex, setPersistedWinningIndex] = useState<number | null>(null);
  const [persistedWinningNumber, setPersistedWinningNumber] = useState<number | null>(null);
  const placedRound = useRef<number>(-1);

  const state = game.state;
  const phase = state?.phase ?? 'betting';
  const spinning = phase === 'spinning';
  const bettingOpen = phase === 'betting';
  const roundNumber = state?.roundNumber ?? 0;
  const winningIndex = state?.winningIndex ?? null;

  // Track winning index and number as soon as received
  useEffect(() => {
    if (winningIndex !== null && winningIndex >= 0) {
      setPersistedWinningIndex(winningIndex);
      setPersistedWinningNumber(EUROPEAN_WHEEL[winningIndex]);
    }
  }, [winningIndex]);

  useEffect(() => {
    if (game.result) {
      if (game.result.winningIndex !== undefined && game.result.winningIndex !== null) {
        setPersistedWinningIndex(game.result.winningIndex);
      }
      if (game.result.winningNumber !== undefined && game.result.winningNumber !== null) {
        setPersistedWinningNumber(Number(game.result.winningNumber));
      }
    }
  }, [game.result]);

  // Join the shared wheel room as soon as connected
  useEffect(() => {
    if (game.connected) game.join();
  }, [game.connected]);

  // Reset placed chips when a new betting window opens
  useEffect(() => {
    if (bettingOpen && roundNumber > 0) {
      setBets([]);
      setSpinComplete(false);
      setHasBetThisRound(false);
      setShowNumberPopup(false); // hide popup when next round starts
    }
  }, [bettingOpen, roundNumber]);

  // Auto-dismiss the result overlay the moment the next betting window opens
  useEffect(() => {
    if (showResult && bettingOpen) setShowResult(false);
  }, [showResult, bettingOpen]);

  const effectiveWinningIndex = (winningIndex !== null && winningIndex >= 0)
    ? winningIndex
    : (persistedWinningIndex !== null && persistedWinningIndex >= 0)
    ? persistedWinningIndex
    : (game.result?.winningIndex ?? null);

  // Spin + ball animations driven by server state
  const { rotation, spinning: wheelSpinning } = useSpinAnimation(spinning, effectiveWinningIndex, roundNumber, sound.sound, () => {
    setSpinComplete(true);
  });

  const ball = useBallAnimation(spinning, effectiveWinningIndex, roundNumber);

  // Guard against re-triggering payout evaluations on the same round
  const settledRoundRef = useRef<number>(-1);

  // When ball settles, show the floating number popup and evaluate payouts
  useEffect(() => {
    if (!ball.settled) return;
    setShowNumberPopup(true);

    // Process win/loss evaluation once per round
    if (roundNumber > 0 && settledRoundRef.current !== roundNumber) {
      settledRoundRef.current = roundNumber;
      if (game.result) {
        const mine = user ? game.result.results.filter((r) => r.userId === user._id) : [];
        const total = mine.reduce((s, r) => s + r.winAmount, 0);
        if (total > 0) {
          setWinAmount(total);
          setShowWinBadge(true);
          sound.playWin();
        } else if (hasBetThisRound) {
          sound.playLose();
        }
        setHasBetThisRound(false);
      }
    }
  }, [ball.settled, roundNumber, game.result, user, hasBetThisRound, sound]);

  const balance = currency === 'coin' ? (user?.coins ?? 0) : (user?.diamonds ?? 0);
  const totalBet = useMemo(() => bets.reduce((s, b) => s + b.amount, 0), [bets]);

  const addBet = useCallback(
    (type: RouletteBetType, numbers: number[], key: string) => {
      if (!bettingOpen || placing) return;
      const existing = bets.filter((b) => betKey(b.type, b.numbers) === key);
      if (existing.length > 0) {
        // Tap again → remove one chip
        const idx = bets.findIndex((b) => betKey(b.type, b.numbers) === key);
        if (idx >= 0) setBets((prev) => prev.filter((_, i) => i !== idx));
      } else {
        setBets((prev) => [...prev, { id: `${key}:${prev.length}:${Date.now()}`, type, numbers, amount: chipValue }]);
        sound.playChip();
      }
    },
    [bettingOpen, placing, bets, chipValue, sound]
  );

  const handleCellClick = useCallback(
    (type: RouletteBetType, numbers: number[], key: string) => addBet(type, numbers, key),
    [addBet]
  );

  const removeBet = useCallback((id: string) => setBets((prev) => prev.filter((b) => b.id !== id)), []);
  const undo = useCallback(() => setBets((prev) => prev.slice(0, -1)), []);
  const double = useCallback(() => setBets((prev) => prev.map((b) => ({ ...b, id: `${b.id}:d`, amount: b.amount * 2 }))), []);
  const clearBets = useCallback(() => setBets([]), []);
  const repeatLast = useCallback(() => {
    if (lastRoundBets.length === 0) return;
    setBets(lastRoundBets.map((b) => ({ ...b, id: `${b.type}:${b.numbers.join(',')}:${Date.now()}` })));
  }, [lastRoundBets]);

  const placeAll = useCallback(() => {
    if (!bettingOpen || bets.length === 0 || placing) return;
    setPlacing(true);
    const remaining = [...bets];
    const tryNext = () => {
      const bet = remaining.shift();
      if (!bet) {
        setPlacing(false);
        setBets([]);
        setHasBetThisRound(true);
        placedRound.current = roundNumber;
        setLastRoundBets(remaining.length === 0 ? [] : []);
        return;
      }
      game.placeBet({ currency, betType: bet.type, numbers: bet.numbers, amount: bet.amount }, () => {
        tryNext();
      });
    };
    // Snapshot the bets we're about to place for "repeat last round".
    const snapshot = remaining.map((b) => ({ ...b, id: b.id }));
    setLastRoundBets(snapshot);
    tryNext();
  }, [bettingOpen, bets, placing, currency, game, roundNumber]);

  // Keyboard betting over the straight-number cells.
  const { cursor, setCursor, clear: clearCursor } = useKeyboardBetting(36, bettingOpen, (cellIdx) => {
    const r = Math.floor(cellIdx / 12);
    const c = cellIdx % 12;
    const n = 3 - r + 3 * c;
    addBet('straight', [n], betKey('straight', [n]));
  });

  // Keep the winning index visible on the wheel after the result.
  const lastWinning = useMemo(() => winningIndex, [winningIndex]);

  return (
    <div className="min-h-screen bg-dark-950 pb-24 relative overflow-x-hidden" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(245,196,81,0.08), transparent 50%), #050816' }}>
      <ToastContainer theme="dark" position="top-center" />

      {/* Top bar */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-800 sticky top-0 z-20 bg-dark-950/90 backdrop-blur-xl">
        <button onClick={() => { game.leave(); navigate(-1); }} aria-label="Back"><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold flex-1">Roulette</h1>
        <button onClick={() => setShowHistory(!showHistory)} aria-label="History" className="text-dark-300 hover:text-white"><History size={20} /></button>
        <button onClick={() => setShowSettings(true)} aria-label="Settings" className="text-dark-300 hover:text-white"><Settings size={20} /></button>
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

      {/* Round status + countdown */}
      <div className="px-4 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-300 flex items-center gap-1">
            <Users size={12} /> Round #{roundNumber || '—'} · {state?.liveBetCount ?? 0} bets
          </span>
          {spinning ? (
            <span className="roulette-status-chip spinning roulette-pulse">Spinning</span>
          ) : (
            <span className="roulette-status-chip betting">Place your bets</span>
          )}
        </div>
        <BettingTimer endsAt={state?.endsAt ?? null} active={bettingOpen} />
      </div>

      {/* Wheel + ball + effects */}
      <div className="roulette-stage relative w-full max-w-[420px] mx-auto aspect-square mt-2">
        <div className={`roulette-wheel-wrap absolute inset-0 ${wheelSpinning ? 'spinning' : ''}`}>
          <Wheel rotation={rotation} spinning={wheelSpinning} winningIndex={effectiveWinningIndex} />
        </div>
        <Ball angle={ball.angle} radius={ball.radius} visible={ball.visible} settled={ball.settled} />
        <WinEffects active={ball.settled && effectiveWinningIndex !== null} />
        {/* Winning number pops up centered on the wheel after ball settles */}
        <NumberPopup
          winningIndex={effectiveWinningIndex}
          winningNumber={persistedWinningNumber}
          visible={showNumberPopup}
        />
      </div>

      {/* Main column: board + chips + bets */}
      <div className="px-3 space-y-3">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-4">
          <div className="space-y-3">
            <RecentNumbers />

            <div className="roulette-board-frame">
              <Board bets={bets} onCellClick={handleCellClick} disabled={!bettingOpen} cursor={cursor} />
            </div>

            <div className="roulette-glass p-2">
              <ChipPicker value={chipValue} onChange={setChipValue} disabled={!bettingOpen} />
            </div>

            <div className="roulette-glass p-3">
              <p className="text-xs font-bold text-dark-300 mb-2">My Bets</p>
              <MyBets
                bets={bets}
                total={totalBet}
                onRemove={removeBet}
                onUndo={undo}
                onDouble={double}
                onRepeat={repeatLast}
                onClear={clearBets}
                disabled={!bettingOpen}
                hasLastRound={lastRoundBets.length > 0}
              />
            </div>

            <button
              onClick={placeAll}
              disabled={!bettingOpen || bets.length === 0 || placing}
              className="roulette-cta w-full py-3.5 text-sm"
            >
              {placing ? 'Placing bets…' : spinning ? 'Spinning…' : `Place ${bets.length} bet${bets.length === 1 ? '' : 's'} · ${totalBet.toLocaleString()}`}
            </button>

            {/* Right panel on mobile → collapsible drawer */}
            {showHistory && (
              <div className="space-y-3 lg:hidden">
                <HistoryPanel />
                <StatsPanel />
              </div>
            )}
          </div>

          {/* Right panel (desktop) */}
          <div className="hidden lg:block space-y-3">
            <HistoryPanel />
            <StatsPanel />
            {winAmount > 0 && (
              <div className="roulette-glass p-3">
                <p className="text-xs font-bold text-dark-300 mb-1">Last win multiplier</p>
                <p className="text-2xl font-black text-yellow-300">×{lastWinMultiplier(game.result?.results ?? []).toFixed(1)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingActions onReset={clearBets} />

      {showResult && <ResultOverlay result={game.result} userId={user?._id} onClose={() => setShowResult(false)} />}
      {showSettings && <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />}
      <WinBadge amount={winAmount} visible={showWinBadge} onDone={() => setShowWinBadge(false)} />

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

export const RouletteGame = () => (
  <RouletteProvider>
    <RouletteScreen />
  </RouletteProvider>
);

export default RouletteGame;
