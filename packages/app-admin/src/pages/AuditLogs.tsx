import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

export const AuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [action, setAction] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (action) params.action = action;
      const { data } = await adminApi.getAuditLogs(params);
      if (data.success) { setLogs(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, action]);

  const columns = [
    {
      key: 'actorId', label: 'Actor',
      render: (r: any) => typeof r.actorId === 'object' ? `${r.actorId?.nickname} (${r.actorId?.role})` : '—',
    },
    {
      key: 'action', label: 'Action',
      render: (r: any) => <span className="font-mono text-xs bg-dark-700 px-2 py-0.5 rounded">{r.action}</span>,
    },
    { key: 'targetType', label: 'Target', render: (r: any) => <span className="text-sm">{r.targetType}</span> },
    { key: 'targetId', label: 'Target ID', render: (r: any) => <span className="text-xs text-dark-400">{r.targetId || '—'}</span> },
    { key: 'ip', label: 'IP', render: (r: any) => <span className="text-xs text-dark-400">{r.ip || '—'}</span> },
    { key: 'createdAt', label: 'Date', render: (r: any) => <span className="text-sm text-dark-400">{new Date(r.createdAt).toLocaleString()}</span> },
  ];

  const actions = ['', 'recharge_approve', 'recharge_reject', 'withdrawal_approve', 'withdrawal_reject', 'withdrawal_paid', 'wallet_transfer', 'agent_linked'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <div className="flex gap-1">
          {actions.map((a) => (
            <button
              key={a}
              onClick={() => { setAction(a); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${action === a ? 'bg-primary-600' : 'bg-dark-700 hover:bg-dark-600'}`}
            >{a || 'All'}</button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} data={logs} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
