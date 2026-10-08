import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PiCaretLeftBold as ArrowLeft,
  PiBellFill as Bell,
  PiBellSlashFill as BellSlash,
  PiCheckBold as Check,
  PiChecksBold as Checks,
  PiTrashBold as Trash,
  PiUserPlusFill as UserPlus,
  PiUsersFill as Users,
  PiGiftFill as GiftIcon,
  PiCoinFill as CoinIcon,
  PiBroadcastFill as BroadcastIcon,
  PiBuildingsFill as AgencyIcon,
  PiChatCircleDotsFill as ChatIcon,
  PiMegaphoneFill as MegaphoneIcon,
  PiPhoneCallFill as PhoneIcon,
  PiCaretRightBold as ChevronRight,
  PiMagnifyingGlassBold as SearchIcon,
  PiArrowsClockwiseBold as RefreshIcon,
  PiShieldCheckFill as ShieldIcon,
  PiXBold as CloseIcon,
  PiArrowUpRightBold as ExternalLinkIcon,
  PiSlidersHorizontalBold as FilterIcon,
} from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { notificationApi, officialNotificationApi, type NotificationItem } from '../api';
import { Avatar } from '../components/user';
import { useSocketStore, useUIStore } from '../stores';

interface TabConfig {
  key: string;
  label: string;
  badge?: number;
}

const TABS: TabConfig[] = [
  { key: 'all', label: 'All' },
  { key: 'social', label: 'Social' },
  { key: 'income', label: 'Earnings' },
  { key: 'live', label: 'Live & Rooms' },
  { key: 'agency', label: 'Agency' },
  { key: 'system', label: 'System' },
];

