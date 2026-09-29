import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

export const ContactMessages = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status) params.status = status;
      const { data } = await adminApi.getContactMessages(params);
      if (data.success) { setMessages(data.data); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, status]);

  const handleReply = async (id: string) => {
    const reply = prompt('Reply to this user:');
    if (reply === null) return;
    try {
      await adminApi.replyContactMessage(id, { reply: reply || undefined, status: 'resolved' });
      load();
    } catch {}
  };

  const handleStatus = async (id: string) => {
    try {
      await adminApi.replyContactMessage(id, { status: 'resolved' });
      load();
    } catch {}
  };

  const statuses = ['', 'pending', 'resolved'];

  const columns = [
    {
      key: 'userId', label: 'User',
      render: (r: any) => typeof r.userId === 'object'
        ? <div><p>{r.userId?.nickname || '—'}</p><p className="text-[10px] text-dark-500">UID: {r.userId?.uid || '—'}</p></div>
        : '—',
    },
    { key: 'subject', label: 'Subject', render: (r: any) => <span className="font-medium">{r.subject}</span> },
    {
      key: 'message', label: 'Message',
      render: (r: any) => <span className="text-sm max-w-[300px] truncate block">{r.message}</span>,
    },
    {
      key: 'adminReply', label: 'Admin Reply',
      render: (r: any) => r.adminReply ? <span className="text-xs text-primary-400 max-w-[200px] truncate block">{r.adminReply}</span> : '—',
    },
    {
      key: 'status', label: 'Status',
      render: (r: any) => (
        <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'resolved' ? 'bg-green-600' : 'bg-yellow-600'}`}>{r.status}</span>
      ),
    },
    { key: 'createdAt', label: 'Date', render: (r: any) => <span className="text-xs text-dark-400">{new Date(r.createdAt).toLocaleString()}</span> },
    {
      key: '_id', label: 'Actions',
      render: (r: any) => (
        <div className="flex gap-1">
          {r.status === 'pending' && (
            <button onClick={() => handleReply(r._id)} className="text-xs px-2 py-1 bg-primary-600 hover:bg-primary-500 rounded transition-colors">Reply</button>
          )}
          {r.status === 'pending' && (
            <button onClick={() => handleStatus(r._id)} className="text-xs px-2 py-1 bg-dark-600 hover:bg-dark-500 rounded transition-colors">Resolve</button>
          )}
          {r.adminReply && <span className="text-xs text-dark-400">Replied</span>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Contact Messages</h2>
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
      <DataTable columns={columns} data={messages} loading={loading} page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
