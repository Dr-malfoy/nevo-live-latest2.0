import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PiCaretLeftBold as ArrowLeft,
  PiWaveformBold as AudioLines,
  PiGiftFill as GiftIcon,
  PiSparkleFill as Sparkles,
  PiMicrophoneFill as Mic,
  PiDotsThreeBold as MoreHorizontal,
  PiPauseFill as Pause,
  PiPhoneFill as Phone,
  PiPhoneSlashFill as PhoneSlash,
  PiPhoneIncomingFill as PhoneIncoming,
  PiPhoneOutgoingFill as PhoneOutgoing,
  PiPhoneXFill as PhoneX,
  PiPlayFill as Play,
  PiPlusBold as Plus,
  PiPaperPlaneRightFill as Send,
  PiSmileyFill as Smile,
  PiThumbsUpFill as ThumbsUp,
  PiHeartFill as HeartFill,
  PiVideoCameraFill as Video,
  PiXBold as X,
  PiCheckBold as Check,
  PiChecksBold as Checks,
  PiClockBold as Clock,
  PiWarningCircleFill as AlertCircle,
  PiPencilSimpleFill as Pencil,
  PiTrashFill as Trash,
  PiCopyFill as Copy,
  PiFlagFill as Flag,
  PiBroomFill as Broom,
  PiUserFill as UserIcon,
  PiProhibitFill as Prohibit,
  PiImageFill as ImageIcon,
  PiCameraFill as CameraIcon,
  PiUsersThreeFill as UsersGroup,
  PiUserPlusFill as UserPlus,
} from 'react-icons/pi';
import { chatApi, callApi, giftsApi, uploadApi, reportApi, usersApi, streamsApi } from '../api';
import { securityApi } from '../api/economy.api';
import { optional } from '../api/pending';
import { useAuthStore, useSocketStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import { GiftPanel } from '../components/stream';
import { Modal } from '../components/ui';
import { CoinIcon, DiamondIcon } from '../components/ui/CurrencyIcon';
import { CallScreen } from '../components/call/CallScreen';
import { InsufficientCoinsModal } from '../components/call/InsufficientCoinsModal';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { requestMediaPermissions } from '../lib/permissions';
import { getMediaUrl } from '../lib/media';
import type { Gift } from '../types';
import type { ChatStreak } from '../api/chat.api';
import { markChatDeleted } from '../lib/deletedChats';

interface CallState {
  incoming?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    initiatorId: string;
    token: string;
    initiator: { nickname: string; avatar?: string } | null;
    coinsPerMinute?: number;
  };
  outgoing?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    token: string;
    callee: { nickname: string; avatar?: string } | null;
    coinsPerMinute?: number;
  };
}


const QUICK_REPLIES = [
  { label: 'Hi', emoji: '👋' },
  { label: 'Love', emoji: '💗' },
  { label: 'For you', emoji: '🎁' },
  { label: 'Starlink', emoji: '⭐' },
];

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏',
      '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
      '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨',
      '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱',
      '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '💩', '🤡', '👻', '👽', '🤖'
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: '👍',
    emojis: [
      '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇',
      '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙌', '👐', '🤲', '👏', '🙏',
      '✊', '👊', '🤛', '🤜', '💪', '💅', '✍️', '🤳', '👀', '👁️', '👅', '👄',
      '💋', '🧠', '🫀', '🫁', '👂', '👃'
    ],
  },
  {
    id: 'hearts',
    name: 'Love',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
      '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💐', '🌹', '🥀', '🌺',
      '🌸', '🌼', '🌻', '✨', '⭐', '🌟', '💫', '🔥'
    ],
  },
  {
    id: 'party',
    name: 'Party',
    icon: '🎉',
    emojis: [
      '🎉', '🎊', '🎈', '🎂', '🍰', '🧁', '🍩', '🍪', '🍫', '🍬', '🍭', '🍿',
      '🍾', '🥂', '🍻', '🍺', '🍷', '🍸', '🍹', '🍔', '🍕', '🍟', '🌭', '🌮',
      '🌯', '🍓', '🍒', '🍎', '🍉', '🍑'
    ],
  },
  {
    id: 'vibes',
    name: 'Vibes',
    icon: '🔥',
    emojis: [
      '🔥', '⚡', '💥', '💢', '💯', '🌈', '☀️', '🌙', '⭐', '🚀', '🛸', '👑',
      '🏆', '🥇', '🥈', '🥉', '🎯', '🎲', '🎮', '🎵', '🎶', '🎸', '🥁', '🎤'
    ],
  },
];

const countEmojiGlyphs = (text: string): number => {
  const stripped = text.replace(/\s+/g, '');
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      return Array.from(new (Intl as any).Segmenter().segment(stripped)).length;
    } catch {}
  }
  return Array.from(stripped).length;
};

const isPureEmojiMessage = (text?: string): boolean => {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const emojiRegex = /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\u200D|\uFE0F|\s)+$/u;
  if (!emojiRegex.test(trimmed)) return false;
  return countEmojiGlyphs(trimmed) <= 6;
};

const getEmojiFontSize = (text?: string): string => {
  if (!text) return 'text-5xl';
  const count = countEmojiGlyphs(text.trim());
  if (count <= 1) return 'text-6xl sm:text-7xl';
  if (count === 2) return 'text-5xl sm:text-6xl';
  if (count === 3) return 'text-4xl sm:text-5xl';
  return 'text-3xl sm:text-4xl';
};

const REPORT_REASONS = [
  'Spam or advertising',
  'Harassment or bullying',
  'Inappropriate or adult content',
  'Fraud or scam',
  'Impersonation or fake account',
  'Hate speech or abusive language',
  'Other violation',
];

const dayKey = (iso?: string) => (iso ? new Date(iso).toDateString() : '');

const dayLabel = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
};

const clockTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

