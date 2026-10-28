import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiHeartFill as Heart, PiGiftFill as GiftIcon, PiShareNetworkFill as Share2, PiVideoCameraFill as Video, PiVideoCameraSlashFill as VideoOff, PiArrowsLeftRightBold as FlipHorizontal, PiPhoneSlashFill as PhoneOff, PiMagicWandFill as Wand2, PiStickerFill as Sticker, PiSquaresFourFill as Grid } from 'react-icons/pi';
import { MouthIcon, MouthOffIcon } from './MouthIcons';
import { MessageInput } from './MessageInput';
import { Avatar } from '../user';

interface BottomToolbarProps {
  isHost: boolean;
  videoEnabled: boolean;
  cameraOn: boolean;
  micOn: boolean;
  isSpeaker?: boolean;
  micRequestPending?: boolean;
  isFollowing: boolean;
  likeCount: number;
  onLike: () => void;
  onReact?: (emoji: string) => void;
  onOpenGift: () => void;
  onShare: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onRequestMic?: () => void;
  onSwitchCamera: () => void;
  onToggleFilters: () => void;
  onLeave: () => void;
  onEnd: () => void;
  onChatSend: (message: string) => void;
  onOpenMenu?: () => void;
  elapsed?: string;
}

const REACTION_EMOJIS = ['❤️', '🔥', '😍', '😂', '👏'] as const;

interface RoundBtnProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  activeClass?: string;
  children: React.ReactNode;
}

const RoundBtn = ({ label, onClick, active, activeClass, children }: RoundBtnProps) => (
  <motion.button
    whileTap={{ scale: 0.88 }}
    aria-label={label}
    className={`w-9 h-9 rounded-full glass-chip flex items-center justify-center hover:bg-white/20 transition-colors shrink-0 ${
      active ? activeClass || 'text-pink-400' : ''
    }`}
    onClick={onClick}
  >
    {children}
  </motion.button>
);

/** Floating emoji burst animation on tap */
const ReactionBtn = ({
  emoji,
  onTap,
  count,
}: {
  emoji: string;
  onTap: () => void;
  count?: number;
}) => {
  const [burst, setBurst] = useState(false);

  const handleTap = () => {
    setBurst(true);
    setTimeout(() => setBurst(false), 300);
    onTap();
  };

  return (
    <div className="relative flex flex-col items-center">
      <motion.button
        aria-label={`React ${emoji}`}
        onClick={handleTap}
        whileTap={{ scale: 0.75 }}
        animate={burst ? { scale: [1, 1.35, 0.95, 1] } : { scale: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 shadow active:shadow-none transition-colors"
      >
        {emoji}
      </motion.button>
      <AnimatePresence>
        {burst && (
          <motion.span
            key="pop"
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -28, scale: 1.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute -top-6 text-base pointer-events-none select-none"
          >
            {emoji}
          </motion.span>
        )}
      </AnimatePresence>
      {emoji === '❤️' && typeof count === 'number' && (
        <span className="text-[9px] font-bold text-pink-300 leading-none mt-0.5 tabular-nums">
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </div>
  );
};

export const BottomToolbar = ({
  isHost,
  videoEnabled,
  cameraOn,
  micOn,
  isSpeaker = false,
  micRequestPending = false,
  isFollowing,
  likeCount,
  onLike,
  onReact,
  onOpenGift,
  onShare,
  onToggleCamera,
  onToggleMic,
  onRequestMic,
  onSwitchCamera,
  onToggleFilters,
  onLeave,
  onEnd,
  onChatSend,
  onOpenMenu,
  elapsed,
}: BottomToolbarProps) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
    className="absolute bottom-0 inset-x-0 z-30 px-3 pb-safe-or-3 pt-2 pointer-events-none"
    style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
  >
    {/* ── LIVE badge + Emoji Reaction Bar ── */}
    <div className="flex items-center justify-between mb-2 pointer-events-auto px-0.5">
      {/* LIVE pill on the left */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.55)]">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[11px] font-black text-white tracking-widest uppercase">LIVE</span>
        </div>
        {elapsed && (
          <span className="text-[11px] text-white/60 font-medium tabular-nums">{elapsed}</span>
        )}
      </div>

      {/* Emoji reaction buttons on the right */}
      <div className="flex items-end gap-1.5">
        {REACTION_EMOJIS.map((emoji) => (
          <ReactionBtn
            key={emoji}
            emoji={emoji}
            count={emoji === '❤️' ? likeCount : undefined}
            onTap={() => {
              if (emoji === '❤️') onLike();
              else if (onReact) onReact(emoji);
            }}
          />
        ))}
      </div>
    </div>

    <div className="flex items-end justify-between gap-2 pointer-events-auto w-full">
      {/* Chat input on the left */}
      <div className="flex-1 max-w-[55%]">
        <MessageInput onSend={onChatSend} />
      </div>

      {/* Action horizontal row on the right */}
      <div className="flex items-center gap-2 shrink-0">
        <RoundBtn label="Menu" onClick={onOpenMenu || (() => {})}>
          <Grid className="w-5 h-5 text-white/90" />
        </RoundBtn>

        {isHost || isSpeaker ? (
          <RoundBtn
            label={micOn ? 'Mute' : 'Unmute'}
            onClick={() => onToggleMic()}
            active={!micOn}
            activeClass="text-red-400"
          >
            {micOn ? <MouthIcon className="w-5 h-5 text-emerald-400" /> : <MouthOffIcon className="w-5 h-5 text-white/90" />}
          </RoundBtn>
        ) : (
          <RoundBtn
            label={micRequestPending ? 'Requested' : 'Request Mic'}
            onClick={() => {
              if (onRequestMic) onRequestMic();
            }}
            active={micRequestPending}
            activeClass="text-amber-400 animate-pulse border-amber-400"
          >
            <MouthIcon className={`w-5 h-5 ${micRequestPending ? 'text-amber-400' : 'text-white/90'}`} />
          </RoundBtn>
        )}

        {isHost && videoEnabled && (
          <RoundBtn label="Switch Camera" onClick={onSwitchCamera}>
             <FlipHorizontal className="w-5 h-5 text-white/90" />
          </RoundBtn>
        )}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onOpenGift}
            aria-label="Gift"
            className="w-12 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 shadow-[0_0_15px_rgba(236,72,153,0.4)] flex items-center justify-center shrink-0 relative"
          >
            <GiftIcon className="w-6 h-6 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  </motion.div>
);
