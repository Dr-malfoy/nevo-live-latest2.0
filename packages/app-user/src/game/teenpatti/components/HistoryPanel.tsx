import { useEffect, useState } from 'react';
import type { TPHistoryEntry } from '../../../types/teenpatti';
import { teenPattiApi } from '../../../api/teenpatti.api';
import { HAND_NAMES } from './Card';

// Recent rounds pulled from REST /teenpatti/history
export const HistoryPanel = () => {
  const [rows, setRows] = useState<TPHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    teenPattiApi.getHistory({ page: 1, limit: 10 })
      .then((res: any) => {
        if (!alive) return;
        setRows(res.data?.data || res.data || []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  if (loading) return <div className="text-center text-xs text-dark-500 py-2">Loading history…</div>;
  if (rows.length === 0) return <div className="text-center text-xs text-dark-500 py-2">No rounds yet</div>;

  return (
    <div className="glass-card p-3 space-y-1.5">
      <p className="text-xs font-bold text-dark-300">My Recent Rounds</p>
      {rows.map((r) => {
        const round = typeof r.roundId === 'object' ? r.roundId : null;
        return (
          <div key={r._id} className="flex items-center justify-between text-[11px]">
            <span className="text-dark-400">#{round?.roundNumber || '—'}</span>
            <span className={`font-bold ${r.status === 'won' ? 'text-emerald-400' : r.status === 'folded' ? 'text-amber-300' : 'text-red-400'}`}>
              {r.status === 'won' ? `+${r.winAmount}` : r.status === 'folded' ? 'Fold' : 'Lost'}
            </span>
            <span className="text-dark-500">{r.handName || ''}</span>
            <span className="text-dark-500">{r.totalBet}</span>
          </div>
        );
      })}
    </div>
  );
};
