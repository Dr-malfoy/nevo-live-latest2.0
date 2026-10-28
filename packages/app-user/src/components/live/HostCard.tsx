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
    className="flex items-center gap-2 cursor-pointer select-none"
  >
    {/* Avatar */}
    <Avatar
      src={host.avatar}
      nickname={host.nickname}
      size="sm"
      className="w-9 h-9 rounded-full border-2 border-white/30 shrink-0"
    />

    {/* Name pill */}
    <div className="bg-black/45 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 max-w-[130px]">
      <span className="font-semibold text-xs text-white leading-tight truncate">
        {host.nickname}
      </span>

      {/* Follow button inline */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onFollowToggle();
        }}
        whileTap={{ scale: 0.88 }}
        disabled={followBusy}
        aria-pressed={isFollowing}
        aria-label={isFollowing ? `Unfollow ${host.nickname}` : `Follow ${host.nickname}`}
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-50 ${
          isFollowing
            ? 'bg-white/20 text-white/80'
            : 'bg-[#5b5cff] text-white shadow-[0_0_8px_rgba(91,92,255,0.5)]'
        }`}
      >
        {followBusy ? (
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        ) : isFollowing ? (
          <Check className="w-2.5 h-2.5" />
        ) : (
          <Plus className="w-2.5 h-2.5" />
        )}
      </motion.button>
    </div>
  </div>
);
