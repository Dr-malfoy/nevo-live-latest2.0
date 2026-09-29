import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { coinApi } from '../api';
import { ReportTransactionModal } from '../components/ReportTransactionModal';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

export const RechargeRequests = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status) params.status = status;
      const { data } = await coinApi.getRechargeRequests(params);
      if (data.success) { setOrders(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, status]);

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this recharge? User will be credited.')) return;
    try { await coinApi.approveRecharge(id); load(); } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleReject = async (id: string) => {
    const note = prompt('Rejection note (optional):');
    try { await coinApi.rejectRecharge(id, note || undefined); load(); } catch {}
  };

  const statuses = ['', 'pending', 'confirmed', 'rejected'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Recharge Requests</h2>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${status === s ? 'bg-cyan-600' : 'bg-dark-700'}`}>{s || 'All'}</button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-dark-400 py-8 text-center">Loading...</p> : orders.length === 0 ? (
        <p className="text-dark-400 py-8 text-center">No orders found</p>
      ) : (
        <div className="bg-dark-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-dark-700"><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">User</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Method</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">BDT</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Units</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">TX ID</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Screenshot</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Status</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Actions</th></tr></thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o._id} className="border-b border-dark-700/50">
                  <td className="px-4 py-3 text-sm">{o.userId?.nickname || o.userId?.uid || '—'}</td>
                  <td className="px-4 py-3 text-sm capitalize">{o.paymentMethod}</td>
                  <td className="px-4 py-3 text-sm">৳{o.amountBdt?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm flex items-center gap-1">{o.diamonds > 0 ? <><DiamondIcon />{o.diamonds}</> : o.coins > 0 ? <><CoinIcon />{o.coins}</> : '—'}</td>
                  <td className="px-4 py-3 text-sm text-xs max-w-[120px] truncate">{o.transactionId}</td>
                  <td className="px-4 py-3 text-sm">{o.screenshot ? <a href={o.screenshot} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline text-xs">View</a> : '—'}</td>
                  <td className="px-4 py-3 text-sm"><span className={`text-xs px-2 py-0.5 rounded ${o.status === 'confirmed' ? 'bg-green-600' : o.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}`}>{o.status}</span></td>
                  <td className="px-4 py-3 text-sm">
                    {o.status === 'pending' ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleApprove(o._id)} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-500 rounded">Approve</button>
                        <button onClick={() => handleReject(o._id)} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded">Reject</button>
                        <button onClick={() => setReportTarget(o._id)} className="text-xs px-2 py-1 bg-dark-600 hover:bg-dark-500 rounded" title="Report to admin">
                          <Flag className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-sm text-dark-400 disabled:opacity-30">Previous</button>
              <span className="text-sm text-dark-400">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="text-sm text-dark-400 disabled:opacity-30">Next</button>
            </div>
          )}
        </div>
      )}

      {reportTarget && (
        <ReportTransactionModal targetId={reportTarget} onClose={() => setReportTarget(null)} />
      )}
    </div>
  );
};
