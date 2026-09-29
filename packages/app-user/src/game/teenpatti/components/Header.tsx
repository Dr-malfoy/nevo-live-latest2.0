import { useState } from 'react';
import { PiQuestionFill as HelpCircle, PiXBold as X } from 'react-icons/pi';

const HANDS = [
  ['Trail', 'Three of a kind — the best hand'],
  ['Pure Sequence', 'Three consecutive same-suit cards (e.g., 5♥ 6♥ 7♥)'],
  ['Sequence', 'Three consecutive cards (A-2-3 is the highest sequence!)'],
  ['Color', 'Three same-suit cards, not in sequence'],
  ['Pair', 'Two cards of the same rank'],
  ['High Card', 'Highest single card'],
];

const RULES = [
  'Each player antes 5 at the start of every round.',
  'You get 3 cards. Decide to play BLIND (don\u2019t look) or SEE your cards.',
  'Blind call costs half the stake; blind raise about 1.5× the stake.',
  'A seen raise doubles the stake (max 4 raises per round, stake capped at 100,000).',
  'Everyone must match the stake to reach showdown — fold if your hand is weak!',
  'You have 20 seconds per turn; fold if you time out.',
  'Winner takes the pot minus a 3% house cut.',
];

export const Header = ({ balance, currency, onToggleCurrency, onLeave }: {
  balance: number;
  currency: 'diamond' | 'coin';
  onToggleCurrency: (c: 'diamond' | 'coin') => void;
  onLeave: () => void;
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="glass-card px-4 py-3 flex items-center gap-3">
      <div className="flex-1">
        <h1 className="text-lg font-black text-gradient">Teen Patti</h1>
        <p className="text-[10px] text-dark-400">
          Balance: <b className="text-white">{balance.toLocaleString()}</b> {currency === 'coin' ? '🪙' : '💎'}
        </p>
      </div>

      <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
        <button
          onClick={() => onToggleCurrency('diamond')}
          className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold ${currency === 'diamond' ? 'bg-primary-600' : 'text-dark-400'}`}
        >💎</button>
        <button
          onClick={() => onToggleCurrency('coin')}
          className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold ${currency === 'coin' ? 'bg-yellow-600' : 'text-dark-400'}`}
        >🪙</button>
      </div>

      <button onClick={() => setShowHelp(true)} className="text-dark-400 hover:text-white transition">
        <HelpCircle className="w-5 h-5" />
      </button>
      <button onClick={onLeave} className="text-[11px] font-bold text-red-400 border border-red-500/40 rounded-lg px-2.5 py-1.5">
        Leave
      </button>

      {showHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="glass-card p-5 w-full max-w-sm space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-black">How to Play</h3>
              <button onClick={() => setShowHelp(false)}><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-1.5">
              {RULES.map((r, i) => (
                <p key={i} className="text-xs text-dark-300 flex gap-2">
                  <span className="text-brand-accent font-bold">{i + 1}.</span>{r}
                </p>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-brand-accent">Hand rankings</p>
              {HANDS.map(([name, desc]) => (
                <div key={name} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-white">{name}</span>
                  <span className="text-dark-400 text-right">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
