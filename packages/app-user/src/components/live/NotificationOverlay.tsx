import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PiUserPlusFill as UserPlus, PiHeartFill as Heart, PiGiftFill as GiftIcon, PiSparkleFill as Sparkle } from 'react-icons/pi';
import { Avatar } from '../user';
import type { RoomNotification } from './types';

export interface NotificationOverlayProps {
  notifications: RoomNotification[];
  onDismiss?: (id: string) => void;
  durationMs?: number;
}

const getBannerTheme = (kind: RoomNotification['kind']) => {
  switch (kind) {
    case 'reward':
      return {
        bg: 'bg-gradient-to-r from-[#240A34]/95 via-[#4E0E57]/95 to-[#7A154A]/95 border-amber-400/60 shadow-[0_8px_32px_rgba(245,158,11,0.45)] ring-1 ring-amber-400/30',
        iconBg: 'bg-gradient-to-tr from-amber-400 via-rose-500 to-pink-500 text-white border border-amber-300/60 shadow-[0_0_15px_rgba(245,158,11,0.7)]',
        icon: <Sparkle className="w-3.5 h-3.5 text-yellow-200 animate-spin-slow" />,
        highlightText: 'text-amber-300',
      };
    case 'gift':
      return {
        bg: 'bg-gradient-to-r from-[#220738]/95 via-[#3D0A56]/95 to-[#5E1244]/95 border-pink-400/40 shadow-[0_8px_30px_rgba(236,72,153,0.35)]',
        iconBg: 'bg-pink-500/20 text-pink-300 border border-pink-400/30 shadow-[0_0_12px_rgba(244,114,182,0.5)]',
        icon: <GiftIcon className="w-3.5 h-3.5 text-pink-300" />,
        highlightText: 'text-pink-300',
      };
    case 'like':
      return {
        bg: 'bg-gradient-to-r from-[#2c0919]/95 via-[#4a0d2a]/95 to-[#6b123d]/95 border-rose-400/40 shadow-[0_8px_30px_rgba(244,63,94,0.35)]',
        iconBg: 'bg-rose-500/20 text-rose-300 border border-rose-400/30 shadow-[0_0_12px_rgba(251,113,133,0.5)]',
        icon: <Heart className="w-3.5 h-3.5 text-rose-400" />,
        highlightText: 'text-rose-300',
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

const NotificationBannerItem = ({
  item,
  onDismiss,
  durationMs = 5000,
}: {
  item: RoomNotification;
  onDismiss: (id: string) => void;
  durationMs?: number;
}) => {
  const effectiveDuration = item.durationMs ?? durationMs;
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(item.id);
    }, effectiveDuration);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss, effectiveDuration]);

  const theme = getBannerTheme(item.kind);

  const textToShow = item.text || (item as any).content || '';

  // Do not render empty/blank banners
  if (!textToShow.trim()) {
    return null;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 450, damping: 26 }}
      role="status"
      className={`flex items-center gap-3 px-3.5 py-2 rounded-full border backdrop-blur-xl pointer-events-auto ${theme.bg}`}
    >
      {item.avatar ? (
        <Avatar
          src={item.avatar}
          nickname={textToShow}
          size="sm"
          className="!w-7 !h-7 ring-2 ring-white/30 text-[10px] shrink-0"
        />
      ) : (
        <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${theme.iconBg}`}>
          {theme.icon}
        </span>
      )}

      <div className="flex-1 min-w-0 pr-1 flex items-center gap-1.5">
        <p className="text-[12px] sm:text-[13px] text-white/95 font-bold leading-snug truncate">
          {textToShow}
        </p>
        {(item.kind === 'gift' || item.kind === 'reward') && <Sparkle className="w-3.5 h-3.5 text-yellow-300 shrink-0 animate-pulse" />}
        {item.kind === 'like' && <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />}
      </div>
    </motion.div>
  );
};

export const NotificationOverlay = ({
  notifications,
  onDismiss,
  durationMs = 5000,
}: NotificationOverlayProps) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback(
    (id: string) => {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      onDismiss?.(id);
    },
    [onDismiss]
  );

  const visible = notifications.filter((n) => !dismissedIds.has(n.id)).slice(-3);

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-2 w-[min(380px,94vw)] pointer-events-none">
      <AnimatePresence>
        {visible.map((n) => (
          <NotificationBannerItem
            key={n.id}
            item={n}
            onDismiss={handleDismiss}
            durationMs={durationMs}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

