import React, { useEffect, useState } from 'react';
import { PiClockCounterClockwiseBold, PiArrowClockwiseBold } from 'react-icons/pi';
import { aviatorApi } from '../../../api/aviator.api';
import type { UserAviatorBet } from '../../../types/aviator';

export const BetsHistory: React.FC<{ triggerRefresh?: number }> = ({ triggerRefresh }) => {
  const [bets, setBets] = useState<UserAviatorBet[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchHistory = (pageNum = 1) => {
    setLoading(true);
    aviatorApi
      .getHistory({ page: pageNum, limit: 15 })
      .then((res: any) => {
        const payload = res?.data;
        if (payload?.data && Array.isArray(payload.data)) {
          setBets(payload.data);
          setTotal(payload.total || payload.data.length);
          setPage(pageNum);
        }
      })
      .catch((err) => {
        console.error('Failed to load bet history:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory(1);
  }, [triggerRefresh]);

  return (
    <div className="bg-[#121318] border border-white/10 rounded-2xl p-3.5 shadow-xl select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center justify-center text-xs">
            <PiClockCounterClockwiseBold className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">My Bets History</h3>
            <p className="text-[10px] text-dark-400 font-medium">All your previous flight bets</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-dark-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
            {total} {total === 1 ? 'bet' : 'bets'}
          </span>
          <button
            type="button"
            onClick={() => fetchHistory(page)}
            disabled={loading}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-dark-300 hover:text-white flex items-center justify-center transition-colors active:scale-95 disabled:opacity-40"
            title="Refresh bets history"
            aria-label="Refresh bets history"
          >
            <PiArrowClockwiseBold className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bets List / Table */}
      {bets.length === 0 ? (
        <div className="text-center py-6 px-4">
          <p className="text-xs font-bold text-dark-400">No bets placed yet</p>
          <p className="text-[11px] text-dark-500 mt-1">Place your first flight bet above to see your history!</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {bets.map((b) => {
            const isWon = b.status === 'cashed_out';
            const winInt = Math.floor(b.winAmount || 0);
            const betInt = Math.floor(b.betAmount || 0);
            const roundNum = b.roundId?.roundNumber;
            const timeStr = b.createdAt
              ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '';

            return (
              <div
                key={b._id}
                className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors text-xs"
              >
                {/* Left: Round & Time */}
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isWon ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  <div>
                    <div className="font-black text-white flex items-center gap-1.5">
                      <span>{roundNum ? `Round #${roundNum}` : 'Flight Round'}</span>
                      {b.cashOutAt && isWon && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                          {b.cashOutAt.toFixed(2)}x
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-dark-400 font-medium">{timeStr}</span>
                  </div>
                </div>

                {/* Right: Bet Amount & Win/Loss Return */}
                <div className="text-right">
                  <div className="text-xs font-black">
                    {isWon ? (
                      <span className="text-emerald-400">+{winInt} 💎</span>
                    ) : (
                      <span className="text-rose-400">-{betInt} 💎</span>
                    )}
                  </div>
                  <div className="text-[10px] text-dark-400 font-semibold">
                    Bet {betInt} 💎 · {isWon ? 'Won' : 'Lost'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BetsHistory;
