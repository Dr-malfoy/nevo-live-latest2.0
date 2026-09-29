import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { TvIcon, DiamondIcon, PlanetIcon, GamepadIcon, ChatSmileIcon, BearProfileIcon } from '../icons/PremiumNavIcons';
import { useAuthStore, useSocketStore, useStreamStore } from '../../stores';
import { chatApi } from '../../api';

const tabs = [
  { to: '/', icon: TvIcon, exact: true },
  { to: '/party', icon: DiamondIcon },
  { to: '/social', icon: PlanetIcon },
  { to: '/chats', icon: ChatSmileIcon, badge: 'chat' as const },
  { to: '/profile', icon: BearProfileIcon },
];

export const BottomNav = () => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const socket = useSocketStore((s) => s.socket);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setChatUnread(0);
      return;
    }
    chatApi
      .getUnreadCount()
      .then(({ data }: any) => {
        if (data.success) setChatUnread(data.data?.count || 0);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = () => setChatUnread((c) => c + 1);
    socket.on('chat:message', onMessage);
    return () => {
      socket.off('chat:message', onMessage);
    };
  }, [socket]);

  const handleTabClick = (to: string) => {
    if (to === '/' && location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const { fetchStreams, activeTab } = useStreamStore.getState();
      fetchStreams(activeTab);
      window.dispatchEvent(new CustomEvent('app:refresh-home'));
    }
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-line safe-bottom z-40">
      <div className="flex items-stretch justify-between h-[64px] pb-1 px-1">
        {tabs.map(({ to, icon: Icon, exact, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => handleTabClick(to)}
            className="relative flex items-center justify-center flex-1 transition-transform active:scale-95"
          >
            {({ isActive }) => (
              <span className="relative">
                <Icon isActive={isActive} />
                {badge === 'chat' && chatUnread > 0 && (
                  <span className="absolute -top-1.5 -right-3 min-w-[20px] h-[20px] px-1 bg-[#ff3b30] text-white text-[11px] font-bold rounded-full flex items-center justify-center border-[2px] border-white box-content shadow-sm">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
