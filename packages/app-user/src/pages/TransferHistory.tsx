import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiCopyFill as Copy,
  PiCheckBold as Check,
  PiArrowsLeftRightFill as TransferIcon,
  PiCaretRightBold as ChevronRight,
} from 'react-icons/pi';
import { transferApi } from '../api/transfer.api';
import { optional } from '../api/pending';
import { Loading } from '../components/ui';
import { Avatar } from '../components/user';
import { CoinIcon } from '../components/ui/CurrencyIcon';
import type { TransferRecord } from '../api/transfer.api';

export const TransferHistory = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    optional(transferApi.getHistory(1))
      .then((res) => {
        if (!cancelled && res?.data) {
          setRecords(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleOpenProfile = (uidOrId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (uidOrId) {
      navigate(`/user/${uidOrId}`);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-10">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink flex-1">Transfer History</h1>
        </div>
      </header>

      {loading ? (
        <div className="pt-24">
          <Loading size="lg" />
        </div>
      ) : records.length === 0 ? (
        <div className="pt-20 px-4 text-center max-w-xs mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <TransferIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink">No transfers yet</h2>
            <p className="text-xs text-ink-muted mt-1">You have not transferred coins to any agent or user yet.</p>
          </div>
          <button
            onClick={() => navigate('/transfer')}
            className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs shadow-sm transition-all"
          >
            Transfer Coins
          </button>
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {records.map((r) => {
            const displayTxId = r.txId || r._id;
            const isCopied = copiedId === displayTxId;

            return (
              <div
                key={r._id}
                onClick={() => navigate(`/transactions/${r._id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-line active:bg-surface-soft transition-colors cursor-pointer space-y-3"
              >
                {/* Header row: ID & Status */}
                <div className="flex items-center justify-between text-xs pb-2 border-b border-line">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-ink">{displayTxId}</span>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(displayTxId, e)}
                      className={`p-1 rounded transition-colors ${
                        isCopied ? 'text-emerald-600 bg-emerald-50' : 'text-ink-muted hover:text-ink'
                      }`}
                      title="Copy Transaction ID"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {isCopied && <span className="text-[10px] font-bold text-emerald-600">Copied</span>}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      r.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : r.status === 'pending'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                {/* Recipient & Amount row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => handleOpenProfile(r.receiver._id || r.receiver.uid, e)}
                      className="shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <Avatar src={r.receiver.avatar} nickname={r.receiver.nickname} size="md" />
                    </button>

                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenProfile(r.receiver._id || r.receiver.uid, e)}
                        className="font-bold text-sm text-ink hover:text-amber-800 truncate text-left block"
                      >
                        {r.receiver.nickname || 'Agent'}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleOpenProfile(r.receiver._id || r.receiver.uid, e)}
                        className="text-xs font-mono font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950 block text-left"
                      >
                        UID: {r.receiver.uid}
                      </button>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-base font-extrabold text-ink tabular-nums flex items-center justify-end gap-1">
                      <span>-{r.points.toLocaleString()}</span>
                      <CoinIcon className="w-4 h-4 text-amber-500" />
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Footer details link */}
                <div className="flex items-center justify-between pt-2 border-t border-line/60 text-[11px] text-ink-muted">
                  <span className="truncate max-w-[240px]">{r.description || 'Coin transfer'}</span>
                  <span className="text-amber-600 font-bold flex items-center gap-0.5">
                    View Details <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
