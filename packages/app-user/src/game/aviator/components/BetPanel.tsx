import React, { useState } from 'react';
import { PiPlusBold, PiMinusBold, PiXBold, PiCopyBold } from 'react-icons/pi';
import type { AviatorPhase } from '../../../types/aviator';
import { useAviator } from '../context';

interface SingleBetControlProps {
  panelId: 1 | 2;
  phase: AviatorPhase | null;
  balance: number;
  activeBet: { betId: string; amount: number } | null;
  onBetPlaced: (betId: string, amount: number) => void;
  onCashOut: (betId: string) => void;
  canDuplicate?: boolean;
  onDuplicate?: () => void;
  canClose?: boolean;
  onClose?: () => void;
}

const QUICK_AMOUNTS = [10, 20, 50, 100];

export const SingleBetControl: React.FC<SingleBetControlProps> = ({
  panelId,
  phase,
  balance,
  activeBet,
  onBetPlaced,
  onCashOut,
  canDuplicate,
  onDuplicate,
  canClose,
  onClose,
}) => {
  const game = useAviator();
  const [betAmount, setBetAmount] = useState<number>(panelId === 1 ? 20 : 50);
  const [inputStr, setInputStr] = useState<string>(String(panelId === 1 ? 20 : 50));
  const [placing, setPlacing] = useState(false);
  const [cashedOutWin, setCashedOutWin] = useState<number | null>(null);

  const bettingOpen = phase === 'BET';
  const flying = phase === 'PLAYING';
  const notEnough = betAmount > balance;

  // Reset cashed out badge when new round BET phase begins
  React.useEffect(() => {
    if (phase === 'BET') {
      setCashedOutWin(null);
    }
  }, [phase]);

  const handleStep = (delta: number) => {
    if (!bettingOpen || activeBet) return;
    const next = Math.max(1, betAmount + delta);
    setBetAmount(next);
    setInputStr(String(next));
  };

  const handleQuickSet = (val: number) => {
    if (!bettingOpen || activeBet) return;
    setBetAmount(val);
    setInputStr(String(val));
  };

  const handleInputChange = (val: string) => {
    if (!bettingOpen || activeBet) return;
    const clean = val.replace(/[^0-9]/g, '');
    setInputStr(clean);
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num > 0) {
      setBetAmount(num);
    }
  };

  const handlePlaceBet = () => {
    if (!bettingOpen || notEnough || placing || activeBet || game.busy) return;
    if (betAmount < 1) return;
    setPlacing(true);
    game.placeBet({ betAmount, target: 0, currency: 'diamond' }, (res) => {
      setPlacing(false);
      if (res?.success && res?.betId) {
        onBetPlaced(res.betId, betAmount);
        if (typeof res?.balance === 'number') {
          useAuthStore.getState().updateUser({ diamonds: res.balance });
        }
      }
    });
  };

  const currentMultiplier = Math.max(1, game.state?.multiplier ?? 1);
  const liveWinDiamonds = activeBet ? Math.floor(activeBet.amount * currentMultiplier) : 0;

  const handleCashOutClick = () => {
    if (!flying || !activeBet || game.busy) return;
    const expectedWin = liveWinDiamonds;
    setCashedOutWin(expectedWin);
    onCashOut(activeBet.betId);
  };

  return (
    <div className="bg-[#14151a] border border-white/10 rounded-2xl p-3 shadow-2xl relative flex flex-col justify-between select-none">
      {/* Top Header: Tab + Duplicate [+] or Close [✕] */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex-1 flex justify-center">
          <div className="bg-[#21232b] rounded-full p-0.5 border border-white/5 flex items-center shadow-inner">
            <span className="px-5 py-0.5 rounded-full text-xs font-black text-white bg-[#30333d] shadow-sm">
              Bet
            </span>
          </div>
        </div>

        {/* Duplicate button (Panel 1) or Remove button (Panel 2) */}
        {canDuplicate && (
          <button
            type="button"
            onClick={onDuplicate}
            className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-400 hover:bg-emerald-500 hover:text-black flex items-center justify-center text-xs font-black shadow-md transition-all active:scale-95"
            title="Add second simultaneous bet"
            aria-label="Add second bet panel"
          >
            <PiPlusBold className="w-3.5 h-3.5" />
          </button>
        )}

        {canClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-red-950/80 border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs font-black shadow-md transition-all active:scale-95"
            title="Remove second bet"
            aria-label="Remove second bet panel"
          >
            <PiXBold className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Row: Left (Stepper + 2x2 grid) | Right (Large Green Bet / Orange Cash Out Button) */}
      <div className="grid grid-cols-2 gap-2.5 items-stretch">
        {/* Left Column: Stepper & Quick Amounts */}
        <div className="flex flex-col justify-between space-y-2">
          {/* Stepper: [-] Amount [+] */}
          <div className="flex items-center justify-between bg-black border border-white/10 rounded-xl px-2 py-1 shadow-inner">
            <button
              type="button"
              disabled={!bettingOpen || !!activeBet || betAmount <= 1}
              onClick={() => handleStep(-10)}
              className="w-7 h-7 rounded-full bg-[#252830] hover:bg-[#323642] disabled:opacity-30 disabled:hover:bg-[#252830] text-white flex items-center justify-center text-sm font-black transition-colors"
              aria-label="Decrease bet"
            >
              <PiMinusBold className="w-3 h-3" />
            </button>

            <div className="flex-1 flex items-center justify-center px-1">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={inputStr}
                disabled={!bettingOpen || !!activeBet}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-16 bg-transparent text-center font-black text-white text-base outline-none disabled:opacity-80"
              />
              <span className="text-cyan-400 text-xs font-black ml-0.5">💎</span>
            </div>

            <button
              type="button"
              disabled={!bettingOpen || !!activeBet}
              onClick={() => handleStep(10)}
              className="w-7 h-7 rounded-full bg-[#252830] hover:bg-[#323642] disabled:opacity-30 disabled:hover:bg-[#252830] text-white flex items-center justify-center text-sm font-black transition-colors"
              aria-label="Increase bet"
            >
              <PiPlusBold className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Amounts Grid (2x2 matching Image 2) */}
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                disabled={!bettingOpen || !!activeBet}
                onClick={() => handleQuickSet(amt)}
                className={`py-1 rounded-lg text-xs font-black border transition-all ${
                  betAmount === amt && !activeBet
                    ? 'bg-cyan-950/80 border-cyan-500/70 text-cyan-300 shadow-sm'
                    : 'bg-[#1b1d24] border-white/5 text-dark-300 hover:bg-[#252831] hover:text-white'
                } disabled:opacity-40 disabled:hover:bg-[#1b1d24]`}
              >
                {amt}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Big Vibrant Action Button */}
        <div className="flex">
          {flying && activeBet ? (
            /* Cash Out Button (Vibrant High-Contrast Amber/Orange) */
            <button
              type="button"
              onClick={handleCashOutClick}
              disabled={game.busy}
              className="w-full h-full min-h-[84px] rounded-2xl bg-gradient-to-b from-amber-400 via-orange-500 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-black font-black flex flex-col items-center justify-center p-2 shadow-[0_0_20px_rgba(245,158,11,0.45)] border-2 border-amber-300 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <span className="text-xs uppercase tracking-widest font-black opacity-90">
                {game.busy ? 'Cashing…' : 'CASH OUT'}
              </span>
              <span className="text-xl font-black tracking-tight leading-tight">
                {liveWinDiamonds} 💎
              </span>
            </button>
          ) : flying && cashedOutWin ? (
            /* Cashed Out Success Badge */
            <div className="w-full h-full min-h-[84px] rounded-2xl bg-emerald-950/70 border-2 border-emerald-500/60 text-emerald-400 font-black flex flex-col items-center justify-center p-2 shadow-inner text-center">
              <span className="text-xs uppercase tracking-wider font-black">CASHED OUT</span>
              <span className="text-lg font-black text-white">+{cashedOutWin} 💎</span>
            </div>
          ) : bettingOpen && activeBet ? (
            /* Waiting for round to start after placing bet */
            <div className="w-full h-full min-h-[84px] rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 font-black flex flex-col items-center justify-center p-2 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mb-1" />
              <span className="text-xs font-black uppercase tracking-wider">WAITING</span>
              <span className="text-sm font-black text-white">{activeBet.amount} 💎 Placed</span>
            </div>
          ) : flying && !activeBet ? (
            /* Flight in progress, bet wasn't placed */
            <div className="w-full h-full min-h-[84px] rounded-2xl bg-[#1b1c22] border border-white/5 text-dark-400 font-bold flex flex-col items-center justify-center p-2 text-center">
              <span className="text-xs font-bold text-dark-300">Flight in progress</span>
              <span className="text-[10px] text-dark-500 mt-0.5">Wait for next round</span>
            </div>
          ) : phase === 'CRASHED' ? (
            /* Round Ended / Flew Away */
            <div className="w-full h-full min-h-[84px] rounded-2xl bg-[#1b1c22] border border-rose-500/20 text-rose-400 font-black flex flex-col items-center justify-center p-2 text-center">
              <span className="text-xs font-black uppercase tracking-wider text-rose-500">FLEW AWAY</span>
              <span className="text-[11px] font-bold text-dark-400 mt-0.5">
                {activeBet ? `Lost ${activeBet.amount} 💎` : 'Next round starting…'}
              </span>
            </div>
          ) : (
            /* Standard Vibrant GREEN BET BUTTON (Image 2 Match!) */
            <button
              type="button"
              onClick={handlePlaceBet}
              disabled={!bettingOpen || notEnough || placing || game.busy || !phase}
              className={`w-full h-full min-h-[84px] rounded-2xl font-black flex flex-col items-center justify-center p-2 shadow-lg active:scale-[0.98] transition-all ${
                notEnough
                  ? 'bg-red-950/60 border-2 border-red-500/50 text-red-300 cursor-not-allowed shadow-none'
                  : 'bg-[#28a745] hover:bg-[#218838] border-2 border-[#34c759] text-white shadow-[0_0_18px_rgba(40,167,69,0.4)] hover:shadow-[0_0_24px_rgba(40,167,69,0.6)]'
              } disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none`}
            >
              {placing ? (
                <span className="text-xs font-black uppercase tracking-wider animate-pulse">Placing…</span>
              ) : notEnough ? (
                <>
                  <span className="text-xs font-black uppercase tracking-wider">Insufficient</span>
                  <span className="text-xs font-bold opacity-80">Diamonds</span>
                </>
              ) : (
                <>
                  <span className="text-base font-black uppercase tracking-wider leading-none">Bet</span>
                  <span className="text-lg font-black tracking-tight leading-snug mt-0.5">
                    {betAmount} 💎
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const BetPanel: React.FC<{
  phase: AviatorPhase | null;
  balance: number;
  activeBets: {
    bet1: { betId: string; amount: number } | null;
    bet2: { betId: string; amount: number } | null;
  };
  onBetPlaced1: (betId: string, amount: number) => void;
  onBetPlaced2: (betId: string, amount: number) => void;
  onCashOut1: (betId: string) => void;
  onCashOut2: (betId: string) => void;
}> = ({
  phase,
  balance,
  activeBets,
  onBetPlaced1,
  onBetPlaced2,
  onCashOut1,
  onCashOut2,
}) => {
  // State: whether second duplicate bet panel is open (dual bet in 1 round!)
  const [showSecondBet, setShowSecondBet] = useState(false);

  return (
    <div className="space-y-3">
      {/* Responsive Grid: stacks vertically on phone screens, side-by-side on sm+ */}
      <div className={`grid gap-3 transition-all ${showSecondBet ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Bet Panel 1 */}
        <SingleBetControl
          panelId={1}
          phase={phase}
          balance={balance}
          activeBet={activeBets.bet1}
          onBetPlaced={onBetPlaced1}
          onCashOut={onCashOut1}
          canDuplicate={!showSecondBet}
          onDuplicate={() => setShowSecondBet(true)}
        />

        {/* Bet Panel 2 (Duplicate Bet section!) */}
        {showSecondBet && (
          <SingleBetControl
            panelId={2}
            phase={phase}
            balance={balance}
            activeBet={activeBets.bet2}
            onBetPlaced={onBetPlaced2}
            onCashOut={onCashOut2}
            canClose={true}
            onClose={() => setShowSecondBet(false)}
          />
        )}
      </div>
    </div>
  );
};

export default BetPanel;
