import { AnimatePresence, motion } from 'framer-motion';
import { PiUserPlusFill as UserPlus, PiHeartFill as Heart, PiGiftFill as GiftIcon, PiSparkleFill as Sparkle } from 'react-icons/pi';
import { Avatar } from '../user';
import type { RoomNotification } from './types';

interface NotificationOverlayProps {
  notifications: RoomNotification[];
}

const getBannerTheme = (kind: RoomNotification['kind']) => {
  switch (kind) {
    case 'gift':
      return {
        bg: 'bg-gradient-to-r from-[#220738]/95 via-[#3D0A56]/95 to-[#5E1244]/95 border-pink-400/40 shadow-[0_8px_30px_rgba(236,72,153,0.35)]',
        iconBg: 'bg-pink-500/20 text-pink-300 border border-pink-400/30 shadow-[0_0_12px_rgba(244,114,182,0.5)]',
        icon: <GiftIcon className="w-3.5 h-3.5 text-pink-300" />,
        highlightText: 'text-pink-300',
      };
    case 'follow':
      return {
        bg: 'bg-gradient-to-r from-[#0B1A28]/95 via-[#162D42]/95 to-[#22405C]/95 border-cyan-400/40 shadow-[0_8px_30px_rgba(34,211,238,0.3)]',
        iconBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.5)]',
        icon: <Heart className="w-3.5 h-3.5 text-cyan-300" />,
        highlightText: 'text-cyan-300',
      };
    case 'join':
    default:
      return {
        bg: 'bg-gradient-to-r from-[#0D1D16]/95 via-[#163326]/95 to-[#1F4735]/95 border-emerald-400/40 shadow-[0_8px_30px_rgba(52,211,153,0.3)]',
        iconBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.5)]',
        icon: <UserPlus className="w-3.5 h-3.5 text-emerald-300" />,
        highlightText: 'text-emerald-300',
      };
  }
};

export const NotificationOverlay = ({ notifications }: NotificationOverlayProps) => {
  const visible = notifications.slice(-3);

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-2 w-[min(380px,94vw)] pointer-events-none">
      <AnimatePresence>
        {visible.map((n) => {
          const theme = getBannerTheme(n.kind);
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              role="status"
              className={`flex items-center gap-3 px-3.5 py-2 rounded-full border backdrop-blur-xl ${theme.bg}`}
            >
              {n.avatar ? (
                <Avatar
                  src={n.avatar}
                  nickname={n.text}
                  size="sm"
                  className="!w-7 !h-7 ring-2 ring-white/30 text-[10px] shrink-0"
                />
              ) : (
                <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                  {theme.icon}
                </span>
              )}

              <div className="flex-1 min-w-0 pr-1 flex items-center gap-1.5">
                <p className="text-[12px] sm:text-[13px] text-white/95 font-semibold leading-snug truncate">
                  {n.text}
                </p>
                {n.kind === 'gift' && <Sparkle className="w-3.5 h-3.5 text-yellow-300 shrink-0 animate-pulse" />}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

