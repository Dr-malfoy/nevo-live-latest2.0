import { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

export const Streams = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getStreams({ page, limit: 20 });
      if (data.success) { setStreams(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const handleEndStream = async (id: string) => {
    if (!confirm('Are you sure you want to end this stream?')) return;
    try {
      await adminApi.endStream(id);
      load();
    } catch {}
  };

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'type', label: 'Type', render: (r: any) => <span className="capitalize">{r.type}</span> },
    { key: 'status', label: 'Status', render: (r: any) => <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'live' ? 'bg-green-600' : 'bg-dark-600'}`}>{r.status}</span> },
    { key: 'viewerCount', label: 'Viewers' },
    { key: 'totalViewers', label: 'Total Viewers' },
    {
      key: 'hostId', label: 'Host',
      render: (r: any) => typeof r.hostId === 'object' ? r.hostId?.nickname || '—' : '—',
    },
    {
      key: 'startedAt', label: 'Started',
      render: (r: any) => new Date(r.startedAt).toLocaleDateString(),
    },
    {
      key: '_id', label: 'Actions',
      render: (r: any) => r.status === 'live' ? (
        <button onClick={() => handleEndStream(r._id)} className="flex items-center gap-1 text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded transition-colors">
          <XCircle className="w-3 h-3" /> End
        </button>
      ) : null,
    },
  ];

  return <div>
    <h2 className="text-2xl font-bold mb-6">Streams</h2>
    <DataTable columns={columns} data={streams} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
  </div>;
};
