import { motion, AnimatePresence } from 'framer-motion';
import { PiCaretLeftBold as ArrowLeft, PiShareNetworkFill as Share2, PiClockFill as Clock, PiXBold as X, PiCrownFill as Crown, PiGiftFill as Gift } from 'react-icons/pi';
import { HostCard } from './HostCard';
import { ViewerCounter } from './ViewerCounter';
import { MoreMenu } from './MoreMenu';
import { DiamondIcon, CoinIcon } from '../ui/CurrencyIcon';
import type { UserPublic } from '../../types';

interface TopToolbarProps {
  host: UserPublic | null;
  title?: string;
  balance?: { coins?: number; diamonds?: number };
  isHost: boolean;
  joined: boolean;
  elapsed: string;
  viewerCount: number;
  isFollowing: boolean;
  followBusy?: boolean;
  onBack: () => void;
  onFollowToggle: () => void;
  onShare: () => void;
  onReport: () => void;
  onViewersClick: () => void;
  onHostClick?: (host: UserPublic) => void;
}

/** Animated value chip (smooth count transitions). */
const AnimatedValue = ({ value, children }: { value: number; children: React.ReactNode }) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="tabular-nums"
    >
      {children}
    </motion.span>
  </AnimatePresence>
);

export const TopToolbar = ({
  host,
  title,
  balance,
  isHost,
  joined,
  elapsed,
  viewerCount,
  isFollowing,
  followBusy,
  onBack,
  onFollowToggle,
  onShare,
  onReport,
  onViewersClick,
  onHostClick,
}: TopToolbarProps) => (
  <motion.div
    initial={{ opacity: 0, y: -24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: 'easeOut' }}
    className="absolute top-0 inset-x-0 z-30 bg-gradient-to-b from-black/70 via-black/30 to-transparent px-3 pt-10 pb-10 pointer-events-none"
  >
    <div className="flex items-start justify-between gap-2 pointer-events-none">
      {/* ── LEFT: vertical stack — host info ── */}
      <div className="flex flex-col items-start gap-2 min-w-0 flex-1 pointer-events-auto">
        {host && (
          <HostCard
            host={host}
            isFollowing={isFollowing}
            followBusy={followBusy}
            onFollowToggle={onFollowToggle}
            onClick={onHostClick ? () => onHostClick(host) : undefined}
          />
        )}
      </div>

      {/* ── RIGHT: Viewers + Close + ID ── */}
      <div className="flex flex-col items-end gap-2 shrink-0 pointer-events-auto">
        <div className="flex items-center gap-2">
           <ViewerCounter count={viewerCount} onClick={onViewersClick} />
           <motion.button
             whileTap={{ scale: 0.9 }}
             onClick={onBack}
             aria-label={isHost ? 'End stream' : 'Leave stream'}
             className="w-8 h-8 flex items-center justify-center shrink-0 hover:bg-white/20 rounded-full transition-colors"
           >
             <X className="w-5 h-5 text-white" />
           </motion.button>
        </div>
        <div className="text-[10px] text-white/50 font-medium">
           ID:{host?.uid || '12345678'}
        </div>
      </div>
    </div>
  </motion.div>
);
