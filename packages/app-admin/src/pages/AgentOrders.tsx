import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

export const AgentOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminApi.getAgentOrders(params);
      if (data.success) { setOrders(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const handleConfirm = async (id: string) => {
    if (!confirm('Confirm this agent order? Currency will be credited to the agent.')) return;
    try { await adminApi.confirmAgentOrder(id); load(); } catch {}
  };

  const handleReject = async (id: string) => {
    const note = prompt('Rejection note (optional):');
    try { await adminApi.rejectAgentOrder(id, note || undefined); load(); } catch {}
  };

  const statuses = ['', 'pending', 'confirmed', 'rejected'];

  const columns = [
    {
      key: 'agentId', label: 'Agent',
      render: (r: any) => typeof r.agentId === 'object' ? r.agentId?.nickname || r.agentId?.uid || '—' : '—',
    },
    {
      key: 'currency', label: 'Currency',
      render: (r: any) => <span className={r.currency === 'diamond' ? 'text-cyan-400' : 'text-yellow-400'}>{r.currency}</span>,
    },
    { key: 'amount', label: 'Amount', render: (r: any) => <span>{r.amount?.toLocaleString()}</span> },
    { key: 'amountBdt', label: 'BDT', render: (r: any) => <span>৳{r.amountBdt?.toLocaleString()}</span> },
    { key: 'paymentMethod', label: 'Method', render: (r: any) => <span className="capitalize">{r.paymentMethod}</span> },
    {
      key: 'screenshot', label: 'Screenshot',
      render: (r: any) => r.screenshot ? <a href={r.screenshot} target="_blank" rel="noopener noreferrer" className="text-primary-400 underline text-xs">View</a> : '—',
    },
    { key: 'transactionId', label: 'TX ID' },
    {
      key: 'status', label: 'Status',
      render: (r: any) => {
        const colors: any = { pending: 'bg-yellow-600', confirmed: 'bg-green-600', rejected: 'bg-red-600' };
        return <span className={`text-xs px-2 py-0.5 rounded ${colors[r.status] || 'bg-dark-600'}`}>{r.status}</span>;
      },
    },
    {
      key: '_id', label: 'Actions',
      render: (r: any) => r.status === 'pending' ? (
        <div className="flex gap-1">
          <button onClick={() => handleConfirm(r._id)} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-500 rounded transition-colors">Confirm</button>
          <button onClick={() => handleReject(r._id)} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded transition-colors">Reject</button>
        </div>
      ) : null,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Agent Orders</h2>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${statusFilter === s ? 'bg-primary-600' : 'bg-dark-700 hover:bg-dark-600'}`}
            >{s || 'All'}</button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} data={orders} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
