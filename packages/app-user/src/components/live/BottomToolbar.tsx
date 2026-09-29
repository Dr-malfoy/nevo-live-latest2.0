import { motion } from 'framer-motion';
import { PiHeartFill as Heart, PiGiftFill as GiftIcon, PiShareNetworkFill as Share2, PiMicrophoneFill as Mic, PiMicrophoneSlashFill as MicOff, PiVideoCameraFill as Video, PiVideoCameraSlashFill as VideoOff, PiArrowsLeftRightBold as FlipHorizontal, PiPhoneSlashFill as PhoneOff, PiMagicWandFill as Wand2, PiStickerFill as Sticker, PiSquaresFourFill as Grid } from 'react-icons/pi';
import { MessageInput } from './MessageInput';
import { Avatar } from '../user';

interface BottomToolbarProps {
  isHost: boolean;
  videoEnabled: boolean;
  cameraOn: boolean;
  micOn: boolean;
  isFollowing: boolean;
  likeCount: number;
  onLike: () => void;
  onOpenGift: () => void;
  onShare: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onSwitchCamera: () => void;
  onToggleFilters: () => void;
  onToggleStickers: () => void;
  onLeave: () => void;
  onEnd: () => void;
  onChatSend: (message: string) => void;
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

export const BottomToolbar = ({
  isHost,
  videoEnabled,
  cameraOn,
  micOn,
  isFollowing,
  likeCount,
  onLike,
  onOpenGift,
  onShare,
  onToggleCamera,
  onToggleMic,
  onSwitchCamera,
  onToggleFilters,
  onToggleStickers,
  onLeave,
  onEnd,
  onChatSend,
}: BottomToolbarProps) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: 'easeOut', delay: 0.1 }}
    className="absolute bottom-0 inset-x-0 z-30 px-3 pb-3 pt-6 pointer-events-none"
  >
    <div className="flex items-end justify-between gap-2 pointer-events-auto w-full">
      {/* Chat input on the left */}
      <div className="flex-1 max-w-[55%]">
        <MessageInput onSend={onChatSend} />
      </div>

      {/* Action horizontal row on the right */}
      <div className="flex items-center gap-2 shrink-0">
        <RoundBtn label="Menu" onClick={() => {}}>
          <Grid className="w-5 h-5 text-white/90" />
        </RoundBtn>
        <RoundBtn label={micOn ? 'Mute' : 'Unmute'} onClick={onToggleMic} active={!micOn} activeClass="text-red-400">
          {micOn ? <Mic className="w-5 h-5 text-white/90" /> : <MicOff className="w-5 h-5 text-white/90" />}
        </RoundBtn>
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
