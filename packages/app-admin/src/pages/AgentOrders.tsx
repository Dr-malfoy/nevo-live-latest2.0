import { useEffect, useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

export const AgentOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const isFirstMount = useRef(true);

  const load = async (
    targetPage = page,
    targetStatus = statusFilter,
    targetSearch = search
  ) => {
    setLoading(true);
    try {
      const params: any = { page: targetPage, limit: 20 };
      if (targetStatus) params.status = targetStatus;
      if (targetSearch && targetSearch.trim()) params.search = targetSearch.trim();
      const { data } = await adminApi.getAgentOrders(params);
      if (data.success) { setOrders(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      load(1, statusFilter, search);
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      load(1, statusFilter, search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isFirstMount.current) {
      load(page, statusFilter, search);
    }
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, statusFilter, search);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    load(1, statusFilter, '');
  };

  const handleConfirm = async (id: string) => {
    if (!confirm('Confirm this agent order? Currency will be credited to the agent.')) return;
    try { await adminApi.confirmAgentOrder(id); load(); } catch {}
  };

  const handleReject = async (id: string) => {
    const note = prompt('Rejection note (optional):');
    try { await adminApi.rejectAgentOrder(id, note || undefined); load(); } catch {}
  };

  const statuses = ['', 'pending', 'confirmed', 'rejected'];

  const cleanSearch = search.trim().toLowerCase().replace(/^(transaction\s*id|transactionid|trxid|trx\s*id|txid|tx\s*id|trx|tx|texid|tex\s*id)\s*[:#=\-\s]\s*/i, '').replace(/^#+/, '').trim();

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
    {
      key: 'transactionId',
      label: 'TX ID',
      render: (r: any) => {
        const isMatch = Boolean(cleanSearch && r.transactionId && r.transactionId.toLowerCase().includes(cleanSearch));
        return (
          <span className={`font-mono text-xs px-1 rounded ${isMatch ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 font-bold' : ''}`}>
            {r.transactionId || '—'}
          </span>
        );
      },
    },
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by TX ID, Agent UID, or Agent Name..."
            className="w-full pl-9 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-xs text-white placeholder-dark-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="px-3 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 text-xs font-medium rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      <DataTable columns={columns} data={orders} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
