import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

export const Transactions = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [agentOrders, setAgentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState<'user' | 'agent'>('user');
  const [statusFilter, setStatusFilter] = useState('');

  const loadUserOrders = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminApi.getPurchaseOrders(params);
      if (data.success) { setOrders(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  const loadAgentOrders = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await adminApi.getAgentOrders(params);
      if (data.success) { setAgentOrders(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'user') loadUserOrders();
    else loadAgentOrders();
  }, [page, statusFilter, tab]);

  const handleReject = async (id: string, type: 'user' | 'agent') => {
    const note = prompt('Rejection note (optional):');
    try {
      if (type === 'user') await adminApi.rejectOrder(id, note || undefined);
      else await adminApi.rejectAgentOrder(id, note || undefined);
      if (tab === 'user') loadUserOrders();
      else loadAgentOrders();
    } catch {}
  };

  const handleConfirm = async (id: string, type: 'user' | 'agent') => {
    const msg = type === 'user' ? 'Confirm this order? Diamonds/Coins will be credited to the user.' : 'Confirm this agent order? Currency will be credited to the agent.';
    if (!confirm(msg)) return;
    try {
      if (type === 'user') await adminApi.confirmOrder(id);
      else await adminApi.confirmAgentOrder(id);
      if (tab === 'user') loadUserOrders();
      else loadAgentOrders();
    } catch {}
  };

  const userStatuses = ['', 'pending', 'confirmed', 'rejected'];
  const agentStatuses = ['', 'pending', 'confirmed', 'rejected'];

  const userColumns = [
    {
      key: 'userId', label: 'User',
      render: (r: any) => typeof r.userId === 'object' ? r.userId?.nickname || r.userId?.uid || '—' : '—',
    },
    { key: 'paymentMethod', label: 'Method', render: (r: any) => <span className="capitalize">{r.paymentMethod}</span> },
    { key: 'amountBdt', label: 'Amount (BDT)', render: (r: any) => <span>৳{r.amountBdt?.toLocaleString()}</span> },
    {
      key: 'diamonds', label: 'Diamonds',
      render: (r: any) => r.diamonds > 0 ? <span className="text-cyan-400 inline-flex items-center gap-0.5"><DiamondIcon />{r.diamonds?.toLocaleString()}</span> : '—',
    },
    {
      key: 'coins', label: 'Coins',
      render: (r: any) => r.coins > 0 ? <span className="text-yellow-400 inline-flex items-center gap-0.5"><CoinIcon />{r.coins?.toLocaleString()}</span> : '—',
    },
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
      key: 'createdAt', label: 'Date & Time',
      render: (r: any) => <span className="text-dark-400 text-xs">{new Date(r.createdAt).toLocaleString()}</span>,
    },
    {
      key: '_id', label: 'Actions',
      render: (r: any) => r.status === 'pending' ? (
        <div className="flex gap-1">
          <button onClick={() => handleConfirm(r._id, 'user')} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-500 rounded transition-colors">Confirm</button>
          <button onClick={() => handleReject(r._id, 'user')} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded transition-colors">Reject</button>
        </div>
      ) : null,
    },
  ];

  const agentColumns = [
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
      key: 'createdAt', label: 'Date & Time',
      render: (r: any) => <span className="text-dark-400 text-xs">{new Date(r.createdAt).toLocaleString()}</span>,
    },
    {
      key: '_id', label: 'Actions',
      render: (r: any) => r.status === 'pending' ? (
        <div className="flex gap-1">
          <button onClick={() => handleConfirm(r._id, 'agent')} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-500 rounded transition-colors">Confirm</button>
          <button onClick={() => handleReject(r._id, 'agent')} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded transition-colors">Reject</button>
        </div>
      ) : null,
    },
  ];

  const currentStatuses = tab === 'user' ? userStatuses : agentStatuses;
  const currentColumns = tab === 'user' ? userColumns : agentColumns;
  const currentData = tab === 'user' ? orders : agentOrders;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Wallet — All Orders</h2>
        <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
          <button onClick={() => { setTab('user'); setPage(1); setStatusFilter(''); }} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${tab === 'user' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>User Orders</button>
          <button onClick={() => { setTab('agent'); setPage(1); setStatusFilter(''); }} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${tab === 'agent' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}>Agent Orders</button>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {currentStatuses.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${statusFilter === s ? 'bg-primary-600' : 'bg-dark-700 hover:bg-dark-600'}`}
          >{s || 'All'}</button>
        ))}
      </div>

      <DataTable columns={currentColumns} data={currentData} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
