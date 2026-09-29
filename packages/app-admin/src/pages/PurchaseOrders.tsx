import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';
import { DiamondIcon } from '../components/CurrencyIcon';

export const PurchaseOrders = () => {
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
      const { data } = await adminApi.getPurchaseOrders(params);
      if (data.success) { setOrders(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const handleConfirm = async (id: string) => {
    if (!confirm('Confirm this order? Diamonds will be credited to the user.')) return;
    try { await adminApi.confirmOrder(id); load(); } catch {}
  };

  const handleReject = async (id: string) => {
    const note = prompt('Rejection note (optional):');
    try { await adminApi.rejectOrder(id, note || undefined); load(); } catch {}
  };

  const statuses = ['', 'pending', 'confirmed', 'rejected'];

  const columns = [
    {
      key: 'userId', label: 'User',
      render: (r: any) => typeof r.userId === 'object' ? r.userId?.nickname || r.userId?.uid || '—' : '—',
    },
    { key: 'paymentMethod', label: 'Method', render: (r: any) => <span className="capitalize">{r.paymentMethod}</span> },
    { key: 'amountBdt', label: 'Amount (BDT)', render: (r: any) => <span>৳{r.amountBdt?.toLocaleString()}</span> },
    { key: 'diamonds', label: 'Diamonds', render: (r: any) => <span className="text-cyan-400 inline-flex items-center gap-0.5"><DiamondIcon />{r.diamonds?.toLocaleString()}</span> },
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
      key: 'agentId', label: 'Agent',
      render: (r: any) => r.agentId ? (typeof r.agentId === 'object' ? r.agentId?.nickname || '—' : '—') : '—',
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
        <h2 className="text-2xl font-bold">Purchase Orders</h2>
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
