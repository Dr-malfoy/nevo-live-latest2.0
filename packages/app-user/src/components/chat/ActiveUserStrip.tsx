import { useNavigate } from 'react-router-dom';
import { PiRadioFill as Radio, PiChatCircleDotsFill as ChatIcon } from 'react-icons/pi';
import type { ActiveChatUser } from '../../api/chat.api';
import { chatApi } from '../../api';
import { useUIStore } from '../../stores';

interface ActiveUserStripProps {
  users: ActiveChatUser[];
  onUserSelect?: (user: ActiveChatUser) => void;
}

/**
 * Premium horizontal profile strip for Followers & Friends.
 *
 * - Online: Vibrant emerald green ring around the round profile + green status indicator.
 * - Live: Gradient glowing ring with pulsing LIVE badge (tap opens live room).
 * - Tap on active user opens chat directly or creates conversation instantly.
 */
export const ActiveUserStrip = ({ users, onUserSelect }: ActiveUserStripProps) => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  if (!users || users.length === 0) return null;

  const handleUserClick = async (user: ActiveChatUser) => {
    if (onUserSelect) {
      onUserSelect(user);
      return;
    }

    if (user.liveStreamId) {
      navigate(`/live/${user.liveStreamId}`);
      return;
    }

    try {
      const { data } = await chatApi.getOrCreateChat(user._id);
      if (data.success && data.data?._id) {
        navigate(`/chat/${data.data._id}`);
      } else {
        navigate(`/user/${user._id}`);
      }
    } catch {
      navigate(`/user/${user._id}`);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md pt-3 pb-3 border-b border-line/60">
      <div className="flex items-center justify-between px-4 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tracking-tight text-ink uppercase">
            Online & Stories
          </span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
            {users.filter((u) => u.online || u.liveStreamId).length || users.length}
          </span>
        </div>
        <span className="text-[11px] font-medium text-ink-muted">Swipe</span>
      </div>

      <div className="flex gap-3.5 px-4 overflow-x-auto no-scrollbar scroll-smooth py-1">
        {users.map((user) => {
          const isLive = Boolean(user.liveStreamId);
          const isOnline = Boolean(user.online) || isLive;

          return (
            <button
              key={user._id}
              onClick={() => handleUserClick(user)}
              className="group flex flex-col items-center gap-1.5 shrink-0 w-[64px] focus:outline-none transition-transform active:scale-95"
            >
              {/* Profile Avatar Container */}
              <div className="relative p-0.5">
                {/* Online Glowing Ring */}
                <div
                  className={`w-14 h-14 rounded-full p-[2.5px] transition-all duration-300 ${
                    isLive
                      ? 'bg-gradient-to-tr from-[#EC4899] via-[#8B5CF6] to-[#3B82F6] animate-pulse shadow-[0_0_12px_rgba(139,92,246,0.5)]'
                      : isOnline
                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                        : 'bg-gradient-to-tr from-gray-200 to-gray-300'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-white p-[1.5px] overflow-hidden">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.nickname}
                        className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base select-none">
                        {(user.nickname || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                {isLive ? (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-0.5 ring-2 ring-white">
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    LIVE
                  </span>
                ) : isOnline ? (
                  <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping opacity-75" />
                  </span>
                ) : null}
              </div>

              {/* Nickname & Relationship */}
              <div className="flex flex-col items-center w-full px-0.5">
                <span className="text-[11px] font-semibold text-ink truncate w-full text-center group-hover:text-primary-600 transition-colors">
                  {user.nickname || 'User'}
                </span>
                {user.relationship && user.relationship !== 'suggested' && user.relationship !== 'recent' && (
                  <span className="text-[9px] font-medium text-ink-faint truncate leading-tight capitalize">
                    {user.relationship}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

