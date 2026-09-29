import type { TPResult } from '../../../types/teenpatti';
import { Card, HAND_NAMES } from './Card';

// Post-round result overlay: winner(s), hand, pot breakdown
export const ResultModal = ({ result }: { result: TPResult }) => {
  const winners = result.winners || [];
  const winnerNames = winners.map((w) => w.nickname).join(' & ');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card p-6 w-full max-w-sm space-y-4 animate-fade-in">
        <div className="text-center">
          <p className="text-[10px] tracking-[0.3em] text-dark-400 uppercase">Round Over</p>
          <h2 className="text-xl font-black text-gradient mt-1">
            {winnerNames || 'No winner'}
          </h2>
          {result.split && <p className="text-[11px] text-amber-300 font-bold mt-1">Split pot</p>}
        </div>

        {result.reason ? (
          <p className="text-center text-sm text-dark-400">{result.reason}</p>
        ) : (
          <>
            {/* Pot breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-dark-800 rounded-xl p-3">
                <p className="text-[10px] text-dark-400">Pot</p>
                <p className="text-sm font-black text-white">{result.pot?.toLocaleString()}</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-3">
                <p className="text-[10px] text-dark-400">House</p>
                <p className="text-sm font-black text-amber-300">{result.houseCut?.toLocaleString()}</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-3">
                <p className="text-[10px] text-dark-400">Payout</p>
                <p className="text-sm font-black text-emerald-400">{result.payout?.toLocaleString()}</p>
              </div>
            </div>

            {/* Winning hand */}
            {winners[0] && (
              <div className="bg-dark-800/60 rounded-xl p-3 text-center">
                <p className="text-[10px] text-dark-400 mb-2">Winning hand</p>
                <div className="flex justify-center gap-1.5">
                  {winners[0].cards.map((c, i) => <Card key={i} card={c} />)}
                </div>
                <p className="text-sm font-black text-brand-accent mt-2">{winners[0].handName}</p>
              </div>
            )}

            {/* All hands */}
            {(result.hands || []).length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {result.hands!.map((h) => (
                  <div key={h.userId} className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 ${h.folded ? 'bg-dark-900/60 opacity-60' : 'bg-dark-800/60'}`}>
                    <span className="text-xs font-semibold truncate">{h.nickname}</span>
                    <span className="text-[10px] text-dark-400">{h.folded ? 'Folded' : HAND_NAMES[Number(h.handName) || 0] || h.handName}</span>
                    <div className="flex gap-0.5">
                      {h.cards.map((c, i) => <Card key={i} card={c} small />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p className="text-center text-[11px] text-dark-500">Next round starting soon…</p>
      </div>
    </div>
  );
};
