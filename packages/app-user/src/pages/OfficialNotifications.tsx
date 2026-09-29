import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiMicrophoneFill as Mic, PiCaretLeftBold as ChevronLeft, PiCaretRightBold as ChevronRight } from 'react-icons/pi';
import { officialNotificationApi } from '../api';
import { useAuthStore } from '../stores';

interface OfficialItem {
  _id: string;
  title: string;
  message: string;
  icon?: string;
  seen: boolean;
  createdAt: string;
}

export const OfficialNotifications = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [items, setItems] = useState<OfficialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data } = await officialNotificationApi.get({ page: p, limit: 20 });
      if (data.success) {
        setItems(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  // Mark everything seen once the page is opened (clears the red dot).
  useEffect(() => {
    if (isAuthenticated && items.length > 0 && items.some((i) => !i.seen)) {
      officialNotificationApi.markAllSeen().catch(() => {});
    }
  }, [isAuthenticated, items]);

  const timeAgo = (iso?: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div className="min-h-screen">
      <div className="flex items-center gap-3 p-4 border-b border-line">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Mic className="w-5 h-5 text-brand-primary" /> Official Notifications
        </h1>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-center text-ink-muted py-10">Loading...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Mic className="w-12 h-12 text-ink-faint mx-auto" />
            <p className="text-ink-muted text-sm">No official notifications yet.</p>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n._id}
              className={`rounded-xl p-4 border ${
                n.seen ? 'bg-surface-sunken border-line-strong' : 'bg-brand-primary/10 border-brand-primary/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{n.icon || '📢'}</span>
                <p className="font-bold text-sm flex-1">{n.title}</p>
                {!n.seen && <span className="w-2 h-2 rounded-full bg-red-500" aria-label="Unread" />}
                <span className="text-[10px] text-ink-faint">{timeAgo(n.createdAt)}</span>
              </div>
              <p className="text-sm text-ink-muted leading-relaxed">{n.message}</p>
            </div>
          ))
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-surface-sunken disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-ink-muted">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg bg-surface-sunken disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