export const Notifications = () => {
  const navigate = useNavigate();
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [officialUnreadCount, setOfficialUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Fetch unread count for normal and official notifications
  const loadCounts = useCallback(async () => {
    try {
      const [notifRes, offRes] = await Promise.allSettled([
        notificationApi.getUnreadCount(),
        officialNotificationApi.getUnreadCount(),
      ]);

      if (notifRes.status === 'fulfilled' && notifRes.value.data?.success && notifRes.value.data.data) {
        setUnreadCount(notifRes.value.data.data.count || 0);
      }
      if (offRes.status === 'fulfilled' && offRes.value.data?.success && offRes.value.data.data) {
        setOfficialUnreadCount(offRes.value.data.data.count || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadNotifications = useCallback(
    async (p: number, category: string, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const { data } = await notificationApi.getNotifications({
          page: p,
          limit: 20,
          category: category !== 'all' ? category : undefined,
          unreadOnly: unreadOnly ? true : undefined,
        });
        if (data.success) {
          setNotifications(data.data || []);
          setTotalPages(data.pagination?.totalPages || 1);
          setTotalCount(data.pagination?.total || (data.data?.length ?? 0));
        }
      } catch {
        showToast('Failed to load notifications', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [unreadOnly, showToast]
  );

  useEffect(() => {
    loadNotifications(page, activeTab);
    loadCounts();
  }, [page, activeTab, unreadOnly, loadNotifications, loadCounts]);

  // Real-time socket event listener for live notifications
  useEffect(() => {
    if (!socket) return;

    const onNewNotification = (notif: NotificationItem) => {
      setNotifications((prev) => {
        // Avoid duplicate items
        if (prev.some((item) => item._id === notif._id)) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((c) => c + 1);
      setTotalCount((c) => c + 1);
    };

    socket.on('notification:new', onNewNotification);
    return () => {
      socket.off('notification:new', onNewNotification);
    };
  }, [socket]);

  const handleRefresh = () => {
    loadNotifications(page, activeTab, true);
    loadCounts();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    } catch {
      showToast('Could not mark all as read', 'error');
    }
  };

  const handleMarkSingleRead = async (e: React.MouseEvent, notif: NotificationItem) => {
    e.stopPropagation();
    if (notif.read) return;
    try {
      await notificationApi.markRead(notif._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      showToast('Marked as read', 'success');
    } catch {
      // ignore
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => {
        const target = prev.find((n) => n._id === id);
        if (target && !target.read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n._id !== id);
      });
      setTotalCount((c) => Math.max(0, c - 1));
      showToast('Notification deleted', 'info');
    } catch {
      showToast('Failed to delete notification', 'error');
    }
  };

  const handleClearAllConfirm = async (onlyRead: boolean) => {
    setIsClearing(true);
    try {
      await notificationApi.clearAll(onlyRead);
      setShowClearConfirm(false);
      showToast(onlyRead ? 'Cleared all read notifications' : 'Cleared all notifications', 'success');
      loadNotifications(1, activeTab);
      loadCounts();
    } catch {
      showToast('Failed to clear notifications', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    // Mark as read immediately
    if (!notif.read) {
      notificationApi.markRead(notif._id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    // Determine target route or action
    if (notif.targetUrl) {
      navigate(notif.targetUrl);
      return;
    }

    const type = notif.type;
    const sender = notif.senderId?._id || notif.data?.senderId || notif.senderInfo?.uid;

    if (type === 'message' && (notif.data?.chatId || sender)) {
      if (notif.data?.chatId) navigate(`/chat/${notif.data.chatId}`);
      else navigate('/chats');
    } else if (
      (type === 'follower' || type === 'friend_request' || type === 'friend_request_accepted') &&
      sender
    ) {
      navigate(`/user/${sender}`);
    } else if (type === 'live_started' || type === 'live_joined') {
      if (notif.data?.streamId) navigate(`/live/${notif.data.streamId}`);
      else if (notif.data?.roomId) navigate(`/party/${notif.data.roomId}`);
      else navigate('/');
    } else if (
      type === 'gift' ||
      type === 'coin_received' ||
      type === 'coin_transfer' ||
      type === 'recharge' ||
      type === 'withdrawal' ||
      type === 'rate_updated'
    ) {
      navigate('/wallet');
    } else if (type.startsWith('agency') || type === 'agent_linked') {
      navigate('/my-agency');
    } else if (type === 'call') {
      if (notif.data?.chatId) navigate(`/chat/${notif.data.chatId}`);
      else navigate('/chats');
    } else {
      // Open detailed view modal for long system notices / rewards
      setSelectedNotif(notif);
    }
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const mins = Math.floor(diffMs / 60000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationTheme = (type: string) => {
    switch (type) {
      case 'follower':
        return {
          icon: <UserPlus className="w-5 h-5 text-pink-600" />,
          bg: 'bg-pink-50 border-pink-200 text-pink-700',
          badgeText: 'Follower',
          actionLabel: 'View Profile',
        };
      case 'friend_request':
      case 'friend_request_accepted':
        return {
          icon: <Users className="w-5 h-5 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
          badgeText: 'Friend',
          actionLabel: 'View Profile',
        };
      case 'gift':
        return {
          icon: <GiftIcon className="w-5 h-5 text-amber-600" />,
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          badgeText: 'Gift',
          actionLabel: 'Wallet',
        };
      case 'coin_received':
      case 'coin_transfer':
      case 'rate_updated':
        return {
          icon: <CoinIcon className="w-5 h-5 text-yellow-600" />,
          bg: 'bg-yellow-50 border-yellow-200 text-yellow-700',
          badgeText: 'Coins',
          actionLabel: 'Wallet',
        };
      case 'recharge':
      case 'withdrawal':
        return {
          icon: <CoinIcon className="w-5 h-5 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          badgeText: 'Transaction',
          actionLabel: 'View Wallet',
        };
      case 'live_started':
      case 'live_joined':
        return {
          icon: <BroadcastIcon className="w-5 h-5 text-rose-600" />,
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          badgeText: 'Live Stream',
          actionLabel: 'Watch Live',
        };
      case 'message':
        return {
          icon: <ChatIcon className="w-5 h-5 text-sky-600" />,
          bg: 'bg-sky-50 border-sky-200 text-sky-700',
          badgeText: 'Chat',
          actionLabel: 'Reply',
        };
      case 'call':
        return {
          icon: <PhoneIcon className="w-5 h-5 text-teal-600" />,
          bg: 'bg-teal-50 border-teal-200 text-teal-700',
          badgeText: 'Call',
          actionLabel: 'Open Chat',
        };
      case 'agency_join_request':
      case 'agency_join_approved':
      case 'agency_join_rejected':
      case 'agency_invitation':
      case 'agent_linked':
        return {
          icon: <AgencyIcon className="w-5 h-5 text-purple-600" />,
          bg: 'bg-purple-50 border-purple-200 text-purple-700',
          badgeText: 'Agency',
          actionLabel: 'Agency Center',
        };
      case 'system':
      default:
        return {
          icon: <MegaphoneIcon className="w-5 h-5 text-brand-primary" />,
          bg: 'bg-blue-50 border-blue-200 text-blue-700',
          badgeText: 'System',
          actionLabel: 'Details',
        };
    }
  };

  // Filtered list by search query
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const q = searchQuery.toLowerCase().trim();
    return notifications.filter((n) => {
      const titleMatch = n.title?.toLowerCase().includes(q);
      const messageMatch = n.message?.toLowerCase().includes(q);
      const senderMatch =
        n.senderId?.nickname?.toLowerCase().includes(q) ||
        n.senderInfo?.nickname?.toLowerCase().includes(q);
      return titleMatch || messageMatch || senderMatch;
    });
  }, [notifications, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-ink flex flex-col max-w-md mx-auto relative pb-10">
      {/* ── Top Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-line shadow-xs">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1 rounded-full text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-ink tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 rounded-full text-ink-muted hover:text-ink hover:bg-surface-sunken transition-all ${
                refreshing ? 'animate-spin text-brand-primary' : ''
              }`}
              title="Refresh"
              aria-label="Refresh notifications"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>

            {/* Mark all as read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="p-2 rounded-full text-brand-primary hover:bg-brand-primary/10 transition-colors"
                title="Mark all as read"
                aria-label="Mark all as read"
              >
                <Checks className="w-4 h-4" />
              </button>
            )}

            {/* Clear All Dialog trigger */}
            {notifications.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="p-2 rounded-full text-ink-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Clear notifications"
                aria-label="Clear all notifications"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Official Notifications Announcement Banner ─────────── */}
        <div className="px-3 pb-2.5 pt-0.5">
          <div
            onClick={() => navigate('/official-notifications')}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-sm cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <MegaphoneIcon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold leading-none">Official System Notices</span>
                  {officialUnreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                  )}
                </div>
                <p className="text-[11px] text-white/80 truncate mt-0.5">
                  Platform events, policy updates & announcements
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-white/90 text-xs font-semibold pl-2">
              {officialUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">
                  {officialUnreadCount} new
                </span>
              )}
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ── Category Tabs ──────────────────────────────────────── */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-t border-line/60 bg-white">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-black text-white shadow-xs scale-102'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Search & Filter Controls ───────────────────────────── */}
        <div className="px-3 py-2 bg-slate-100/60 border-t border-line/50 flex items-center gap-2">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full bg-white text-xs text-ink pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-brand-primary placeholder:text-slate-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setUnreadOnly((prev) => !prev);
              setPage(1);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 ${
              unreadOnly
                ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FilterIcon className="w-3 h-3" />
            <span>Unread</span>
          </button>
        </div>
      </header>

      {/* ── Main Notification List ─────────────────────────────── */}
      <main className="flex-1 px-3 py-3 space-y-2.5">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center mx-auto text-brand-primary animate-bounce">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center bg-white rounded-2xl border border-slate-200/70 shadow-xs space-y-4 my-2">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <BellSlash className="w-8 h-8 opacity-60" />
            </div>
            <div className="space-y-1 max-w-xs mx-auto">
              <h3 className="text-sm font-bold text-slate-800">
                {searchQuery
                  ? 'No matching notifications'
                  : unreadOnly
                  ? 'No unread notifications'
                  : activeTab === 'social'
                  ? 'No social updates yet'
                  : activeTab === 'income'
                  ? 'No earnings updates yet'
                  : activeTab === 'live'
                  ? 'No live room alerts'
                  : activeTab === 'agency'
                  ? 'No agency notices'
                  : "You're all caught up!"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {searchQuery
                  ? `No notifications found matching "${searchQuery}". Try a different keyword.`
                  : unreadOnly
                  ? 'Great job! You have read all notifications in this category.'
                  : 'New messages, earnings, followers, gifts, and room notifications will appear here in real-time.'}
              </p>
            </div>

            {/* Quick Action Button for Empty State */}
            {!searchQuery && !unreadOnly && (
              <div className="pt-2">
                {activeTab === 'live' ? (
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    Browse Live Streams
                  </button>
                ) : activeTab === 'income' ? (
                  <button
                    onClick={() => navigate('/wallet')}
                    className="px-4 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    Open Wallet
                  </button>
                ) : activeTab === 'agency' ? (
                  <button
                    onClick={() => navigate('/my-agency')}
                    className="px-4 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    Agency Center
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-black text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    Explore Home
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const sender = notif.senderId || notif.senderInfo;
            const theme = getNotificationTheme(notif.type);

            return (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative rounded-2xl p-3.5 border transition-all cursor-pointer flex flex-col gap-2.5 ${
                  notif.read
                    ? 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
                    : 'bg-white border-blue-200 shadow-xs hover:border-brand-primary ring-1 ring-blue-100/70'
                }`}
              >
                {/* Top Row: Sender / Icon, Title, Badge, Time */}
                <div className="flex items-start gap-3">
                  {/* Left: Avatar or Themed Icon */}
                  <div className="relative shrink-0 mt-0.5">
                    {sender?.avatar ? (
                      <div className="relative">
                        <Avatar
                          src={sender.avatar}
                          nickname={sender.nickname || 'User'}
                          size="md"
                          className="ring-2 ring-slate-100"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] shadow-2xs">
                          {theme.icon}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-lg shadow-2xs ${theme.bg}`}
                      >
                        {theme.icon}
                      </div>
                    )}
                  </div>

                  {/* Center: Title & Sender info & Time */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider text-[9px] ${theme.bg}`}
                        >
                          {theme.badgeText}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>

                    <h4
                      className={`text-xs leading-snug line-clamp-1 ${
                        notif.read ? 'font-semibold text-slate-800' : 'font-bold text-slate-900'
                      }`}
                    >
                      {notif.title}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                  </div>
                </div>

                {/* Bottom Row: Actions & Deep Links */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-primary group-hover:underline">
                    <span>{theme.actionLabel}</span>
                    <ExternalLinkIcon className="w-3 h-3" />
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {!notif.read && (
                      <button
                        onClick={(e) => handleMarkSingleRead(e, notif)}
                        className="p-1 rounded-md text-slate-400 hover:text-brand-primary hover:bg-slate-100 transition-colors"
                        title="Mark read"
                        aria-label="Mark notification as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={(e) => handleDelete(e, notif._id)}
                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                      aria-label="Delete notification"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* ── Pagination Controls ────────────────────────────────── */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between pt-3 pb-6 px-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-2xs"
            >
              Previous
            </button>
            <span className="text-xs font-medium text-slate-500">
              Page {page} of {totalPages} ({totalCount} total)
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-2xs"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* ── Details Dialog Modal ───────────────────────────────── */}
      {selectedNotif && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedNotif(null)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <ShieldIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Notification Details</h3>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-800">{selectedNotif.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selectedNotif.message}
              </p>
              <p className="text-[10px] text-slate-400 pt-1">
                Received: {new Date(selectedNotif.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setSelectedNotif(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              {selectedNotif.targetUrl && (
                <button
                  onClick={() => {
                    const url = selectedNotif.targetUrl;
                    setSelectedNotif(null);
                    if (url) navigate(url);
                  }}
                  className="flex-1 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
                >
                  View Page
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Clear Confirmation Modal ───────────────────────────── */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <Trash className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Clear Notifications</h3>
              <p className="text-xs text-slate-500">
                Choose how you would like to clear your notification history.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                disabled={isClearing}
                onClick={() => handleClearAllConfirm(true)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors disabled:opacity-50"
              >
                Clear Read Notifications Only
              </button>

              <button
                disabled={isClearing}
                onClick={() => handleClearAllConfirm(false)}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
              >
                {isClearing ? 'Clearing...' : 'Clear All Notifications'}
              </button>

              <button
                disabled={isClearing}
                onClick={() => setShowClearConfirm(false)}
                className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
