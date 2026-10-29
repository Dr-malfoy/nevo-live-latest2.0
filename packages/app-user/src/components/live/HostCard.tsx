import { motion } from 'framer-motion';
import { PiPlusBold as Plus, PiCheckBold as Check } from 'react-icons/pi';
import { Avatar } from '../user';
import type { UserPublic } from '../../types';

interface HostCardProps {
  host: UserPublic;
  isFollowing: boolean;
  followBusy?: boolean;
  onFollowToggle: () => void;
  onClick?: () => void;
}

export const HostCard = ({
  host,
  isFollowing,
  followBusy,
  onFollowToggle,
  onClick,
}: HostCardProps) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={(e) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    }}
    className="inline-flex items-center gap-2 bg-black/55 backdrop-blur-md border border-white/10 rounded-full pl-1 pr-1.5 py-1 cursor-pointer select-none max-w-[200px] shadow-lg transition-transform active:scale-[0.98]"
  >
    {/* Avatar with subtle ring */}
    <div className="relative shrink-0">
      <Avatar
        src={host.avatar}
        nickname={host.nickname}
        size="sm"
        className="w-8 h-8 rounded-full border border-white/40 ring-1 ring-white/10"
      />
    </div>

    {/* Host name */}
    <span className="font-bold text-xs text-white leading-tight truncate max-w-[90px] sm:max-w-[120px]">
      {host.nickname}
    </span>

    {/* Redesigned Follow Button */}
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onFollowToggle();
      }}
      whileTap={{ scale: 0.86 }}
      disabled={followBusy}
      aria-pressed={isFollowing}
      aria-label={isFollowing ? `Unfollow ${host.nickname}` : `Follow ${host.nickname}`}
      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-50 ${
        isFollowing
          ? 'bg-white/20 text-white/80'
          : 'bg-gradient-to-r from-[#5b5cff] to-[#7f5cff] text-white shadow-[0_0_8px_rgba(91,92,255,0.6)]'
      }`}
    >
      {followBusy ? (
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      ) : isFollowing ? (
        <Check className="w-3 h-3 text-white" />
      ) : (
        <Plus className="w-3 h-3 text-white" />
      )}
    </motion.button>
  </div>
);
