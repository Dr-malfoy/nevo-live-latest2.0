import { motion } from 'framer-motion';
import { PiHeartFill as Heart, PiPlusBold as Plus } from 'react-icons/pi';
import { Avatar, LevelBadge, VerifiedBadge } from '../user';
import type { UserPublic } from '../../types';

interface HostCardProps {
  host: UserPublic;
  isFollowing: boolean;
  followBusy?: boolean;
  onFollowToggle: () => void;
  onClick?: () => void;
}

export const HostCard = ({ host, isFollowing, followBusy, onFollowToggle, onClick }: HostCardProps) => (
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
    className="relative bg-black/40 rounded-full flex items-center p-1 pr-6 cursor-pointer transition-colors hover:bg-black/60 max-w-[160px]"
  >
    <Avatar src={host.avatar} nickname={host.nickname} size="sm" className="w-8 h-8 rounded-full border-none mr-2" />
    <div className="flex flex-col justify-center min-w-0 pr-2">
      <span className="font-bold text-xs text-white leading-tight truncate">{host.nickname}</span>
      <div className="flex items-center gap-1 mt-0.5">
        <Heart className="w-3 h-3 text-white/70" />
        <span className="text-[10px] text-white/90 font-semibold">{host.followers?.length || 15}</span>
      </div>
    </div>
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onFollowToggle();
      }}
      whileTap={{ scale: 0.9 }}
      disabled={followBusy}
      aria-pressed={isFollowing}
      aria-label={isFollowing ? `Unfollow ${host.nickname}` : `Follow ${host.nickname}`}
      className={`absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10 ${
        isFollowing
          ? 'bg-white/20 text-white/80'
          : 'bg-[#5b5cff] text-white'
      }`}
    >
      {followBusy ? <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> : isFollowing ? <span className="text-[10px] font-bold">✓</span> : <Plus className="w-3.5 h-3.5" />}
    </motion.button>
  </div>
);
