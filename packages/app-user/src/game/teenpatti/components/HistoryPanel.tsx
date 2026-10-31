import { useEffect, useState } from 'react';
import type { TPHistoryEntry } from '../../../types/teenpatti';
import { teenPattiApi } from '../../../api/teenpatti.api';

// Recent rounds pulled from REST /teenpatti/history
export const HistoryPanel = () => {
  const [rows, setRows] = useState<TPHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    teenPattiApi
      .getHistory({ page: 1, limit: 10 })
      .then((res: any) => {
        if (!alive) return;
        setRows(res.data?.data || res.data || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="text-center text-xs text-zinc-500 py-2">Loading history…</div>;
  if (rows.length === 0) return <div className="text-center text-xs text-zinc-500 py-2">No rounds played yet</div>;

  return (
    <div className="bg-[#0c121d] border border-[#1e2a3f] rounded-2xl p-3.5 space-y-2 text-white shadow-lg">
      <p className="text-xs font-black text-amber-300">My Recent Rounds</p>
      <div className="space-y-1">
        {rows.map((r) => {
          const round = typeof r.roundId === 'object' ? r.roundId : null;
          return (
            <div
              key={r._id}
              className="flex items-center justify-between text-[11px] bg-[#121a29] px-2.5 py-1 rounded-lg border border-white/5"
            >
              <span className="text-zinc-400 font-bold">#{round?.roundNumber || '—'}</span>
              <span
                className={`font-black ${
                  r.status === 'won' ? 'text-emerald-400' : r.status === 'folded' ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {r.status === 'won' ? `+${r.winAmount} 💎` : r.status === 'folded' ? 'Fold' : `-${r.totalBet} 💎`}
              </span>
              <span className="text-zinc-300">{r.handName || 'High Card'}</span>
              <span className="text-zinc-400">{r.totalBet} 💎</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
