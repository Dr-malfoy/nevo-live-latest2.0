import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

export const WithdrawalRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status) params.status = status;
      const { data } = await adminApi.getWithdrawalRequests(params);
      if (data.success) { setRequests(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, status]);

  const statuses = ['', 'pending', 'approved', 'rejected', 'paid'];

  const columns = [
    {
      key: 'userId', label: 'User',
      render: (r: any) => typeof r.userId === 'object' ? r.userId?.nickname || r.userId?.uid || '—' : '—',
    },
    {
      key: 'agentId', label: 'Agent',
      render: (r: any) => typeof r.agentId === 'object' ? r.agentId?.nickname || '—' : '—',
    },
    {
      key: 'currency', label: 'Currency',
      render: (r: any) => <span className={r.currency === 'diamond' ? 'text-cyan-400' : 'text-yellow-400'}>{r.currency}</span>,
    },
    { key: 'amount', label: 'Amount', render: (r: any) => <span>{r.amount?.toLocaleString()}</span> },
    { key: 'amountBdt', label: 'BDT', render: (r: any) => <span>৳{r.amountBdt?.toLocaleString()}</span> },
    { key: 'method', label: 'Method', render: (r: any) => <span className="capitalize">{r.method}</span> },
    { key: 'accountNumber', label: 'Account', render: (r: any) => <span className="text-xs">{r.accountNumber || '—'}</span> },
    {
      key: 'status', label: 'Status',
      render: (r: any) => {
        const colors: any = { pending: 'bg-yellow-600', approved: 'bg-blue-600', rejected: 'bg-red-600', paid: 'bg-green-600' };
        return <span className={`text-xs px-2 py-0.5 rounded ${colors[r.status] || 'bg-dark-600'}`}>{r.status}</span>;
      },
    },
    { key: 'createdAt', label: 'Date', render: (r: any) => <span className="text-sm text-dark-400">{new Date(r.createdAt).toLocaleString()}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Withdrawal Requests</h2>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${status === s ? 'bg-primary-600' : 'bg-dark-700 hover:bg-dark-600'}`}
            >{s || 'All'}</button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} data={requests} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
