import { useEffect, useState } from 'react';
import { PiCaretLeftBold as ArrowLeft, PiBellFill as Bell } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api';
import { DiamondIcon } from '../components/ui/CurrencyIcon';

const typeIcons: any = {
  recharge: <DiamondIcon />,
  withdrawal: '💸',
  agent_linked: '🔗',
  rate_updated: '📈',
  order: '📦',
  system: '🔔',
};

export const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await notificationApi.getNotifications({ page, limit: 20 });
      if (data.success) {
        setNotifications(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      load();
    } catch {}
  };

  return (
    <div className="min-h-screen">
      <div className="flex items-center gap-3 p-4 border-b border-line">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">Notifications</h1>
        <button onClick={markAll} className="ml-auto text-xs text-accent-500">Mark all read</button>
      </div>

      <div className="p-4 space-y-2">
        {loading ? <p className="text-center text-ink-muted py-8">Loading...</p> :
          notifications.length === 0 ? <p className="text-center text-ink-muted py-8">No notifications</p> :
          notifications.map((n: any) => (
            <div key={n._id} className={`p-3 bg-surface-sunken rounded-xl flex gap-3 ${n.read ? 'opacity-60' : ''}`}>
              <div className="text-xl">{typeIcons[n.type] || '🔔'}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-ink-muted">{n.message}</p>
                <p className="text-[10px] text-ink-faint mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.read && <span className="w-2 h-2 bg-black text-white rounded-full mt-1.5 flex-shrink-0" />}
            </div>
          ))}
        {totalPages > 1 && (
          <div className="flex justify-between pt-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-sm text-ink-muted disabled:opacity-30">Prev</button>
            <span className="text-sm text-ink-muted">Page {page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="text-sm text-ink-muted disabled:opacity-30">Next</button>
          </div>
        )}
      </div>
    </div>
  );
};
