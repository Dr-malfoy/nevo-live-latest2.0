import { useRef, useState } from 'react';
import {
  PiBellSlashFill as BellOff,
  PiBellFill as Bell,
  PiTrashFill as Trash2,
  PiCheckBold as Check,
  PiChecksBold as Checks,
  PiMicrophoneFill as Mic,
  PiGiftFill as GiftIcon,
  PiImageFill as ImageIcon,
  PiChatTeardropFill as SystemNoticeIcon,
  PiCurrencyDollarSimpleFill as ArrivalIcon,
  PiUserPlusFill as FollowersIcon,
  PiWalletFill as WalletIcon,
  PiSealCheckFill as VerifiedBadgeIcon,
} from 'react-icons/pi';
import { Avatar } from '../user';
import { LevelBadge } from '../user/LevelBadge';
import { flagEmoji } from '../../lib/countries';
import { timeAgo } from '../../lib/time';

export interface ChatRow {
  _id: string;
  category?: 'all' | 'following' | 'friends' | 'strangers' | 'agency' | 'system';
  officialKey?: string;
  other?: {
    _id?: string;
    nickname?: string;
    avatar?: string;
    level?: number;
    country?: string;
    online?: boolean;
    liveStreamId?: string | null;
    verification?: { verified?: boolean };
    isFriend?: boolean;
    isFollowing?: boolean;
    isAgency?: boolean;
    isOfficial?: boolean;
    category?: string;
    hasStory?: boolean;
    storyCount?: number;
    hasUnviewedStory?: boolean;
    note?: { text: string; emoji?: string } | null;
  };
  lastMessage?: string;
  lastMessageType?: 'text' | 'voice' | 'gift' | 'image';
  lastMessageAt?: string;
  lastMessageStatus?: 'sending' | 'sent' | 'delivered' | 'seen';
  lastMessageSenderId?: string;
  unread?: number;
  muted?: boolean;
  type?: 'private' | 'group' | 'agency' | 'system';
  streak?: { current: number; target: number };
}

interface ChatListRowProps {
  chat: ChatRow;
  currentUserId?: string;
  onOpen: () => void;
  onMute?: (muted: boolean) => void;
  onDelete?: () => void;
  onLongPress?: (chat: ChatRow) => void;
  onOpenStory?: (userId: string) => void;
}

const SWIPE_THRESHOLD = 70;
const MAX_SWIPE = 110;

