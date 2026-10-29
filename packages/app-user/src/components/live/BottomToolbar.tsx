import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiHeartFill as Heart,
  PiGiftFill as GiftIcon,
  PiArrowsLeftRightBold as FlipHorizontal,
  PiSquaresFourFill as Grid,
} from 'react-icons/pi';
import { MouthIcon, MouthOffIcon } from './MouthIcons';
import { MessageInput } from './MessageInput';

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

/**
 * Love button — fires on tap with heart burst.
 * Placed beside the Gift button.
 */
const LoveBtn = ({ onTap }: { onTap: () => void }) => {
  const [sent, setSent] = useState(false);
  const [pop, setPop] = useState(false);
  const cooldown = useRef(false);

  const handlePress = () => {
    if (cooldown.current) return;
    cooldown.current = true;
    setSent(true);
    setPop(true);
    onTap();
    setTimeout(() => setPop(false), 420);
    setTimeout(() => {
      cooldown.current = false;
    }, 1200);
  };

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <motion.button
        aria-label="Send Love"
        onClick={handlePress}
        whileTap={{ scale: 0.82 }}
        animate={pop ? { scale: [1, 1.35, 0.92, 1] } : { scale: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
          sent
            ? 'bg-gradient-to-tr from-pink-500 to-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.55)] border border-pink-300/40'
            : 'bg-white/15 hover:bg-white/25 border border-white/20'
        }`}
      >
        <Heart
          className={`w-5 h-5 transition-colors duration-300 ${
            sent ? 'text-white' : 'text-pink-300'
          }`}
        />
      </motion.button>

      {/* Floating ❤️ mini burst on tap */}
      <AnimatePresence>
        {pop && (
          <motion.span
            key="lovepop"
            initial={{ opacity: 1, y: 0, scale: 0.9 }}
            animate={{ opacity: 0, y: -36, scale: 1.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute -top-9 text-lg pointer-events-none select-none"
          >
            ❤️
          </motion.span>
        )}
      </AnimatePresence>
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
    className="absolute bottom-0 inset-x-0 z-30 px-3 pt-2 pointer-events-none"
    style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
  >
    {/* ── Single bottom row: chat | controls | love | gift ── */}
    <div className="flex items-end justify-between gap-2 pointer-events-auto w-full">
      {/* Left: Chat input */}
      <div className="flex-1 min-w-0">
        <MessageInput onSend={onChatSend} />
      </div>

      {/* Right: icon buttons in a row */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Menu */}
        <RoundBtn label="Menu" onClick={onOpenMenu || (() => {})}>
          <Grid className="w-5 h-5 text-white/90" />
        </RoundBtn>

        {/* Mic toggle / request */}
        {isHost || isSpeaker ? (
          <RoundBtn
            label={micOn ? 'Mute' : 'Unmute'}
            onClick={() => onToggleMic()}
            active={!micOn}
            activeClass="text-red-400"
          >
            {micOn ? (
              <MouthIcon className="w-5 h-5 text-emerald-400" />
            ) : (
              <MouthOffIcon className="w-5 h-5 text-white/90" />
            )}
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
            <MouthIcon
              className={`w-5 h-5 ${micRequestPending ? 'text-amber-400' : 'text-white/90'}`}
            />
          </RoundBtn>
        )}

        {/* Switch camera (host only) */}
        {isHost && videoEnabled && (
          <RoundBtn label="Switch Camera" onClick={onSwitchCamera}>
            <FlipHorizontal className="w-5 h-5 text-white/90" />
          </RoundBtn>
        )}

        {/* ❤️ Love button (placed beside gift) */}
        <LoveBtn onTap={onLike} />

        {/* 🎁 Gift button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onOpenGift}
          aria-label="Gift"
          className="w-10 h-10 rounded-full bg-gradient-to-r from-[#FF2E93] to-[#FF5E62] shadow-[0_0_15px_rgba(255,46,147,0.45)] flex items-center justify-center shrink-0"
        >
          <GiftIcon className="w-5 h-5 text-white" />
        </motion.button>
      </div>
    </div>
  </motion.div>
);
