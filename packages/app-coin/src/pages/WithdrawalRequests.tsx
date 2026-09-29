import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { coinApi } from '../api';
import { ReportTransactionModal } from '../components/ReportTransactionModal';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

export const WithdrawalRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
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
      const { data } = await coinApi.getWithdrawalRequests(params);
      if (data.success) { setRequests(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, status]);

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this withdrawal? User balance will be deducted. You pay them manually.')) return;
    try { await coinApi.approveWithdrawal(id); load(); } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleReject = async (id: string) => {
    const note = prompt('Rejection note (optional):');
    try { await coinApi.rejectWithdrawal(id, note || undefined); load(); } catch {}
  };

  const handlePaid = async (id: string) => {
    if (!confirm('Mark as paid? Only do this after you have sent the payment.')) return;
    try { await coinApi.markWithdrawalPaid(id); load(); } catch (err: any) { alert(err.response?.data?.error || 'Failed'); }
  };

  const statuses = ['', 'pending', 'approved', 'rejected', 'paid'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Withdrawal Requests</h2>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${status === s ? 'bg-cyan-600' : 'bg-dark-700'}`}>{s || 'All'}</button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-dark-400 py-8 text-center">Loading...</p> : requests.length === 0 ? (
        <p className="text-dark-400 py-8 text-center">No requests found</p>
      ) : (
        <div className="bg-dark-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-dark-700"><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">User</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Currency</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Amount</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">BDT</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Method</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Account</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Status</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Actions</th></tr></thead>
            <tbody>
              {requests.map((r: any) => (
                <tr key={r._id} className="border-b border-dark-700/50">
                  <td className="px-4 py-3 text-sm">{r.userId?.nickname || r.userId?.uid || '—'}</td>
                  <td className="px-4 py-3 text-sm flex items-center gap-1">{r.currency === 'diamond' ? <DiamondIcon /> : <CoinIcon />} {r.currency}</td>
                  <td className="px-4 py-3 text-sm">{r.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">৳{r.amountBdt?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm capitalize">{r.method}</td>
                  <td className="px-4 py-3 text-sm text-xs">{r.accountNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'paid' ? 'bg-green-600' : r.status === 'approved' ? 'bg-blue-600' : r.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleApprove(r._id)} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-500 rounded">Approve</button>
                        <button onClick={() => handleReject(r._id)} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded">Reject</button>
                        <button onClick={() => setReportTarget(r._id)} className="text-xs px-2 py-1 bg-dark-600 hover:bg-dark-500 rounded" title="Report to admin">
                          <Flag className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {r.status === 'approved' && (
                      <button onClick={() => handlePaid(r._id)} className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded">Mark Paid</button>
                    )}
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
