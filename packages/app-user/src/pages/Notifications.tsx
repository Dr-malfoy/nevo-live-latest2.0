import { useCallback, useEffect, useState } from 'react';
import {
  PiCaretLeftBold as ArrowLeft,
  PiBellFill as Bell,
  PiCheckBold as Check,
  PiTrashBold as Trash,
  PiUserPlusFill as UserPlus,
  PiUsersFill as Users,
  PiHeartFill as Heart,
  PiGiftFill as GiftIcon,
  PiCoinFill as CoinIcon,
  PiBroadcastFill as BroadcastIcon,
  PiBuildingsFill as AgencyIcon,
  PiChatCircleDotsFill as ChatIcon,
  PiMegaphoneFill as MegaphoneIcon,
  PiPhoneCallFill as PhoneIcon,
  PiCaretRightBold as ChevronRight,
} from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { notificationApi, type NotificationItem } from '../api';
import { Avatar } from '../components/user';
import { useSocketStore } from '../stores';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'social', label: 'Social' },
  { key: 'income', label: 'Earnings' },
  { key: 'live', label: 'Live' },
  { key: 'agency', label: 'Agency' },
  { key: 'system', label: 'System' },
];

export const Notifications = () => {
  const navigate = useNavigate();
  const socket = useSocketStore((s) => s.socket);

  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadUnreadCount = useCallback(async () => {
    try {
      const { data } = await notificationApi.getUnreadCount();
      if (data.success && data.data) {
        setUnreadCount(data.data.count);
      }
    } catch {}
  }, []);

  const loadNotifications = useCallback(
    async (p: number, category: string) => {
      setLoading(true);
      try {
        const { data } = await notificationApi.getNotifications({
          page: p,
          limit: 20,
          category: category !== 'all' ? category : undefined,
        });
        if (data.success) {
          setNotifications(data.data || []);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch {
        // error loading
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadNotifications(page, activeTab);
    loadUnreadCount();
  }, [page, activeTab, loadNotifications, loadUnreadCount]);

  // Real-time socket event listener for live notifications
  useEffect(() => {
    if (!socket) return;

    const onNewNotification = (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
    };

    socket.on('notification:new', onNewNotification);
    return () => {
      socket.off('notification:new', onNewNotification);
    };
  }, [socket]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      notificationApi.markRead(notif._id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    // Deep linking navigation
    if (notif.targetUrl) {
      navigate(notif.targetUrl);
    } else if (notif.type === 'message' && notif.data?.chatId) {
      navigate(`/chat/${notif.data.chatId}`);
    } else if (
      (notif.type === 'follower' || notif.type === 'friend_request' || notif.type === 'friend_request_accepted') &&
      (notif.senderId?._id || notif.data?.senderId)
    ) {
      navigate(`/user/${notif.senderId?._id || notif.data?.senderId}`);
    } else if (notif.type === 'live_started' && (notif.data?.streamId || notif.data?.roomId)) {
      if (notif.data.streamId) navigate(`/stream/${notif.data.streamId}`);
      else navigate(`/party/${notif.data.roomId}`);
    } else if (notif.type === 'gift' || notif.type === 'coin_received' || notif.type === 'coin_transfer') {
      navigate('/wallet');
    } else if (notif.type.startsWith('agency')) {
      navigate('/my-agency');
    } else if (notif.type === 'call') {
      if (notif.data?.chatId) navigate(`/chat/${notif.data.chatId}`);
      else navigate('/chats');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      loadUnreadCount();
    } catch {}
  };

  const timeAgo = (iso?: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follower':
        return <UserPlus className="w-5 h-5 text-pink-400" />;
      case 'friend_request':
      case 'friend_request_accepted':
        return <Users className="w-5 h-5 text-indigo-400" />;
      case 'gift':
        return <GiftIcon className="w-5 h-5 text-amber-400" />;
      case 'coin_received':
      case 'coin_transfer':
      case 'recharge':
      case 'withdrawal':
      case 'rate_updated':
        return <CoinIcon className="w-5 h-5 text-yellow-400" />;
      case 'live_started':
      case 'live_joined':
        return <BroadcastIcon className="w-5 h-5 text-red-400" />;
      case 'message':
        return <ChatIcon className="w-5 h-5 text-sky-400" />;
      case 'call':
        return <PhoneIcon className="w-5 h-5 text-emerald-400" />;
      case 'agency_join_request':
      case 'agency_join_approved':
      case 'agency_join_rejected':
      case 'agency_invitation':
      case 'agent_linked':
        return <AgencyIcon className="w-5 h-5 text-purple-400" />;
      case 'system':
      default:
        return <MegaphoneIcon className="w-5 h-5 text-brand-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-ink flex flex-col">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-surface-base/95 backdrop-blur-md border-b border-line px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-full hover:bg-surface-sunken transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white text-xs font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:text-brand-secondary px-2.5 py-1.5 rounded-lg hover:bg-surface-sunken transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar border-b border-line/60 bg-surface-sunken/40">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-glow-sm scale-105'
                  : 'bg-surface-sunken text-ink-muted hover:text-ink hover:bg-surface-sunken/80'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="flex-1 p-4 space-y-2.5 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="py-16 text-center text-ink-muted text-sm animate-pulse space-y-2">
            <Bell className="w-8 h-8 mx-auto opacity-40 animate-bounce" />
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-surface-sunken flex items-center justify-center mx-auto text-ink-muted">
              <Bell className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-sm font-bold text-ink">No notifications yet</h3>
            <p className="text-xs text-ink-muted max-w-xs mx-auto">
              When you receive messages, calls, gifts, followers, or agency alerts, they'll show up here.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const sender = n.senderId || n.senderInfo;
            return (
              <div
                key={n._id}
                onClick={() => handleNotificationClick(n)}
                className={`group relative rounded-2xl p-3.5 border transition-all cursor-pointer flex items-start gap-3.5 ${
                  n.read
                    ? 'bg-surface-sunken/60 border-line hover:border-line-strong'
                    : 'bg-surface-sunken border-brand-primary/40 shadow-sm hover:border-brand-primary'
                }`}
              >
                {/* Left: Avatar or Icon */}
                <div className="relative shrink-0">
                  {sender?.avatar ? (
                    <div className="relative">
                      <Avatar
                        src={sender.avatar}
                        nickname={sender.nickname || '?'}
                        size="md"
                        className="ring-2 ring-line"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-base border border-line flex items-center justify-center text-[10px] shadow-sm">
                        {getNotificationIcon(n.type)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-surface-base border border-line flex items-center justify-center text-xl shadow-inner">
                      {getNotificationIcon(n.type)}
                    </div>
                  )}
                </div>

                {/* Center: Title, Message, Time */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className={`text-sm leading-tight truncate ${n.read ? 'font-semibold text-ink' : 'font-bold text-brand-primary'}`}>
                      {n.title}
                    </h4>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-ink-faint mt-1.5 font-medium">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>

                {/* Right: Delete & Arrow */}
                <div className="flex items-center gap-1 self-center">
                  <button
                    onClick={(e) => handleDelete(e, n._id)}
                    className="p-1.5 rounded-lg text-ink-muted/50 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                    aria-label="Delete notification"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-ink transition-colors" />
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 pb-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-1.5 rounded-xl bg-surface-sunken text-xs font-semibold text-ink-muted disabled:opacity-30 hover:bg-surface-sunken/80 transition-all"
            >
              Previous
            </button>
            <span className="text-xs text-ink-muted">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-1.5 rounded-xl bg-surface-sunken text-xs font-semibold text-ink-muted disabled:opacity-30 hover:bg-surface-sunken/80 transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
