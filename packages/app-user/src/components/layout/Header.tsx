import { useEffect, useState } from 'react';
import { PiBellFill as Bell, PiChatCircleFill as MessageCircle, PiMagnifyingGlassBold as Search, PiMicrophoneFill as Mic } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useSocketStore } from '../../stores';
import { notificationApi, chatApi, officialNotificationApi } from '../../api';
import { DiamondIcon, CoinIcon } from '../ui/CurrencyIcon';

interface HeaderProps {
  title?: string;
  showBalance?: boolean;
  right?: React.ReactNode;
}

export const Header = ({ title, showBalance = true, right }: HeaderProps) => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const socket = useSocketStore((s) => s.socket);
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [officialUnread, setOfficialUnread] = useState(0);

  const loadOfficialUnread = () => {
    officialNotificationApi.getUnreadCount().then(({ data }: any) => {
      if (data.success) setOfficialUnread(data.data?.count || 0);
    }).catch(() => {});
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    notificationApi.getUnreadCount().then(({ data }: any) => {
      if (data.success) setUnread(data.data?.count || 0);
    }).catch(() => {});
    chatApi.getUnreadCount().then(({ data }: any) => {
      if (data.success) setChatUnread(data.data?.count || 0);
    }).catch(() => {});
    loadOfficialUnread();
  }, [isAuthenticated]);

  // Real-time badge update
  useEffect(() => {
    if (!socket) return;
    const handler = () => setUnread((c) => c + 1);
    const chatHandler = () => setChatUnread((c) => c + 1);
    const officialHandler = () => loadOfficialUnread();
    socket.on('notification:new', handler);
    socket.on('chat:message', chatHandler);
    socket.on('official:new', officialHandler);
    socket.on('official:removed', officialHandler);
    return () => {
      socket.off('notification:new', handler);
      socket.off('chat:message', chatHandler);
      socket.off('official:new', officialHandler);
      socket.off('official:removed', officialHandler);
    };
  }, [socket, isAuthenticated]);

  return (
    <header className="sticky top-0 bg-white border-b border-line z-30">
      <div className="flex items-center justify-between px-4 h-12">
        <div className="flex items-center gap-3">
          {title && <h1 className="text-lg font-bold text-ink">{title}</h1>}
        </div>
        <div className="flex items-center gap-4 text-ink">
          {showBalance && user && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm font-semibold bg-surface-sunken rounded-full pl-1.5 pr-2.5 py-1">
                <DiamondIcon className="w-4 h-4 text-diamond" />
                {user.diamonds?.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold bg-surface-sunken rounded-full pl-1.5 pr-2.5 py-1">
                <CoinIcon className="w-4 h-4 text-coin" />
                {user.coins?.toLocaleString()}
              </span>
            </div>
          )}
          {isAuthenticated && (
            <>
              <button onClick={() => navigate('/discover')} className="relative" aria-label="Discover">
                <Search className="w-5 h-5" />
              </button>
              <button onClick={() => navigate('/chats')} className="relative" aria-label="Messages">
                <MessageCircle className="w-5 h-5" />
                {chatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-status-live text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                )}
              </button>
              {/* Official notifications — Mic icon with red unread dot */}
              <button onClick={() => navigate('/official-notifications')} className="relative" aria-label="Official notifications">
                <Mic className="w-5 h-5" />
                {officialUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-status-live rounded-full ring-2 ring-white" aria-label="Unread official notifications" />
                )}
              </button>
              <button onClick={() => navigate('/notifications')} className="relative" aria-label="Notifications">
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-status-live text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            </>
          )}
          {right}
        </div>
      </div>
    </header>
  );
};
