import React, { useState } from 'react';
import type { AviatorPhase } from '../../../types/aviator';
import { useAviator } from '../context';

const QUICK_AMOUNTS = [10, 20, 50, 100];

interface BetPanelProps {
  phase: AviatorPhase;
  balance: number;
  currency: 'diamond' | 'coin';
  hasActiveBet: boolean;
  onBetPlaced?: (betId: string) => void;
}

export const BetPanel: React.FC<BetPanelProps> = ({ phase, balance, currency, hasActiveBet, onBetPlaced }) => {
  const game = useAviator();
  const [betAmount, setBetAmount] = useState('20');
  const [target, setTarget] = useState('2.0');
  const [placing, setPlacing] = useState(false);

  const bettingOpen = phase === 'BET';
  const flying = phase === 'PLAYING';

  const parsedBet = parseFloat(betAmount);
  const parsedTarget = parseFloat(target);
  const betAmountNum = Number.isFinite(parsedBet) ? parsedBet : 0;
  const targetNum = Number.isFinite(parsedTarget) && parsedTarget >= 1.01 ? Math.min(2.5, parsedTarget) : 1.01;
  const notEnough = betAmountNum > balance;

  // Keep the field as text while typing so blanks/decimals are allowed.
  const quickSet = (amount: number) => {
    setBetAmount(String(amount));
    if (amount > balance) setTarget('1.01'); // low target when betting big on a small balance
  };

  const placeBet = () => {
    if (!bettingOpen || notEnough || placing) return;
    if (betAmountNum < 1) return; // min bet
    setPlacing(true);
    game.placeBet({ betAmount: betAmountNum, target: targetNum, currency }, (res) => {
      setPlacing(false);
      if (res?.success && res?.betId) onBetPlaced?.(res.betId);
    });
  };

  const cashOut = () => {
    if (!flying || !hasActiveBet || game.busy) return;
    game.cashOut();
  };

  return (
    <div className="bg-dark-800 rounded-xl p-3 space-y-3">
      {/* Amount + target */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs font-bold text-dark-300 mb-1.5">Bet amount</p>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={betAmount}
            disabled={!bettingOpen}
            onChange={(e) => setBetAmount(e.target.value)}
            className="w-full bg-dark-900 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600"
          />
          <div className="flex gap-1.5 mt-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                disabled={!bettingOpen}
                onClick={() => quickSet(a)}
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  betAmount === String(a) ? 'bg-primary-600' : 'bg-dark-900 text-dark-300 hover:bg-dark-700'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-dark-300 mb-1.5">Cash-out target (x)</p>
          <input
            type="number"
            min={1.01}
            max={2.5}
            step={0.01}
            inputMode="decimal"
            value={target}
            disabled={!bettingOpen}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full bg-dark-900 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600"
          />
          <p className="text-[10px] text-dark-400 mt-2">
            Auto cash-out when the plane hits {targetNum.toFixed(2)}x
          </p>
        </div>
      </div>

      {notEnough && bettingOpen && (
        <p className="text-xs font-bold text-red-400">Not enough balance</p>
      )}

      {/* Bet / Cash Out buttons */}
      {flying && hasActiveBet ? (
        <button
          onClick={cashOut}
          disabled={game.busy}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-black text-sm disabled:opacity-40"
        >
          {game.busy ? 'Cashing out…' : 'CASH OUT'}
        </button>
      ) : (
        <button
          onClick={placeBet}
          disabled={!bettingOpen || notEnough || placing || game.busy}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {placing ? 'Placing bet…' : bettingOpen ? 'BET' : 'Bets closed'}
        </button>
      )}
    </div>
  );
};