/** Voice bubble */
const VoiceBubble = ({ url, duration, mine }: { url?: string; duration?: number; mine: boolean }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number>(duration && duration > 0 ? duration : 0);
  const [loadError, setLoadError] = useState(false);

  const resolvedUrl = useMemo(() => (url ? getMediaUrl(url) : ''), [url]);

  useEffect(() => {
    if (duration && duration > 0) {
      setAudioDuration(duration);
    }
  }, [duration]);

  useEffect(() => {
    if (!resolvedUrl) return;
    setLoadError(false);
    setCurrentTime(0);

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audio.src = resolvedUrl;
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0 && !audioDuration) {
        setAudioDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    const onError = () => {
      console.warn('Audio failed to load from:', resolvedUrl);
      setPlaying(false);
      setLoadError(true);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audioRef.current = null;
    };
  }, [resolvedUrl]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setPlaying(true);
            setLoadError(false);
          })
          .catch((err) => {
            console.warn('Audio playback error:', err);
            setPlaying(false);
            setLoadError(true);
          });
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const dur = audioDuration || (audio && Number.isFinite(audio.duration) ? audio.duration : 0);
    if (!audio || dur <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = ratio * dur;
    setCurrentTime(audio.currentTime);
  };

  const effectiveDuration = audioDuration || (duration && duration > 0 ? duration : 0);
  const progress = effectiveDuration > 0 ? Math.min(1, currentTime / effectiveDuration) : 0;

  const formatSecs = (secs: number) => {
    const s = Math.round(secs);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const displayTime = playing
    ? `${formatSecs(currentTime)} / ${formatSecs(effectiveDuration)}`
    : effectiveDuration > 0
    ? `${Math.round(effectiveDuration)}"`
    : '';

  return (
    <div className="flex items-center gap-2 min-w-[160px] sm:min-w-[180px] max-w-[240px] py-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play voice message'}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs transition-transform active:scale-95 ${
          mine ? 'bg-white/25 text-white hover:bg-white/35' : 'bg-surface-sunken text-ink hover:bg-surface-sunken/80'
        }`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Progress / Seek bar */}
      <div
        onClick={handleSeek}
        className="flex-1 h-4 flex items-center cursor-pointer group py-1"
        title="Seek audio"
      >
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${mine ? 'bg-white/30' : 'bg-line-strong'}`}>
          <div
            className={`h-full transition-[width] duration-100 rounded-full ${mine ? 'bg-white' : 'bg-primary-500'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <span className={`text-[11px] tabular-nums font-semibold shrink-0 select-none ${mine ? 'text-white/90' : 'text-ink-muted'}`}>
        {loadError ? 'Error' : displayTime}
      </span>
    </div>
  );
};

interface VoiceReviewProps {
  voice: { blob: Blob; url: string; duration: number };
  onCancel: () => void;
  onSend: () => void;
  sending: boolean;
}

const VoiceReviewBar = ({ voice, onCancel, onSend, sending }: VoiceReviewProps) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(voice.url);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [voice.url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  };

  const progress = voice.duration > 0 ? Math.min(1, currentTime / voice.duration) : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-full flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-white border-t border-line safe-bottom animate-in fade-in slide-in-from-bottom-2 box-border">
      {/* Discard Button */}
      <button
        onClick={onCancel}
        disabled={sending}
        title="Discard voice recording"
        aria-label="Discard voice recording"
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 active:scale-95 transition-all shrink-0 border border-rose-200"
      >
        <Trash className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
      </button>

      {/* Review Player Pill */}
      <div className="flex-1 flex items-center gap-2 sm:gap-2.5 h-10 sm:h-11 px-2.5 sm:px-3.5 rounded-full bg-surface-sunken border border-line-subtle min-w-0">
        <button
          onClick={togglePlay}
          disabled={sending}
          aria-label={playing ? 'Pause preview' : 'Play preview'}
          className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-2xs hover:bg-primary-700 active:scale-95 transition-all"
        >
          {playing ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />}
        </button>

        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-ink-muted leading-none">
            <span className="tabular-nums">{formatTime(currentTime)}</span>
            <span className="tabular-nums font-bold text-primary-600">{formatTime(voice.duration)}</span>
          </div>
          <div
            onClick={(e) => {
              const audio = audioRef.current;
              if (!audio || voice.duration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              audio.currentTime = ratio * voice.duration;
              setCurrentTime(audio.currentTime);
            }}
            className="w-full h-1.5 rounded-full bg-line-strong overflow-hidden cursor-pointer relative"
          >
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 transition-[width] duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Send Button */}
      <button
        onClick={onSend}
        disabled={sending}
        title="Send voice message"
        aria-label="Send voice message"
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shrink-0 shadow-sm disabled:opacity-50 active:scale-95 transition-all"
      >
        {sending ? (
          <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
        )}
      </button>
    </div>
  );
};

const isMediaUrl = (val?: string) => {
  if (!val || typeof val !== 'string') return false;
  const t = val.trim();
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('/') ||
    t.startsWith('data:') ||
    t.startsWith('blob:') ||
    /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(t)
  );
};

const KNOWN_GIFT_ICONS: Record<string, string> = {
  rose: '🌹',
  lollipop: '🍭',
  crown: '👑',
  rocket: '🚀',
  lamborghini: '🏎️',
  car: '🏎️',
  yacht: '🛥️',
  boat: '🛥️',
  castle: '🏰',
  diamond: '💎',
  heart: '💖',
  kiss: '💋',
  ring: '💍',
  cake: '🎂',
  fire: '🔥',
  balloon: '🎈',
  star: '⭐',
};

const getFallbackEmoji = (name?: string) => {
  if (!name) return '🎁';
  const lower = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(KNOWN_GIFT_ICONS)) {
    if (lower.includes(k)) return v;
  }
  return '🎁';
};

const resolveGiftIcon = (item: any, giftList: any[] = []) => {
  const nameLower = (item?.giftName || '').toLowerCase().trim();

  // If gift name is Rose, ensure it always uses 🌹 unless a custom image URL was provided
  if (nameLower.includes('rose')) {
    if (item?.giftIcon && isMediaUrl(item.giftIcon)) {
      return item.giftIcon.trim();
    }
    return '🌹';
  }

  // If item has a valid media url or emoji (and not generic 🎁)
  if (item?.giftIcon && typeof item.giftIcon === 'string' && item.giftIcon.trim() && item.giftIcon !== '🎁') {
    return item.giftIcon.trim();
  }

  // Lookup in loaded giftList
  if (giftList.length > 0) {
    const found = giftList.find(
      (g: any) =>
        (item?.giftId && (g._id === item.giftId || g.giftId === item.giftId)) ||
        (nameLower && g.name?.toLowerCase() === nameLower)
    );
    if (found?.icon && found.icon !== '🎁') {
      if (nameLower.includes('rose') && found.icon === '🎈') return '🌹';
      return found.icon;
    }
  }

  return getFallbackEmoji(item?.giftName);
};

interface GiftBurstData {
  id: string;
  senderName: string;
  giftName: string;
  giftIcon: string;
  count: number;
  priceDiamonds?: number;
}

const SPARKLE_POSITIONS = [
  { top: '10%', left: '15%', delay: 0.1 },
  { top: '20%', right: '15%', delay: 0.4 },
  { top: '65%', left: '12%', delay: 0.7 },
  { top: '70%', right: '14%', delay: 0.3 },
  { top: '12%', left: '55%', delay: 0.5 },
];

const ChatGiftOverlay = ({
  burst,
  onDismiss,
}: {
  burst: GiftBurstData | null;
  onDismiss: () => void;
}) => {
  const icon = burst ? resolveGiftIcon(burst) : '🎁';
  return (
    <AnimatePresence>
      {burst && (
        <motion.div
          key={burst.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onDismiss}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/45 backdrop-blur-[3px] select-none cursor-pointer"
        >
          {/* Floating gift mini particles drifting up */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  y: 140,
                  x: (i - 3) * 50 + Math.sin(i) * 20,
                  scale: 0.5,
                }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: -300,
                  scale: [0.5, 1, 0.8],
                }}
                transition={{
                  duration: 2.2 + (i % 3) * 0.3,
                  delay: i * 0.12,
                  ease: 'easeOut',
                }}
                className="absolute top-1/2 left-1/2"
              >
                {isMediaUrl(icon) ? (
                  <img
                    src={getMediaUrl(icon)}
                    alt=""
                    className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span className="text-3xl drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]">
                    {icon}
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          {/* Main Burst Card */}
          <motion.div
            initial={{ scale: 0.3, y: 50, rotate: -8 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            className="relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient pulsing glow */}
            <div className="absolute -inset-10 rounded-full bg-gradient-to-tr from-pink-500/40 via-purple-500/40 to-yellow-400/30 blur-3xl animate-pulse" />

            {/* Sparkles rotating around center */}
            {SPARKLE_POSITIONS.map((pos, idx) => (
              <motion.span
                key={idx}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.3, 0.7], opacity: [0, 1, 0] }}
                transition={{ duration: 1.4, delay: pos.delay, repeat: Infinity }}
                className="absolute text-yellow-300 pointer-events-none drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]"
                style={pos}
              >
                <Sparkles className="w-6 h-6" />
              </motion.span>
            ))}

            {/* Gift Icon Display Bubble */}
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                rotate: [0, -3, 3, 0],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-pink-500/40 via-purple-600/30 to-indigo-600/40 border-2 border-white/30 backdrop-blur-md shadow-[0_0_40px_rgba(236,72,153,0.5)] flex items-center justify-center overflow-hidden"
            >
              {isMediaUrl(icon) ? (
                <img
                  src={getMediaUrl(icon)}
                  alt={burst.giftName}
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]"
                  crossOrigin="anonymous"
                />
              ) : (
                <span className="text-7xl sm:text-8xl drop-shadow-[0_0_24px_rgba(236,72,153,0.9)] select-none">
                  {icon}
                </span>
              )}

              {/* Shimmer line sweep */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                  className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                />
              </div>
            </motion.div>

            {/* Count multiplier pill */}
            <motion.div
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.18, type: 'spring', stiffness: 350, damping: 14 }}
              className="-mt-4 z-10 px-4 py-1 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-slate-950 font-black text-lg sm:text-xl shadow-[0_4px_16px_rgba(245,158,11,0.5)] border-2 border-white flex items-center gap-1"
            >
              <span className="text-sm font-bold text-slate-900/80">COMBO</span>
              <span>×{burst.count}</span>
            </motion.div>

            {/* Sender and Gift Info Banner */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.35 }}
              className="mt-4 px-6 py-2.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-center shadow-xl"
            >
              <p className="text-base sm:text-lg font-black text-white">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-300 font-extrabold">
                  {burst.senderName}
                </span>{' '}
                sent a gift!
              </p>
              <p className="text-sm font-bold text-pink-300 mt-0.5">
                {burst.giftName} × {burst.count}
              </p>
            </motion.div>

            <span className="text-[11px] text-white/50 mt-3 font-medium">Tap anywhere to close</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ChatThread = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [messages, setMessages] = useState<any[]>([]);
  const [chatData, setChatData] = useState<any>(null);
  const [other, setOther] = useState<any>(null);
  const [streak, setStreak] = useState<ChatStreak | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [giftList, setGiftList] = useState<Gift[]>([]);
  const [giftBurst, setGiftBurst] = useState<GiftBurstData | null>(null);
  const giftBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Group chat states
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [addMemberResults, setAddMemberResults] = useState<any[]>([]);
  const [addMemberSearching, setAddMemberSearching] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);

  const isGroup = Boolean(chatData?.type === 'group' || chatData?.isGroup || other?.isGroup);
  const participantsMap = useMemo(() => {
    const map = new Map<string, any>();
    if (chatData?.participants && Array.isArray(chatData.participants)) {
      chatData.participants.forEach((p: any) => {
        if (p?._id) map.set(p._id.toString(), p);
      });
    }
    return map;
  }, [chatData?.participants]);

  const handleSearchAddMembers = async () => {
    if (!addMemberQuery.trim()) {
      setAddMemberResults([]);
      return;
    }
    setAddMemberSearching(true);
    try {
      const { data } = await usersApi.searchUsers(addMemberQuery.trim(), { limit: 20 });
      const existing = new Set((chatData?.participants || []).map((p: any) => p._id?.toString() || p.toString()));
      const filtered = (data.data || []).filter((u: any) => !existing.has(u._id));
      setAddMemberResults(filtered);
    } catch {
      setAddMemberResults([]);
    } finally {
      setAddMemberSearching(false);
    }
  };

  const handleAddMemberToGroup = async (targetUser: any) => {
    if (!chatId || !targetUser?._id) return;
    setAddingMemberId(targetUser._id);
    try {
      const { data } = await chatApi.addGroupMembers(chatId, [targetUser._id]);
      if (data.success && data.data) {
        setChatData(data.data);
        showToast(`${targetUser.nickname || 'User'} added to group`, 'success');
        setAddMemberResults((prev) => prev.filter((u) => u._id !== targetUser._id));
        loadChat();
      } else {
        showToast('Could not add member', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to add member', 'error');
    } finally {
      setAddingMemberId(null);
    }
  };

  // Group editing state
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupAvatarInput, setGroupAvatarInput] = useState('');
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);
  const [savingGroupInfo, setSavingGroupInfo] = useState(false);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  const handleGroupAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size should be less than 10MB', 'error');
      return;
    }
    setUploadingGroupAvatar(true);
    try {
      const url = await uploadApi.upload(file, 'group-avatars');
      setGroupAvatarInput(url);
      showToast('Group picture uploaded!', 'success');
    } catch {
      showToast('Failed to upload picture', 'error');
    } finally {
      setUploadingGroupAvatar(false);
      if (groupAvatarInputRef.current) groupAvatarInputRef.current.value = '';
    }
  };

  const handleSaveGroupInfo = async () => {
    if (!chatId) return;
    if (!groupNameInput.trim()) {
      showToast('Group name cannot be empty', 'error');
      return;
    }
    setSavingGroupInfo(true);
    try {
      const { data } = await chatApi.updateGroupChat(chatId, {
        name: groupNameInput.trim(),
        avatar: groupAvatarInput,
      });
      if (data.success && data.data) {
        setChatData(data.data);
        if (data.data.other) {
          setOther(data.data.other);
        }
        showToast('Group info updated successfully!', 'success');
        setShowEditGroupModal(false);
        loadChat();
      } else {
        showToast(data.message || 'Could not update group', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update group', 'error');
    } finally {
      setSavingGroupInfo(false);
    }
  };

  useEffect(() => {
    giftsApi
      .list()
      .then(({ data }) => {
        if (data.success && data.data) {
          setGiftList(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const triggerGiftBurst = useCallback((data: GiftBurstData) => {
    if (giftBurstTimerRef.current) clearTimeout(giftBurstTimerRef.current);
    setGiftBurst(data);
    giftBurstTimerRef.current = setTimeout(() => {
      setGiftBurst(null);
    }, 3800);
  }, []);

  useEffect(() => {
    return () => {
      if (giftBurstTimerRef.current) clearTimeout(giftBurstTimerRef.current);
    };
  }, []);

  const [voiceReview, setVoiceReview] = useState<{ blob: Blob; url: string; duration: number } | null>(null);
  const [sendingVoice, setSendingVoice] = useState(false);

  useEffect(() => {
    return () => {
      if (voiceReview?.url) {
        URL.revokeObjectURL(voiceReview.url);
      }
    };
  }, [voiceReview]);

  const [call, setCall] = useState<CallState | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [insufficientCoins, setInsufficientCoins] = useState<{
    visible: boolean;
    reason?: string;
    coinsPerMinute?: number;
    balance?: number;
    minBalance?: number;
  }>({ visible: false });


  // Context / Action state
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [showQuickReacts, setShowQuickReacts] = useState(false);
  const likeLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLikeStart = () => {
    likeLongPressTimer.current = setTimeout(() => {
      setShowQuickReacts(true);
    }, 350);
  };

  const handleLikeEnd = () => {
    if (likeLongPressTimer.current) {
      clearTimeout(likeLongPressTimer.current);
      likeLongPressTimer.current = null;
    }
  };

  const handleLikeClick = () => {
    if (showQuickReacts) {
      setShowQuickReacts(false);
      return;
    }
    sendText('👍');
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('smileys');

  const activeCategoryEmojis = useMemo(() => {
    const found = EMOJI_CATEGORIES.find((c) => c.id === selectedEmojiCategory);
    return found ? found.emojis : EMOJI_CATEGORIES[0].emojis;
  }, [selectedEmojiCategory]);

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'user' | 'chat' | 'message'; id: string }>({
    type: 'user',
    id: '',
  });
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Call price configuration
  const [showSetCallPriceModal, setShowSetCallPriceModal] = useState(false);
  const [settingCallPrice, setSettingCallPrice] = useState(false);
  const [callPriceInput, setCallPriceInput] = useState<number>((user as any)?.callPricePerMinute ?? 1000);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callRef = useRef<CallState | null>(null);
  callRef.current = call;
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    recording,
    duration,
    error: voiceError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();
  const recordingRef = useRef(false);

  const loadChat = () => {
    if (!chatId) return;
    chatApi
      .getMessages(chatId, { limit: 100 })
      .then(({ data }) => {
        if (data.success) {
          const list = data.data || [];
          setMessages(list);
          if (socket) {
            socket.emit('chat:delivered', { chatId });
          }
        }
      })
      .finally(() => setLoading(false));
  };

  // Resolve the chat details & other participant
  useEffect(() => {
    if (!chatId) return;
    chatApi
      .getChat(chatId)
      .then(({ data }) => {
        if (data.success && data.data) {
          setChatData(data.data);
          if (data.data.other) {
            setOther(data.data.other);
          }
        }
      })
      .catch(() => {
        chatApi.getChats({ limit: 50 }).then(({ data }) => {
          if (data.success) {
            const found = (data.data || []).find((x: any) => x._id === chatId);
            if (found) {
              setChatData(found);
              if (found.other) setOther(found.other);
            }
          }
        });
      });
  }, [chatId]);

  useEffect(() => {
    if (!other?._id) return;
    callApi
      .getQuote(other._id)
      .then(({ data }) => {
        if (data.success && data.data?.coinsPerMinute != null) {
          setOther((prev: any) => ({ ...prev, callPricePerMinute: data.data.coinsPerMinute }));
        }
      })
      .catch(() => {
        usersApi.getProfile(other._id).then(({ data }) => {
          if (data.success && data.data?.callPricePerMinute !== undefined) {
            setOther((prev: any) => ({ ...prev, callPricePerMinute: data.data.callPricePerMinute }));
          }
        }).catch(() => {});
      });
  }, [other?._id]);

  // Check active live stream for other participant + listen for live status updates
  useEffect(() => {
    if (!other?._id) return;
    const fetchLive = () => {
      streamsApi
        .getUserActiveStream(other._id)
        .then(({ data }) => {
          if (data?.success) {
            setOther((prev: any) => {
              if (!prev) return prev;
              const isLive = Boolean(data.data && data.data.status === 'live');
              return {
                ...prev,
                isLive,
                liveStreamId: isLive ? (data.data?._id || prev.liveStreamId) : null,
                liveStream: isLive ? data.data : null,
              };
            });
          }
        })
        .catch(() => {});
    };

    fetchLive();
    const interval = setInterval(fetchLive, 8000);

    if (socket) {
      const handleLiveStatus = (payload: { userId: string; isLive: boolean; streamId?: string; liveStream?: any }) => {
        if (payload?.userId === other._id) {
          setOther((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              isLive: payload.isLive,
              liveStreamId: payload.isLive ? (payload.streamId || prev.liveStreamId) : null,
              liveStream: payload.isLive ? (payload.liveStream || prev.liveStream) : null,
            };
          });
        }
      };

      socket.on('user:live-status', handleLiveStatus);
      return () => {
        clearInterval(interval);
        socket.off('user:live-status', handleLiveStatus);
      };
    }

    return () => clearInterval(interval);
  }, [other?._id, socket]);

  // Streak tag
  useEffect(() => {
    if (!chatId) return;
    optional(chatApi.getStreak(chatId))
      .then((res) => setStreak(res?.data || null))
      .catch(() => {});
  }, [chatId]);

  useEffect(() => {
    loadChat();
  }, [chatId]);

  // Mark read on open
  useEffect(() => {
    if (!chatId) return;
    chatApi.markRead(chatId).catch(() => {});
    if (socket) {
      socket.emit('chat:read', { chatId });
    }
  }, [chatId, socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const otherIdRef = useRef<string | undefined>(undefined);
  otherIdRef.current = other?._id;

  // Real-time socket events
  useEffect(() => {
    if (!socket || !chatId) return;

    const handler = (payload: any) => {
      if (payload?.chatId !== chatId) return;
      const msg = payload.message;
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));

      if (msg.senderId !== user?._id) {
        chatApi.markRead(chatId).catch(() => {});
        socket.emit('chat:read', { chatId });
        socket.emit('chat:delivered', { chatId });

        if (msg.kind === 'gift') {
          triggerGiftBurst({
            id: `burst-${msg._id || Date.now()}`,
            senderName: other?.nickname || 'Friend',
            giftName: msg.giftName || 'Gift',
            giftIcon: msg.giftIcon || '🎁',
            count: msg.giftCount || 1,
            priceDiamonds: msg.giftPrice,
          });
        }
      }
    };
    socket.on('chat:message', handler);

    // Read / Seen
    const onChatRead = (payload: any) => {
      if (payload?.chatId === chatId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?._id
              ? { ...m, read: true, status: 'seen', readAt: payload.readAt || new Date().toISOString() }
              : m
          )
        );
      }
    };
    socket.on('chat:read', onChatRead);
    socket.on('chat:seen', onChatRead);

    // Delivered
    const onChatDelivered = (payload: any) => {
      if (payload?.chatId === chatId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?._id && !m.read
              ? { ...m, delivered: true, status: 'delivered', deliveredAt: payload.deliveredAt || new Date().toISOString() }
              : m
          )
        );
      }
    };
    socket.on('chat:delivered', onChatDelivered);

    // Message edited
    const onMessageUpdated = (payload: any) => {
      if (payload?.chatId === chatId && payload?.message) {
        setMessages((prev) =>
          prev.map((m) => (m._id === payload.message._id ? payload.message : m))
        );
      }
    };
    socket.on('chat:message_updated', onMessageUpdated);

    // Message deleted
    const onMessageDeleted = (payload: any) => {
      if (payload?.chatId === chatId && payload?.messageId) {
        setMessages((prev) => prev.filter((m) => m._id !== payload.messageId));
      }
    };
    socket.on('chat:message_deleted', onMessageDeleted);

    // Chat cleared
    const onChatCleared = (payload: any) => {
      if (payload?.chatId === chatId) {
        setMessages([]);
      }
    };
    socket.on('chat:cleared', onChatCleared);

    const onCallInvite = (payload: any) => {
      if (payload?.initiatorId === otherIdRef.current) {
        socket.emit('call:ringing', { callId: payload.callId });
        setCall({
          incoming: {
            callId: payload.callId,
            channel: payload.channel,
            type: payload.type,
            initiatorId: payload.initiatorId,
            token: payload.token,
            initiator: other ? { nickname: other.nickname, avatar: other.avatar } : null,
            coinsPerMinute: payload.coinsPerMinute,
          },
        });
      }
    };
    socket.on('call:invite', onCallInvite);


    const onCallAccept = (payload: any) => {
      if (payload?.callId && callRef.current?.outgoing?.callId === payload.callId) {
        setCallAccepted(true);
        if (payload?.audienceCoins != null) {
          updateUser({ coins: payload.audienceCoins });
        }
      }
    };
    socket.on('call:accept', onCallAccept);

    const onMemberAdded = (payload: any) => {
      if (payload?.chatId === chatId && payload?.chat) {
        setChatData(payload.chat);
      }
    };
    socket.on('chat:member-added', onMemberAdded);

    const onGroupUpdated = (payload: any) => {
      if (payload?.chatId === chatId) {
        if (payload.chat) setChatData(payload.chat);
        setOther((prev: any) => ({
          ...prev,
          nickname: payload.name || prev?.nickname,
          avatar: payload.avatar !== undefined ? payload.avatar : prev?.avatar,
        }));
      }
    };
    socket.on('chat:group-updated', onGroupUpdated);

    return () => {
      socket.off('chat:message', handler);
      socket.off('chat:read', onChatRead);
      socket.off('chat:seen', onChatRead);
      socket.off('chat:delivered', onChatDelivered);
      socket.off('chat:message_updated', onMessageUpdated);
      socket.off('chat:message_deleted', onMessageDeleted);
      socket.off('chat:cleared', onChatCleared);
      socket.off('call:invite', onCallInvite);
      socket.off('call:accept', onCallAccept);
      socket.off('chat:member-added', onMemberAdded);
      socket.off('chat:group-updated', onGroupUpdated);
    };
  }, [socket, chatId, user, other]);

  /* ── Message Sending & Editing ────────────────────────────────── */

  const sendText = async (text: string) => {
    if (!text.trim() || !chatId) return;
    const trimmed = text.trim();

    // If we're editing an existing message
    if (editingMessage) {
      const msgId = editingMessage._id;
      setEditingMessage(null);
      setInput('');
      try {
        const { data } = await chatApi.editMessage(chatId, msgId, trimmed);
        if (data.success && data.data) {
          setMessages((prev) => prev.map((m) => (m._id === msgId ? data.data : m)));
          showToast('Message edited', 'success');
          return;
        }
        throw new Error(data.error || 'Failed to edit message');
      } catch (err: any) {
        showToast(err?.response?.data?.error || err?.message || 'Could not edit message', 'error');
      }
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      senderId: user?._id,
      message: trimmed,
      createdAt: new Date().toISOString(),
      read: false,
      delivered: false,
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setSending(true);

    try {
      const { data } = await chatApi.sendMessage(chatId, trimmed);
      if (data.success && data.data) {
        setMessages((prev) => prev.map((m) => (m._id === tempId ? data.data : m)));
        return;
      }
      throw new Error(data.error || 'send failed');
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, failed: true, status: 'failed' } : m))
      );
      showToast('Message could not be sent', 'error');
    } finally {
      setSending(false);
    }
  };

  const retrySend = async (msg: any) => {
    setMessages((prev) => prev.filter((m) => m._id !== msg._id));
    await sendText(msg.message);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setShowEmojiPicker(false);
    await sendText(text);
  };

  /* ── Long Press Handlers ───────────────────────────────────────── */

  const handlePointerDownMessage = (msg: any) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setSelectedMessage(msg);
    }, 450);
  };

  const handlePointerUpMessage = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCopyMessage = () => {
    if (!selectedMessage?.message) return;
    navigator.clipboard.writeText(selectedMessage.message);
    showToast('Copied to clipboard', 'success');
    setSelectedMessage(null);
  };

  const handleStartEditMessage = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setInput(selectedMessage.message || '');
    setSelectedMessage(null);
    inputRef.current?.focus();
  };

  const handleDeleteSingleMessage = async () => {
    if (!selectedMessage || !chatId) return;
    const msgId = selectedMessage._id;
    setSelectedMessage(null);

    setMessages((prev) => prev.filter((m) => m._id !== msgId));
    try {
      await chatApi.deleteMessage(chatId, msgId);
      showToast('Message deleted', 'success');
    } catch (err: any) {
      loadChat();
      showToast(err?.response?.data?.error || 'Could not delete message', 'error');
    }
  };

  const handleClearWholeConversation = async () => {
    if (!chatId) return;
    setShowClearConfirm(false);
    setShowOptionsMenu(false);
    setMessages([]);
    try {
      await chatApi.clearChat(chatId);
      showToast('Chat history cleared', 'success');
    } catch (err: any) {
      loadChat();
      showToast(err?.response?.data?.error || 'Could not clear chat', 'error');
    }
  };

  const handleDeleteConversation = async () => {
    if (!chatId) return;
    markChatDeleted(chatId, user?._id);
    if (other?._id) markChatDeleted(other._id, user?._id);
    setShowDeleteChatConfirm(false);
    setShowOptionsMenu(false);
    try {
      if (!chatId.startsWith('official_')) {
        await chatApi.deleteChat(chatId);
      }
      showToast('Conversation removed', 'success');
      navigate('/messages');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not delete conversation', 'error');
    }
  };

  const handleConfirmBlock = async () => {
    if (!other?._id) return;
    setShowBlockConfirm(false);
    setShowOptionsMenu(false);
    try {
      await usersApi.blockUser(other._id);
      showToast('User blocked successfully', 'success');
      navigate('/messages');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to block user', 'error');
    }
  };

  const handleOpenReport = (type: 'user' | 'chat' | 'message', id: string) => {
    setSelectedMessage(null);
    setShowOptionsMenu(false);
    setReportTarget({ type, id });
    setSelectedReason(REPORT_REASONS[0]);
    setReportDetails('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportTarget.id) return;
    setSubmittingReport(true);
    try {
      await reportApi.createReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason: selectedReason,
        details: reportDetails.trim(),
      });
      setShowReportModal(false);
      showToast('Report submitted. Our safety team will review it.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to submit report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  /* ── Calls & Gifts ──────────────────────────────────────────────── */

  const startCall = async (type: 'audio' | 'video') => {
    // Check & request camera/mic permissions
    const perm = await requestMediaPermissions(type);
    if (!perm.granted) {
      showToast(perm.error || 'Media permission denied', 'error');
      return;
    }

    if (isGroup) {
      const targetIds = (chatData?.participants || [])
        .map((p: any) => p._id)
        .filter((id: string) => id && id !== user?._id);

      if (targetIds.length === 0) {
        showToast('No other members to call in this group', 'error');
        return;
      }

      try {
        setCallAccepted(false);
        const { data } = await callApi.create(targetIds, type, 'group');
        if (data.success && data.data) {
          setCall({
            outgoing: {
              callId: data.data.callId,
              channel: data.data.channel,
              type: data.data.type,
              token: data.data.token,
              callee: { nickname: chatData?.name || 'Group Call' },
              coinsPerMinute: 0,
            },
          });
        }
      } catch (err: any) {
        showToast(err?.response?.data?.message || 'Failed to start group call', 'error');
      }
      return;
    }

    if (!other?._id) return;

    try {
      // 1. Balance Check & Price Quote
      const { data: quoteRes } = await callApi.getQuote(other._id);
      if (quoteRes.success && quoteRes.data) {
        if (!quoteRes.data.canCall) {
          setInsufficientCoins({
            visible: true,
            reason: quoteRes.data.reason,
            coinsPerMinute: quoteRes.data.coinsPerMinute,
            balance: quoteRes.data.balance,
            minBalance: quoteRes.data.minBalance,
          });
          return;
        }
      }

      // 2. Start Call Request
      setCallAccepted(false);
      const { data } = await callApi.create([other._id], type, 'messenger');
      if (data.success && data.data) {
        const isOnline = data.data.recipientOnline ?? Boolean(other.online);
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
            callee: { nickname: other.nickname, avatar: other.avatar, online: isOnline },
            coinsPerMinute: data.data.coinsPerMinute || quoteRes.data?.coinsPerMinute || other.callPricePerMinute || 1000,
            isFreeMinuteApplied: data.data.isFreeMinuteApplied,
          },
        });
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      if (err.response?.status === 402 || errorData?.error?.includes('Insufficient Coins')) {
        const rate = other?.callPricePerMinute || 1000;
        setInsufficientCoins({
          visible: true,
          reason: errorData?.error || 'Insufficient Coins to start call',
          coinsPerMinute: rate,
          balance: user?.coins || 0,
          minBalance: rate * 1,
        });
      } else {
        showToast(err.response?.data?.error || err.message || 'Could not start the call', 'error');
      }
    }
  };


  const handleSendGift = async (gift: Gift, quantity: number) => {
    if (!other?._id || !chatId) return;
    try {
      const { data } = await giftsApi.send(other._id, gift._id, quantity);
      if (data.success) {
        if (data.data?.senderCoins != null) {
          updateUser({
            coins: data.data.senderCoins,
            diamonds: data.data.senderDiamonds ?? user?.diamonds,
          });
        } else if (data.data?.senderBalance != null) {
          updateUser({ coins: data.data.senderBalance });
        }
      }

      const resolvedIcon = resolveGiftIcon(
        { giftName: gift.name, giftIcon: gift.icon, giftId: gift._id },
        giftList
      );

      const { data: msg } = await chatApi.sendMessage(chatId, `Sent ${gift.name} x${quantity}`, {
        kind: 'gift',
        giftId: gift._id,
        giftName: gift.name,
        giftIcon: resolvedIcon,
        giftAnimation: (gift as any).animationUrl || (gift as any).animation,
        giftCount: quantity,
        giftPrice: gift.priceDiamonds,
      });

      const messageToStore = {
        ...(msg?.data || {}),
        kind: 'gift',
        giftId: gift._id,
        giftName: gift.name,
        giftIcon: resolvedIcon,
        giftCount: quantity,
        senderId: user?._id,
      };
      setMessages((prev) => [...prev, messageToStore]);

      const costDiamonds = (gift.priceDiamonds || 0) * quantity;
      showToast(`Sent ${quantity}x ${gift.name}! (-${costDiamonds.toLocaleString()} Diamonds)`, 'success');
      setShowGift(false);
      triggerGiftBurst({
        id: `burst-${Date.now()}`,
        senderName: 'You',
        giftName: gift.name,
        giftIcon: resolvedIcon,
        count: quantity,
        priceDiamonds: gift.priceDiamonds,
      });
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send gift', 'error');
      throw err;
    }
  };

  const handleVoiceStart = async () => {
    recordingRef.current = true;
    await startRecording();
  };

  const handleVoiceStop = async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    const result = await stopRecording();
    if (!result) return;
    if (result.duration < 1 && result.blob.size < 500) {
      showToast('Hold longer to record a voice message', 'info');
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setVoiceReview({
      blob: result.blob,
      url,
      duration: result.duration,
    });
  };

  const handleSendVoiceReview = async () => {
    if (!voiceReview || !chatId || sendingVoice) return;
    setSendingVoice(true);

    const tempId = `temp-voice-${Date.now()}`;
    const localReview = voiceReview;
    setVoiceReview(null);

    const optimisticMsg: any = {
      _id: tempId,
      senderId: user?._id,
      message: 'Voice message',
      kind: 'voice',
      voiceUrl: localReview.url,
      voiceDuration: Math.round(localReview.duration),
      createdAt: new Date().toISOString(),
      read: false,
      delivered: false,
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const url = await uploadApi.upload(localReview.blob, 'voice-messages');
      const { data } = await chatApi.sendMessage(chatId, 'Voice message', {
        kind: 'voice',
        voiceUrl: url,
        voiceDuration: Math.round(localReview.duration),
      });
      if (data.success && data.data) {
        setMessages((prev) => prev.map((m) => (m._id === tempId ? data.data : m)));
      }
      showToast('Voice message sent', 'success');
    } catch (err) {
      console.error('Failed to send voice message:', err);
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, failed: true, status: 'failed' } : m))
      );
      showToast('Failed to send voice message', 'error');
    } finally {
      setSendingVoice(false);
    }
  };

  const handleDiscardVoiceReview = () => {
    if (voiceReview?.url) {
      URL.revokeObjectURL(voiceReview.url);
    }
    setVoiceReview(null);
  };

  const handleSendImage = async (file: File) => {
    if (!file || !chatId) return;
    setUploadingImage(true);
    const tempId = `temp-img-${Date.now()}`;
    const localPreview = URL.createObjectURL(file);

    const optimisticMsg = {
      _id: tempId,
      senderId: user?._id,
      message: 'Photo',
      kind: 'image',
      imageUrl: localPreview,
      createdAt: new Date().toISOString(),
      read: false,
      delivered: false,
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const url = await uploadApi.upload(file, 'chat-images');
      const { data } = await chatApi.sendMessage(chatId, 'Photo', {
        kind: 'image',
        imageUrl: url,
      });
      if (data.success && data.data) {
        setMessages((prev) => prev.map((m) => (m._id === tempId ? data.data : m)));
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, failed: true, status: 'failed' } : m))
      );
      showToast('Failed to upload and send image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Group messages by day
  const withSeparators = useMemo(() => {
    const out: { type: 'day'; label: string; key: string }[] | any[] = [];
    let lastDay = '';
    for (const m of messages) {
      const key = dayKey(m.createdAt);
      if (key !== lastDay) {
        out.push({ type: 'day', label: dayLabel(m.createdAt), key: `day-${key}` });
        lastDay = key;
      }
      out.push(m);
    }
    return out;
  }, [messages]);

  return (
    <div className="h-[100dvh] max-h-screen flex flex-col bg-surface-soft overflow-hidden select-none">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="shrink-0 sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-line shadow-xs">
        <div className="flex items-center gap-2.5 px-3 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {isGroup ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowGroupInfo(true)}
                className="relative shrink-0 cursor-pointer group/avatar transition-transform active:scale-95"
                title="View Group Info"
              >
                {chatData?.avatar || other?.avatar ? (
                  <img
                    src={getMediaUrl(chatData?.avatar || other?.avatar)}
                    alt=""
                    className="w-10 h-10 rounded-2xl object-cover shadow-md ring-1 ring-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 ring-1 ring-white">
                    <UsersGroup className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ) : (
              /* Round Avatar Profile with animated LIVE indicator */
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  if (other?.isLive && (other.liveStreamId || other.liveStream?._id)) {
                    navigate(`/live/${other.liveStreamId || other.liveStream?._id}`);
                  } else if (other?._id) {
                    navigate(`/user/${other._id}`);
                  }
                }}
                className="relative shrink-0 cursor-pointer group/avatar transition-transform active:scale-95"
                title={other?.isLive ? '🔴 LIVE NOW! Click to join live stream' : 'View Profile'}
              >
                {/* Outer pulsing glow ring when live */}
                {other?.isLive && (
                  <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 opacity-75 blur-xs animate-pulse" />
                )}
                <div
                  className={
                    other?.isLive
                      ? 'relative p-[2px] rounded-full bg-gradient-to-tr from-rose-600 via-pink-500 to-rose-400 shadow-md ring-2 ring-rose-500/50'
                      : 'relative'
                  }
                >
                  <Avatar
                    src={other?.avatar}
                    nickname={other?.nickname || '?'}
                    size="sm"
                    online={other?.online}
                    className={other?.isLive ? 'ring-1 ring-white' : ''}
                  />
                </div>

                {/* Pulsing LIVE badge on round profile */}
                {other?.isLive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-[0.5px] rounded-full bg-gradient-to-r from-rose-600 via-red-500 to-pink-600 text-white text-[8px] font-black uppercase tracking-wider shadow-md flex items-center gap-0.5 border border-white ring-1 ring-rose-500/30 select-none animate-pulse">
                    <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                    <span>LIVE</span>
                  </span>
                )}
              </div>
            )}

            {isGroup ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowGroupInfo(true)}
                className="flex-1 min-w-0 cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <h1 className="text-[15px] font-bold text-ink truncate leading-tight group-hover:text-primary-600 transition-colors">
                    {chatData?.name || other?.nickname || 'Group Chat'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-purple-50 border border-purple-200 text-purple-600 text-[9px] font-extrabold uppercase tracking-wide shrink-0">
                    <UsersGroup className="w-2.5 h-2.5" />
                    <span>Group</span>
                  </span>
                </div>
                <p className="text-[11px] text-ink-muted leading-tight mt-0.5">
                  {chatData?.participants?.length || other?.memberCount || 2} members • Tap for info
                </p>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (other?.isLive && (other.liveStreamId || other.liveStream?._id)) {
                    navigate(`/live/${other.liveStreamId || other.liveStream?._id}`);
                  } else if (other?._id) {
                    navigate(`/user/${other._id}`);
                  }
                }}
                className="flex-1 min-w-0 cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <h1 className="text-[15px] font-bold text-ink truncate leading-tight group-hover:text-primary-600 transition-colors">
                    {other?.nickname || 'User'}
                  </h1>
                  {other?.isLive && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[9px] font-black uppercase tracking-wide shrink-0 animate-pulse">
                      <span className="w-1 h-1 rounded-full bg-rose-500" />
                      <span>Streaming</span>
                    </span>
                  )}
                </div>

                {other?.isLive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 leading-tight">
                    <span>🔴 Watching Live • Tap to join</span>
                  </span>
                ) : streak && streak.current < streak.target ? (
                  <span className="inline-flex items-center gap-1 mt-0.5 h-[17px] px-1.5 rounded bg-surface-sunken text-[10px] font-semibold text-ink-muted">
                    ⭐ Activating {streak.current}/{streak.target}
                  </span>
                ) : (
                  <p className="text-[11px] text-ink-muted leading-tight">
                    {other?.uid ? `ID: ${other.uid}` : other?.online ? 'Online' : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Audio & Video Call buttons with dynamic Coin rate badge directly underneath */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => startCall('audio')}
                aria-label="Audio call"
                title={isGroup ? 'Group Voice Call' : 'Voice Call'}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-ink hover:text-primary-600 active:bg-surface-sunken transition-colors"
              >
                <Phone className="w-[17px] h-[17px]" />
              </button>
              <button
                onClick={() => startCall('video')}
                aria-label="Video call"
                title={isGroup ? 'Group Video Call' : 'Video Call'}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-ink hover:text-primary-600 active:bg-surface-sunken transition-colors"
              >
                <Video className="w-[17px] h-[17px]" />
              </button>
              {isGroup && (
                <button
                  onClick={() => setShowAddMember(true)}
                  aria-label="Add Member"
                  title="Add Members"
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <UserPlus className="w-[17px] h-[17px]" />
                </button>
              )}
            </div>
            {!isGroup && (
              <div
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[10px] font-extrabold text-cyan-600 leading-none select-none -mt-0.5"
                title={`Call rate: ${(other?.callPricePerMinute ?? 1000).toLocaleString()} diamonds / minute`}
              >
                <DiamondIcon className="w-2.5 h-2.5 text-cyan-500 shrink-0" />
                <span>{(other?.callPricePerMinute ?? 1000).toLocaleString()}/m</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowOptionsMenu(true)}
            aria-label="More options"
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-ink active:bg-surface-sunken transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Messages List ─────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 px-4 py-3 space-y-3 overflow-y-auto"
        onClick={() => {
          setShowEmojiPicker(false);
          setShowQuickReacts(false);
        }}
      >
        {loading ? (
          <p className="text-center text-sm text-ink-muted py-10">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div
              className="inline-block relative cursor-pointer"
              onClick={() => {
                if (other?.isLive && (other.liveStreamId || other.liveStream?._id)) {
                  navigate(`/live/${other.liveStreamId || other.liveStream?._id}`);
                }
              }}
            >
              {other?.isLive && (
                <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 opacity-75 blur-xs animate-pulse" />
              )}
              <div className={other?.isLive ? 'relative p-[2.5px] rounded-full bg-gradient-to-tr from-rose-600 via-pink-500 to-rose-400 ring-2 ring-rose-500/50' : 'relative'}>
                <Avatar src={other?.avatar} nickname={other?.nickname || '?'} size="lg" className="mx-auto mb-3" />
              </div>
              {other?.isLive && (
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 border border-white animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>LIVE</span>
                </span>
              )}
            </div>

            {other?.isLive && (
              <div className="my-3">
                <button
                  onClick={() => navigate(`/live/${other.liveStreamId || other.liveStream?._id}`)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>Join Live Stream</span>
                </button>
              </div>
            )}

            <p className="text-base font-bold text-ink mb-1">
              Say hi to {other?.nickname || 'your friend'} 👋
            </p>
            <p className="text-xs text-ink-muted max-w-xs mx-auto">
              Messages and calls are secure. Long press any message to edit, delete, copy, or report.
            </p>
          </div>
        ) : (
          withSeparators.map((item: any, index: number) => {
            if (item.type === 'day') {
              return (
                <div key={item.key} className="flex justify-center my-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-200/70 text-[11px] font-semibold text-ink-muted shadow-2xs">
                    {item.label}
                  </span>
                </div>
              );
            }

            const mine = item.senderId === user?._id;
            const senderObj = isGroup ? participantsMap.get(item.senderId) : null;
            const isGift = item.kind === 'gift';
            const resolvedGiftIcon = isGift ? resolveGiftIcon(item, giftList) : '';
            const isLastSent =
              mine &&
              index ===
                withSeparators.map((m: any) => m.senderId === user?._id).lastIndexOf(true);

            const isSeen = item.read || item.status === 'seen';
            const isDelivered = (item.delivered || item.status === 'delivered') && !isSeen;
            const isSending = item.status === 'sending';
            const isFailed = item.failed || item.status === 'failed';
            const isPureEmoji = !isGift && (!item.kind || item.kind === 'text') && isPureEmojiMessage(item.message);

            return (
              <div key={item._id || index} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && (
                  <Avatar
                    src={senderObj?.avatar || other?.avatar}
                    nickname={senderObj?.nickname || other?.nickname || '?'}
                    size="xs"
                    className="mt-auto mb-1 ring-1 ring-black/5"
                    userId={senderObj?._id || other?._id}
                  />
                )}

                <div className="max-w-[76%] flex flex-col group">
                  {isGroup && !mine && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const targetId = senderObj?._id || other?._id;
                        if (targetId) {
                          navigate(targetId === user?._id ? '/profile' : `/user/${targetId}`);
                        }
                      }}
                      className="text-[10px] font-bold text-rose-500 mb-0.5 ml-1 cursor-pointer hover:underline"
                    >
                      {senderObj?.nickname || 'Member'}
                    </span>
                  )}
                  {/* Long press message bubble */}
                  <div
                    onPointerDown={() => handlePointerDownMessage(item)}
                    onPointerUp={handlePointerUpMessage}
                    onPointerLeave={handlePointerUpMessage}
                    onTouchStart={() => handlePointerDownMessage(item)}
                    onTouchEnd={handlePointerUpMessage}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedMessage(item);
                    }}
                    className={`relative select-none active:scale-[0.98] transition-all cursor-pointer ${
                      isGift
                        ? mine
                          ? 'p-2.5 bg-gradient-to-br from-pink-500/20 via-purple-600/20 to-indigo-600/20 border border-pink-400/30 rounded-2xl shadow-sm backdrop-blur-xs'
                          : 'p-2.5 bg-white/95 border border-pink-200 rounded-2xl shadow-sm backdrop-blur-xs'
                        : isPureEmoji
                          ? 'p-0 bg-transparent shadow-none border-0'
                          : `px-3.5 py-2.5 text-sm rounded-2xl shadow-xs ${
                              mine
                                ? 'bg-gradient-to-tr from-primary-600 to-indigo-600 text-white rounded-br-xs'
                                : 'bg-white text-ink rounded-bl-xs border border-slate-100'
                            }`
                    } ${isFailed ? 'opacity-70 ring-1 ring-red-400' : ''}`}
                  >
                    {item.kind === 'image' || item.imageUrl ? (
                      <div className="rounded-xl overflow-hidden max-w-xs cursor-pointer">
                        <img
                          src={getMediaUrl(item.imageUrl || item.message)}
                          alt="Photo message"
                          loading="lazy"
                          className="w-full max-h-72 object-cover rounded-xl shadow-xs hover:opacity-95 transition-opacity"
                          crossOrigin="anonymous"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(getMediaUrl(item.imageUrl || item.message), '_blank');
                          }}
                        />
                      </div>
                    ) : item.kind === 'voice' ? (
                      <VoiceBubble url={item.voiceUrl || item.message} duration={item.voiceDuration} mine={mine} />
                    ) : item.kind === 'gift' ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerGiftBurst({
                            id: `burst-${item._id || Date.now()}`,
                            senderName: mine ? 'You' : other?.nickname || 'Friend',
                            giftName: item.giftName || 'Gift',
                            giftIcon: resolvedGiftIcon,
                            count: item.giftCount || 1,
                          });
                        }}
                        className="flex flex-col items-center justify-center p-1 min-w-[96px] sm:min-w-[110px]"
                      >
                        {/* Prominent Gift Picture */}
                        <div className="relative my-1 flex items-center justify-center">
                          {isMediaUrl(resolvedGiftIcon) ? (
                            <img
                              src={getMediaUrl(resolvedGiftIcon)}
                              alt={item.giftName || 'Gift'}
                              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_4px_12px_rgba(236,72,153,0.4)] transition-transform hover:scale-110"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                                if (e.currentTarget.parentElement) {
                                  const span = document.createElement('span');
                                  span.innerText = getFallbackEmoji(item.giftName);
                                  span.className = 'text-5xl select-none drop-shadow-md';
                                  e.currentTarget.parentElement.appendChild(span);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-5xl sm:text-6xl select-none leading-none drop-shadow-[0_4px_12px_rgba(236,72,153,0.4)] transition-transform hover:scale-110">
                              {resolvedGiftIcon}
                            </span>
                          )}

                          {/* Multiplier Badge attached to top-right of gift picture */}
                          <div className="absolute -top-1 -right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 text-white font-black text-xs shadow-md border-1.5 border-white flex items-center leading-none">
                            ×{item.giftCount || 1}
                          </div>
                        </div>

                        {/* Gift Name */}
                        <p className={`font-black text-xs text-center mt-1 leading-tight ${mine ? 'text-white' : 'text-ink'}`}>
                          {item.giftName || 'Gift'}
                        </p>
                      </div>
                    ) : item.kind === 'call' ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          startCall(item.callType === 'video' ? 'video' : 'audio');
                        }}
                        className="flex items-center gap-3 py-1 cursor-pointer"
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                            item.callStatus === 'missed' || item.callStatus === 'rejected'
                              ? mine
                                ? 'bg-white/20 text-rose-200'
                                : 'bg-rose-500/15 text-rose-600'
                              : mine
                                ? 'bg-white/20 text-white'
                                : 'bg-primary-500/15 text-primary-600'
                          }`}
                        >
                          {item.callType === 'video' ? (
                            <Video className="w-4 h-4" />
                          ) : item.callStatus === 'missed' || item.callStatus === 'rejected' ? (
                            <PhoneX className="w-4 h-4" />
                          ) : mine ? (
                            <PhoneOutgoing className="w-4 h-4" />
                          ) : (
                            <PhoneIncoming className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-bold text-sm leading-tight ${
                            item.callStatus === 'missed' && !mine ? 'text-rose-600 font-extrabold' : ''
                          }`}>
                            {item.message || (item.callType === 'video' ? 'Video call' : 'Audio call')}
                          </p>
                          <p className={`text-[11px] mt-0.5 leading-tight ${
                            mine ? 'text-white/80' : 'text-ink-muted'
                          }`}>
                            Tap to call back
                          </p>
                        </div>
                      </div>
                    ) : isPureEmoji ? (
                      <div className="py-1 px-0.5 select-none transition-transform hover:scale-105 active:scale-95 leading-none">
                        <span className={`${getEmojiFontSize(item.message)} leading-none inline-block drop-shadow-xs select-none`}>
                          {item.message}
                        </span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{item.message}</p>
                    )}
                  </div>

                  {/* Timestamp, Edited Badge & Status tick */}
                  <div className={`flex items-center gap-1.5 mt-1 px-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-ink-faint tabular-nums">
                      {clockTime(item.createdAt)}
                    </span>

                    {item.edited && (
                      <span className="text-[9px] font-medium text-ink-faint italic">
                        (edited)
                      </span>
                    )}

                    {mine && (
                      <div className="flex items-center gap-0.5">
                        {isFailed ? (
                          <button
                            onClick={() => retrySend(item)}
                            className="flex items-center gap-0.5 text-[10px] text-red-500 font-bold hover:underline"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Not sent</span>
                          </button>
                        ) : isSending ? (
                          <Clock className="w-3 h-3 text-ink-muted animate-spin" title="Sending..." />
                        ) : isSeen ? (
                          <Checks className="w-3.5 h-3.5 text-[#0284c7]" title="Seen" />
                        ) : isDelivered ? (
                          <Checks className="w-3.5 h-3.5 text-ink-muted" title="Delivered" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-ink-muted" title="Sent" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Last message receipt indicator */}
                  {mine && isLastSent && !isFailed && !isSending && (
                    <div className="flex items-center justify-end gap-1 mt-0.5 pr-1 text-[10px] font-semibold text-ink-muted">
                      {isSeen ? (
                        <span className="text-primary-600 flex items-center gap-1">
                          <span>Seen</span>
                          {item.readAt && (
                            <span className="text-[9px] text-ink-faint font-normal">
                              {clockTime(item.readAt)}
                            </span>
                          )}
                        </span>
                      ) : isDelivered ? (
                        <span className="text-ink-muted">Delivered</span>
                      ) : (
                        <span className="text-ink-faint">Sent</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {streak && !streak.litUp && streak.current > 0 && (
          <div className="flex justify-center py-2">
            <span className="px-3 py-1.5 rounded-full bg-line text-[11px] text-ink-muted">
              Chat {streak.target} days straight to light up your Starlink{' '}
              <span className="text-accent-500 font-semibold">⭐</span>
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Fixed Bottom Footer (Quick Replies + Input Bar + Floating Emoji Popover) ── */}
      <footer className="shrink-0 z-30 bg-surface-soft relative">
        {/* Floating Emoji Picker Popover */}
        <AnimatePresence>
          {showEmojiPicker && (
            <>
              {/* Click outside backdrop */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowEmojiPicker(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute bottom-full left-2 right-2 sm:left-auto sm:right-3 sm:w-96 mb-2 bg-white/98 backdrop-blur-md rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.22)] border border-slate-200/90 z-40 flex flex-col h-72 overflow-hidden ring-1 ring-black/5"
              >
                {/* Category tabs */}
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50/90 shrink-0">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedEmojiCategory(cat.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                        selectedEmojiCategory === cat.id
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200 ring-1 ring-slate-100'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <span className="text-sm select-none">{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
                    title="Close emoji panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Emoji Grid */}
                <div className="flex-1 overflow-y-auto p-3 grid grid-cols-8 sm:grid-cols-10 gap-1.5 content-start no-scrollbar">
                  {activeCategoryEmojis.map((emoji, idx) => (
                    <button
                      key={`${emoji}-${idx}`}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="h-10 rounded-xl hover:bg-slate-100 active:scale-125 flex items-center justify-center text-2xl transition-all duration-150 select-none cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Recording banner */}
        <AnimatePresence>
          {recording && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2.5 flex items-center justify-between bg-role-host/10 border-t border-role-host/20"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-role-host animate-pulse" />
                <span className="text-sm text-role-host font-medium">Recording… {duration}s</span>
              </div>
              <button
                onClick={() => {
                  recordingRef.current = false;
                  cancelRecording();
                }}
                className="flex items-center gap-1 text-xs text-role-host font-semibold"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {voiceError && <p className="px-4 pb-1 text-xs text-role-host">{voiceError}</p>}

        {/* ── Editing Message Banner ─────────────────────────────────── */}
        {editingMessage && (
          <div className="flex items-center justify-between px-4 py-2 bg-primary-50 border-t border-primary-100 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 min-w-0">
              <Pencil className="w-4 h-4 text-primary-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary-700">Editing message</p>
                <p className="text-xs text-ink-muted truncate">{editingMessage.message}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingMessage(null);
                setInput('');
              }}
              className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Quick replies ──────────────────────────────────────────── */}
        {!editingMessage && !voiceReview && (
          <div className="w-full max-w-full flex gap-2 px-2.5 sm:px-3 pb-2 pt-1.5 overflow-x-auto no-scrollbar bg-surface-soft border-t border-slate-200/60 box-border">
            {QUICK_REPLIES.map(({ label, emoji }) => (
              <button
                key={label}
                onClick={() => sendText(label)}
                disabled={sending}
                className="shrink-0 h-8 sm:h-9 px-3 sm:px-3.5 rounded-full bg-white border border-line text-xs sm:text-sm text-ink
                  flex items-center gap-1.5 active:bg-surface-sunken disabled:opacity-50 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
            <button
              onClick={() => setShowGift(true)}
              className="shrink-0 h-8 sm:h-9 px-3 sm:px-3.5 rounded-full bg-primary-50 border border-primary-200 text-xs sm:text-sm font-medium text-primary-600 flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <GiftIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Gift
            </button>
          </div>
        )}

        {/* ── Input bar / Voice Review Bar ────────────────────────────── */}
        {voiceReview ? (
          <VoiceReviewBar
            voice={voiceReview}
            onCancel={handleDiscardVoiceReview}
            onSend={handleSendVoiceReview}
            sending={sendingVoice}
          />
        ) : (
          <div className="w-full max-w-full flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 bg-white border-t border-line safe-bottom box-border">
            {!editingMessage && (
              <button
                onPointerDown={handleVoiceStart}
                onPointerUp={handleVoiceStop}
                onPointerLeave={() => {
                  if (recordingRef.current) handleVoiceStop();
                }}
                aria-label="Hold to record a voice message"
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  recording ? 'bg-role-host border-role-host text-white' : 'border-ink text-ink'
                }`}
              >
                <AudioLines className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </button>
            )}

            <div className="flex-1 min-w-0 flex items-center gap-0.5 sm:gap-1.5 h-10 sm:h-11 pl-2.5 sm:pl-4 pr-1 sm:pr-1.5 rounded-full bg-surface-sunken">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={editingMessage ? 'Edit your message…' : 'Say something'}
                className="flex-1 min-w-0 w-0 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none text-xs sm:text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker((prev) => !prev);
                  setShowQuickReacts(false);
                }}
                aria-label="Emoji"
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  showEmojiPicker
                    ? 'text-amber-500 bg-amber-50 scale-110 shadow-xs'
                    : 'text-ink-muted hover:text-amber-500 hover:bg-slate-100'
                }`}
                title="Emoji picker"
              >
                <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {!editingMessage && (
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  aria-label="Send photo"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 text-ink-muted hover:text-primary-600 transition-colors"
                  title="Send photo"
                >
                  {uploadingImage ? (
                    <span className="w-3.5 h-3.5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              )}
              {!editingMessage && (
                <button
                  onClick={() => setShowGift(true)}
                  aria-label="Send a gift"
                  title="Send a gift"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all"
                >
                  <GiftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleSendImage(f);
                e.target.value = '';
              }}
            />

            {input.trim() ? (
              <button
                onClick={handleSend}
                disabled={sending}
                aria-label="Send"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
            ) : (
              <div className="relative shrink-0">
                {showQuickReacts && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowQuickReacts(false)}
                    />
                    <div className="absolute bottom-12 right-0 bg-white/95 backdrop-blur-md shadow-2xl rounded-full px-2.5 py-1.5 flex items-center gap-1.5 border border-slate-200/80 z-40 animate-in fade-in zoom-in-95">
                      {['👍', '❤️', '🔥', '🎉', '😂', '😍'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQuickReacts(false);
                            sendText(emoji);
                          }}
                          className="w-8 h-8 rounded-full hover:bg-slate-100 active:scale-125 flex items-center justify-center text-xl transition-all"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <button
                  onClick={handleLikeClick}
                  onMouseDown={handleLikeStart}
                  onMouseUp={handleLikeEnd}
                  onTouchStart={handleLikeStart}
                  onTouchEnd={handleLikeEnd}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowQuickReacts((prev) => !prev);
                  }}
                  disabled={sending}
                  aria-label="Like or React"
                  title="Send Like (tap to send, hold for reactions)"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-50 hover:bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 active:scale-90 transition-all shadow-sm border border-primary-100/60"
                >
                  <ThumbsUp className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </footer>

      {/* ── Message Long-Press Context Modal ───────────────────────── */}
      <Modal
        isOpen={Boolean(selectedMessage)}
        onClose={() => setSelectedMessage(null)}
        title="Message Options"
      >
        <div className="space-y-3 pt-1">
          {/* Message snippet */}
          <div className="p-3 rounded-xl bg-slate-100 text-xs text-ink max-h-24 overflow-y-auto italic">
            "{selectedMessage?.message}"
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* Copy */}
            {selectedMessage?.message && (
              <button
                onClick={handleCopyMessage}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-sm font-semibold text-ink transition-colors"
              >
                <Copy className="w-5 h-5 text-ink-muted" />
                <span>Copy text</span>
              </button>
            )}

            {/* Edit (only own text messages) */}
            {selectedMessage?.senderId === user?._id && selectedMessage?.kind === 'text' && (
              <button
                onClick={handleStartEditMessage}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-sm font-semibold text-primary-600 transition-colors"
              >
                <Pencil className="w-5 h-5 text-primary-600" />
                <span>Edit message</span>
              </button>
            )}

            {/* Delete (only own messages) */}
            {selectedMessage?.senderId === user?._id && (
              <button
                onClick={handleDeleteSingleMessage}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-sm font-semibold text-red-600 transition-colors"
              >
                <Trash className="w-5 h-5 text-red-600" />
                <span>Delete message</span>
              </button>
            )}

            {/* Report Message */}
            {selectedMessage?.senderId !== user?._id && (
              <button
                onClick={() => handleOpenReport('message', selectedMessage._id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-50 active:bg-amber-100 text-sm font-semibold text-amber-600 transition-colors"
              >
                <Flag className="w-5 h-5 text-amber-600" />
                <span>Report message</span>
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Conversation Options Dropdown / Modal ──────────────────── */}
      <Modal
        isOpen={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        title={isGroup ? 'Group Options' : 'Conversation Options'}
      >
        <div className="space-y-2 pt-1">
          {isGroup ? (
            <>
              {/* Edit Group Name & Picture */}
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  setGroupNameInput(chatData?.name || other?.nickname || '');
                  setGroupAvatarInput(chatData?.avatar || other?.avatar || '');
                  setShowEditGroupModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50/70 hover:bg-purple-100/70 active:bg-purple-100 text-sm font-bold text-purple-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Pencil className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="leading-tight font-bold">Edit Group Info</p>
                  <p className="text-[11px] text-purple-600/70 font-normal">Change group name & picture</p>
                </div>
              </button>

              {/* Group Members & Info */}
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  setShowGroupInfo(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-sm font-semibold text-ink transition-colors"
              >
                <UsersGroup className="w-5 h-5 text-ink-muted" />
                <span>Group Members & Info</span>
              </button>

              {/* Add Members */}
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  setShowAddMember(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-sm font-semibold text-ink transition-colors"
              >
                <UserPlus className="w-5 h-5 text-ink-muted" />
                <span>Add Members</span>
              </button>
            </>
          ) : (
            other?._id && (
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  navigate(`/user/${other._id}`);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-sm font-semibold text-ink transition-colors"
              >
                <UserIcon className="w-5 h-5 text-ink-muted" />
                <span>View Profile</span>
              </button>
            )
          )}

          {/* Configure My Call Price */}
          <button
            onClick={() => {
              setShowOptionsMenu(false);
              setCallPriceInput((user as any)?.callPricePerMinute ?? 1000);
              setShowSetCallPriceModal(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-cyan-50 active:bg-cyan-100 text-sm font-semibold text-cyan-700 transition-colors"
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <DiamondIcon className="w-4.5 h-4.5 text-cyan-500" />
            </div>
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span className="truncate">Set My Call Rate</span>
              <span className="text-[11px] font-extrabold text-cyan-600 bg-cyan-500/15 border border-cyan-500/25 px-2 py-0.5 rounded-full shrink-0">
                {((user as any)?.callPricePerMinute ?? 1000).toLocaleString()} 💎/m
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              setShowOptionsMenu(false);
              setShowClearConfirm(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-sm font-semibold text-ink transition-colors"
          >
            <Broom className="w-5 h-5 text-ink-muted" />
            <span>Clear Chat History</span>
          </button>

          <button
            onClick={() => {
              setShowOptionsMenu(false);
              setShowDeleteChatConfirm(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-sm font-semibold text-red-600 transition-colors"
          >
            <Trash className="w-5 h-5 text-red-600" />
            <span>Remove Whole Conversation</span>
          </button>

          {/* Block user (Only for normal users) */}
          {other?._id && !other?.isOfficial && (
            <button
              onClick={() => {
                setShowOptionsMenu(false);
                setShowBlockConfirm(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-sm font-semibold text-red-600 transition-colors"
            >
              <Prohibit className="w-5 h-5 text-red-600" />
              <span>Block User</span>
            </button>
          )}

          <button
            onClick={() => handleOpenReport('user', other?._id || chatId || '')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-50 active:bg-amber-100 text-sm font-semibold text-amber-600 transition-colors"
          >
            <Flag className="w-5 h-5 text-amber-600" />
            <span>Send Report</span>
          </button>
        </div>
      </Modal>

      {/* ── Block User Confirm Modal ───────────────────────────────── */}
      <Modal
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        title="Block User?"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-ink-muted">
            Are you sure you want to block <span className="font-semibold text-ink">{other?.nickname || 'this user'}</span>? They will not be able to message or call you, and this conversation will be closed.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBlockConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-ink active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBlock}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white active:bg-red-700 shadow-sm"
            >
              Block User
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Clear Chat History Confirm Modal ───────────────────────── */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Chat History?"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-ink-muted">
            Are you sure you want to clear all messages in this conversation? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-ink active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleClearWholeConversation}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white active:bg-red-700 shadow-sm"
            >
              Clear Messages
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Remove Whole Conversation Confirm Modal ─────────────────── */}
      <Modal
        isOpen={showDeleteChatConfirm}
        onClose={() => setShowDeleteChatConfirm(false)}
        title="Delete Conversation?"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-ink-muted">
            Are you sure you want to delete this conversation? It will be removed from your message list.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteChatConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-ink active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConversation}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white active:bg-red-700 shadow-sm"
            >
              Delete Conversation
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Send Report Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Send Report"
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
              Reason for reporting
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    selectedReason === reason
                      ? 'bg-primary-50 text-primary-700 border border-primary-300 font-bold'
                      : 'bg-slate-100 text-ink hover:bg-slate-200/70 border border-transparent'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Please provide more details to help us investigate…"
              rows={3}
              className="w-full p-3 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:border-primary-500 focus:bg-white resize-none text-ink"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-ink active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={submittingReport}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white active:scale-95 shadow-sm transition-all disabled:opacity-50"
            >
              {submittingReport ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Send Gift Modal */}
      <Modal isOpen={showGift} onClose={() => setShowGift(false)} title="Send a gift">
        {other?._id && <GiftPanel receiverId={other._id} onSend={handleSendGift} />}
      </Modal>

      {/* ── Set Call Price Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={showSetCallPriceModal}
        onClose={() => setShowSetCallPriceModal(false)}
        title="Set Call Rate"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-ink-muted leading-relaxed">
            Configure how many Coins users pay per minute to call you in 1:1 Voice &amp; Video calls. You earn these Coins directly!
          </p>

          <div>
            <label className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-2">
              Quick Preset (Coins / Min)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[500, 1000, 2000, 5000, 10000, 20000].map((preset) => {
                const selected = callPriceInput === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCallPriceInput(preset)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      selected
                        ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-ink bg-slate-50'
                    }`}
                  >
                    <DiamondIcon className="w-3 h-3 text-cyan-500" />
                    <span>{preset.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-1.5">
              Or Custom Rate (Diamonds / Minute)
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={100}
                value={callPriceInput}
                onChange={(e) => setCallPriceInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full pl-9 pr-14 py-2.5 text-sm font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-cyan-500 text-ink"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <DiamondIcon className="w-4 h-4 text-cyan-500" />
              </div>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted pointer-events-none">
                / min
              </span>
            </div>
          </div>

          {/* Earnings calculator preview */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 text-xs flex items-center justify-between">
            <span className="text-ink font-medium">Host Earning (10m Call, 70% Coins):</span>
            <span className="font-extrabold text-amber-600 flex items-center gap-1">
              <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
              {Math.floor(callPriceInput * 10 * 0.7).toLocaleString()} Coins
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowSetCallPriceModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-ink active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={settingCallPrice}
              onClick={async () => {
                setSettingCallPrice(true);
                try {
                  const res = await securityApi.setCallPrice(callPriceInput);
                  if (res.data?.success) {
                    updateUser({ callPricePerMinute: callPriceInput } as any);
                    showToast(`Call price updated to ${callPriceInput.toLocaleString()} diamonds/min`, 'success');
                    setShowSetCallPriceModal(false);
                  } else {
                    showToast(res.data?.error || 'Could not update call price', 'error');
                  }
                } catch (err: any) {
                  showToast(err.response?.data?.error || 'Failed to update rate', 'error');
                } finally {
                  setSettingCallPrice(false);
                }
              }}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {settingCallPrice ? 'Saving…' : 'Save Rate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Group Information Modal */}
      <Modal
        isOpen={showGroupInfo}
        onClose={() => setShowGroupInfo(false)}
        title="Group Information"
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-purple-500/10 via-indigo-500/5 to-transparent rounded-2xl border border-purple-500/15 text-center relative group">
            {chatData?.avatar || other?.avatar ? (
              <img
                src={getMediaUrl(chatData?.avatar || other?.avatar)}
                alt=""
                className="w-16 h-16 rounded-3xl object-cover shadow-lg shadow-purple-500/30 ring-4 ring-white mb-2.5"
              />
            ) : (
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 ring-4 ring-white mb-2.5">
                <UsersGroup className="w-8 h-8 text-white" />
              </div>
            )}
            <h3 className="text-base font-extrabold text-ink leading-tight">
              {chatData?.name || other?.nickname || 'Group Chat'}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {chatData?.participants?.length || 2} members
            </p>

            <button
              type="button"
              onClick={() => {
                setShowGroupInfo(false);
                setGroupNameInput(chatData?.name || other?.nickname || '');
                setGroupAvatarInput(chatData?.avatar || other?.avatar || '');
                setShowEditGroupModal(true);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Name & Picture</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Members ({chatData?.participants?.length || 0})
            </span>
            <button
              type="button"
              onClick={() => {
                setShowGroupInfo(false);
                setShowAddMember(true);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-xl transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
            {(chatData?.participants || []).map((p: any) => {
              const isCreator = p._id === chatData?.creator || p._id === chatData?.creator?._id;
              const isMe = p._id === user?._id;
              return (
                <div
                  key={p._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (p._id) {
                      setShowGroupInfo(false);
                      navigate(p._id === user?._id ? '/profile' : `/user/${p._id}`);
                    }
                  }}
                  className="flex items-center gap-3 py-2 px-1 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Avatar src={p.avatar} nickname={p.nickname || '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-ink truncate">
                        {p.nickname || 'Member'} {isMe && '(You)'}
                      </p>
                      {isCreator && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded-md">
                          Creator
                        </span>
                      )}
                    </div>
                    {p.uid && <p className="text-[10px] text-ink-muted">UID: {p.uid}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowGroupInfo(false)}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-ink hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Add Members to Group Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => {
          setShowAddMember(false);
          setAddMemberQuery('');
          setAddMemberResults([]);
        }}
        title="Add Members to Group"
      >
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 px-3 h-10 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-purple-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500/10 transition-all">
            <UserPlus className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={addMemberQuery}
              onChange={(e) => setAddMemberQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchAddMembers()}
              placeholder="Search user by UID or nickname..."
              className="flex-1 min-w-0 bg-transparent text-xs text-ink placeholder:text-ink-muted focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSearchAddMembers}
              disabled={addMemberSearching}
              className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all disabled:opacity-50"
            >
              {addMemberSearching ? '...' : 'Search'}
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
            {addMemberResults.length > 0 ? (
              addMemberResults.map((u: any) => (
                <div key={u._id} className="flex items-center justify-between gap-2.5 py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar src={u.avatar} nickname={u.nickname} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{u.nickname}</p>
                      {u.uid && <p className="text-[10px] text-ink-muted">UID: {u.uid}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={addingMemberId === u._id}
                    onClick={() => handleAddMemberToGroup(u)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-50 shrink-0"
                  >
                    {addingMemberId === u._id ? 'Adding…' : 'Add'}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-ink-muted">
                {addMemberSearching ? 'Searching...' : addMemberQuery ? 'No users found' : 'Search by username or UID to add new members'}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddMember(false);
              setAddMemberQuery('');
              setAddMemberResults([]);
            }}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-ink hover:bg-slate-50 transition-colors"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* ── Edit Group Modal (Name and Photo) ── */}
      <Modal
        isOpen={showEditGroupModal}
        onClose={() => setShowEditGroupModal(false)}
        title="Edit Group Info"
      >
        <div className="space-y-4 pt-1">
          {/* Group Photo / Avatar Upload */}
          <div className="flex flex-col items-center justify-center">
            <input
              ref={groupAvatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGroupAvatarUpload}
            />
            <div
              onClick={() => groupAvatarInputRef.current?.click()}
              className="relative w-20 h-20 rounded-3xl cursor-pointer group/pic overflow-hidden shadow-lg shadow-purple-500/20 ring-4 ring-purple-100 hover:ring-purple-300 transition-all flex items-center justify-center bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white"
            >
              {groupAvatarInput ? (
                <img
                  src={getMediaUrl(groupAvatarInput)}
                  alt="Group photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UsersGroup className="w-9 h-9 text-white" />
              )}
              {/* Overlay on hover/click */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/pic:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold">
                <CameraIcon className="w-5 h-5 mb-0.5" />
                <span>Change</span>
              </div>
              {uploadingGroupAvatar && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[11px] font-bold">
                  <span>Uploading…</span>
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={uploadingGroupAvatar}
              onClick={() => groupAvatarInputRef.current?.click()}
              className="mt-2 text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 active:scale-95 transition-transform"
            >
              <CameraIcon className="w-3.5 h-3.5" />
              <span>{uploadingGroupAvatar ? 'Uploading photo...' : 'Change Group Photo'}</span>
            </button>
            {groupAvatarInput && (
              <button
                type="button"
                onClick={() => setGroupAvatarInput('')}
                className="text-[11px] text-red-500 hover:underline mt-0.5"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
              Group Name
            </label>
            <div className="flex items-center gap-2.5 px-3.5 h-11 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-purple-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500/10 transition-all">
              <Pencil className="w-4 h-4 text-purple-500 shrink-0" />
              <input
                type="text"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="Enter group name..."
                maxLength={40}
                className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-ink-muted mt-1 text-right">
              {groupNameInput.length}/40 characters
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEditGroupModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-ink active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingGroupInfo || uploadingGroupAvatar}
              onClick={handleSaveGroupInfo}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {savingGroupInfo ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Insufficient Coins Modal */}
      <InsufficientCoinsModal
        visible={insufficientCoins.visible}
        reason={insufficientCoins.reason}
        coinsPerMinute={insufficientCoins.coinsPerMinute}
        balance={insufficientCoins.balance}
        minBalance={insufficientCoins.minBalance}
        onClose={() => setInsufficientCoins({ visible: false })}
      />

      {/* Call Screen */}
      {call && (
        <CallScreen
          incoming={call.incoming}
          outgoing={call.outgoing}
          accepted={callAccepted}
          coinsPerMinute={call.outgoing?.coinsPerMinute || call.incoming?.coinsPerMinute || 0}
          isAudience={!!call.outgoing}
          onClose={(outcome?: 'ended' | 'rejected') => {
            setCall(null);
            setCallAccepted(false);
            if (outcome === 'rejected') showToast('Call declined', 'info');
            loadChat();
            setTimeout(loadChat, 500);
          }}
        />
      )}

      {/* Gift Animation Burst Overlay */}
      <ChatGiftOverlay burst={giftBurst} onDismiss={() => setGiftBurst(null)} />
    </div>
  );
};