export const ChatListRow = ({
  chat,
  currentUserId,
  onOpen,
  onMute,
  onDelete,
  onLongPress,
  onOpenStory,
}: ChatListRowProps) => {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<'none' | 'x' | 'y'>('none');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressed = useRef(false);
  const hasMoved = useRef(false);

  const other = chat.other || {};
  const isOfficial = Boolean(chat.type === 'system' || other.isOfficial || chat.officialKey);
  const unread = chat.unread || 0;
  const isMine = Boolean(chat.lastMessageSenderId && currentUserId && chat.lastMessageSenderId === currentUserId);

  const renderStatusTick = () => {
    if (!isMine) return null;
    const status = chat.lastMessageStatus || 'sent';

    if (status === 'seen') {
      return <Checks className="w-3.5 h-3.5 text-sky-500 shrink-0" title="Seen" />;
    }
    if (status === 'delivered') {
      return <Checks className="w-3.5 h-3.5 text-slate-400 shrink-0" title="Delivered" />;
    }
    return <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" title="Sent" />;
  };

  const renderOfficialAvatar = () => {
    let gradient = 'bg-gradient-to-tr from-blue-500 to-indigo-600';
    let IconComponent = SystemNoticeIcon;

    if (chat.officialKey === 'arrival_notice') {
      gradient = 'bg-gradient-to-tr from-purple-500 to-indigo-600';
      IconComponent = ArrivalIcon;
    } else if (chat.officialKey === 'new_followers') {
      gradient = 'bg-gradient-to-tr from-teal-400 to-emerald-600';
      IconComponent = FollowersIcon;
    } else if (chat.officialKey === 'income_reminder') {
      gradient = 'bg-gradient-to-tr from-emerald-500 to-green-600';
      IconComponent = WalletIcon;
    }

    return (
      <div className={`w-12 h-12 rounded-full ${gradient} flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-2 ring-white`}>
        <IconComponent className="w-6 h-6 text-white" />
      </div>
    );
  };

  const renderPreviewContent = () => {
    if (chat.lastMessageType === 'voice') {
      return (
        <span className="flex items-center gap-1 text-purple-600 font-medium">
          <Mic className="w-3.5 h-3.5 shrink-0" />
          <span>Voice message</span>
        </span>
      );
    }
    if (chat.lastMessageType === 'gift') {
      return (
        <span className="flex items-center gap-1 text-pink-500 font-medium">
          <GiftIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{chat.lastMessage || 'Sent a gift'}</span>
        </span>
      );
    }
    if (chat.lastMessageType === 'image') {
      return (
        <span className="flex items-center gap-1 text-blue-500 font-medium">
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Photo</span>
        </span>
      );
    }
    return <span className="truncate">{chat.lastMessage || 'No messages yet'}</span>;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = 'none';
    isLongPressed.current = false;
    hasMoved.current = false;
    setIsSwiping(true);

    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (axis.current === 'none' && !hasMoved.current && onLongPress) {
        isLongPressed.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch {}
        }
        onLongPress(chat);
      }
    }, 450);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;

    if (axis.current === 'none') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      hasMoved.current = true;
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }

    if (axis.current !== 'x') return;

    let nextOffset = dx;
    if (nextOffset > MAX_SWIPE) {
      nextOffset = MAX_SWIPE + (nextOffset - MAX_SWIPE) * 0.2;
    } else if (nextOffset < -MAX_SWIPE) {
      nextOffset = -MAX_SWIPE + (nextOffset + MAX_SWIPE) * 0.2;
    }
    setOffset(nextOffset);
  };

  const onPointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsSwiping(false);

    if (axis.current === 'x') {
      if (offset >= SWIPE_THRESHOLD) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(30);
          } catch {}
        }
        onMute?.(!chat.muted);
      } else if (offset <= -SWIPE_THRESHOLD) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(30);
          } catch {}
        }
        onDelete?.();
      }
    }

    setOffset(0);
    start.current = null;
    axis.current = 'none';
  };

  const onContextMenu = (e: React.MouseEvent) => {
    if (onLongPress) {
      e.preventDefault();
      onLongPress(chat);
    }
  };

  return (
    <div className="relative overflow-hidden bg-slate-100 select-none border-b border-slate-100/80 last:border-b-0">
      {/* Slide Right Background: Mute Action */}
      <div
        className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 pr-3 transition-colors ${
          offset > 0 ? (chat.muted ? 'bg-indigo-600' : 'bg-amber-500') : 'opacity-0'
        }`}
        style={{ width: `${Math.max(0, offset)}px` }}
      >
        <div className="flex items-center gap-1.5 text-white font-bold text-xs whitespace-nowrap overflow-hidden">
          {chat.muted ? <Bell className="w-5 h-5 shrink-0" /> : <BellOff className="w-5 h-5 shrink-0" />}
          {offset >= 55 && <span>{chat.muted ? 'Unmute' : 'Mute'}</span>}
        </div>
      </div>

      {/* Slide Left Background: Delete Action */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 pl-3 bg-rose-600 transition-colors ${
          offset < 0 ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ width: `${Math.max(0, -offset)}px` }}
      >
        <div className="flex items-center gap-1.5 text-white font-bold text-xs whitespace-nowrap overflow-hidden">
          {offset <= -55 && <span>Delete</span>}
          <Trash2 className="w-5 h-5 shrink-0" />
        </div>
      </div>

      {/* Foreground List Row Card */}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={onContextMenu}
        onClick={() => {
          if (isLongPressed.current || hasMoved.current || Math.abs(offset) > 5) {
            isLongPressed.current = false;
            return;
          }
          onOpen();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen();
        }}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping ? 'none' : 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className={`relative flex items-center gap-3.5 px-4 py-3.5 bg-white hover:bg-slate-50/80 active:bg-slate-100/70 touch-pan-y cursor-pointer transition-colors group ${
          isOfficial ? 'bg-gradient-to-r from-blue-50/20 via-white to-white' : ''
        }`}
      >
        {/* Avatar: Official custom icon OR user avatar with story ring */}
        <div
          className="relative shrink-0"
          onClick={(e) => {
            if (other.hasStory && other._id && onOpenStory) {
              e.stopPropagation();
              onOpenStory(other._id);
            }
          }}
        >
          {isOfficial ? (
            renderOfficialAvatar()
          ) : other.hasStory ? (
            <div
              className={`p-[2.5px] rounded-full transition-transform active:scale-95 ${
                other.hasUnviewedStory
                  ? 'bg-gradient-to-tr from-rose-500 via-red-500 to-pink-500 shadow-[0_2px_8px_rgba(244,63,94,0.4)] ring-1 ring-rose-200'
                  : 'bg-gradient-to-tr from-rose-300 to-red-300'
              }`}
            >
              <Avatar
                src={other.avatar}
                nickname={other.nickname || '?'}
                size="md"
                online={other.online}
                className="ring-2 ring-white"
              />
            </div>
          ) : (
            <Avatar
              src={other.avatar}
              nickname={other.nickname || '?'}
              size="md"
              online={other.online}
              className="ring-1 ring-black/5"
            />
          )}
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 mb-1">
            <span className="font-bold text-[15px] text-slate-900 truncate group-hover:text-rose-600 transition-colors">
              {other.nickname || (isOfficial ? 'Official Notice' : 'User')}
            </span>

            {isOfficial ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200/70 px-1.5 py-0.2 rounded-md shrink-0">
                <VerifiedBadgeIcon className="w-3 h-3 text-blue-500" />
                <span>Official</span>
              </span>
            ) : null}

            {other.uid && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                ID: {other.uid}
              </span>
            )}

            {other.country && (
              <span className="shrink-0 text-sm leading-none">{flagEmoji(other.country)}</span>
            )}

            {typeof other.level === 'number' && other.level > 0 && <LevelBadge level={other.level} />}

            {other.note && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700 border border-indigo-100 truncate max-w-[120px]"
                title={other.note.text}
              >
                <span className="text-xs">{other.note.emoji || '💭'}</span>
                <span className="truncate">{other.note.text}</span>
              </span>
            )}

            {chat.muted && <BellOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          </div>

          {chat.streak && chat.streak.current < chat.streak.target && (
            <span className="inline-flex items-center gap-1 mb-1 h-[18px] px-1.5 rounded bg-amber-50 text-[10px] font-bold text-amber-700 border border-amber-200/50">
              ⭐ Activating {chat.streak.current}/{chat.streak.target}
            </span>
          )}

          <div className="flex items-center gap-1.5 text-[13px] text-slate-500 truncate leading-snug">
            {renderStatusTick()}
            <div className="truncate">{renderPreviewContent()}</div>
          </div>
        </div>

        {/* Right Info: Time & Unread Badge */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
          <span
            className={`text-[11.5px] tabular-nums font-semibold ${
              unread > 0 ? 'text-rose-600' : 'text-slate-400'
            }`}
          >
            {timeAgo(chat.lastMessageAt)}
          </span>

          {unread > 0 && !chat.muted && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white text-[11px] font-black flex items-center justify-center shadow-sm animate-in fade-in zoom-in-75">
              {unread > 99 ? '99+' : unread}
            </span>
          )}

          {unread > 0 && chat.muted && (
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          )}
        </div>
      </div>
    </div>
  );
};
