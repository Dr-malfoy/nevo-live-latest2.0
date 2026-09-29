import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

export const ModerationReports = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [targetType, setTargetType] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status) params.status = status;
      if (targetType) params.targetType = targetType;
      const { data } = await adminApi.getModerationReports(params);
      if (data.success) { setReports(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, status, targetType]);

  const handleUpdate = async (id: string, newStatus: string) => {
    const note = newStatus !== 'reviewed' ? prompt('Admin note (optional):') : '';
    try {
      await adminApi.updateModerationReport(id, { status: newStatus, adminNote: note || undefined });
      load();
    } catch {}
  };

  const statuses = ['', 'pending', 'reviewed', 'dismissed', 'actioned'];
  const types = ['', 'user', 'stream', 'moment', 'transaction'];

  const columns = [
    {
      key: 'reporterId', label: 'Reporter',
      render: (r: any) => typeof r.reporterId === 'object' ? r.reporterId?.nickname || '—' : '—',
    },
    { key: 'targetType', label: 'Type', render: (r: any) => <span className="capitalize">{r.targetType}</span> },
    { key: 'targetId', label: 'Target ID', render: (r: any) => <span className="text-xs text-dark-400">{r.targetId}</span> },
    { key: 'reason', label: 'Reason' },
    { key: 'details', label: 'Details', render: (r: any) => <span className="text-xs text-dark-400 max-w-[200px] truncate block">{r.details || '—'}</span> },
    {
      key: 'status', label: 'Status',
      render: (r: any) => {
        const colors: any = { pending: 'bg-yellow-600', reviewed: 'bg-blue-600', dismissed: 'bg-dark-600', actioned: 'bg-red-600' };
        return <span className={`text-xs px-2 py-0.5 rounded ${colors[r.status] || 'bg-dark-600'}`}>{r.status}</span>;
      },
    },
    {
      key: 'reviewedBy', label: 'Reviewed By',
      render: (r: any) => typeof r.reviewedBy === 'object' ? r.reviewedBy?.nickname || '—' : '—',
    },
    { key: 'createdAt', label: 'Date', render: (r: any) => <span className="text-xs text-dark-400">{new Date(r.createdAt).toLocaleString()}</span> },
    {
      key: '_id', label: 'Actions',
      render: (r: any) => r.status === 'pending' ? (
        <div className="flex gap-1">
          <button onClick={() => handleUpdate(r._id, 'reviewed')} className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded transition-colors">Review</button>
          <button onClick={() => handleUpdate(r._id, 'dismissed')} className="text-xs px-2 py-1 bg-dark-600 hover:bg-dark-500 rounded transition-colors">Dismiss</button>
          <button onClick={() => handleUpdate(r._id, 'actioned')} className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded transition-colors">Action</button>
        </div>
      ) : (
        <span className="text-xs text-dark-400">{r.adminNote || '—'}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Reports</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="bg-dark-700 rounded-lg px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {statuses.slice(1).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }} className="bg-dark-700 rounded-lg px-3 py-2 text-sm">
            <option value="">All types</option>
            {types.slice(1).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <DataTable columns={columns} data={reports} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
