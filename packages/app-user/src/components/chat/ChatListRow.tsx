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
} from 'react-icons/pi';
import { Avatar } from '../user';
import { LevelBadge } from '../user/LevelBadge';
import { flagEmoji } from '../../lib/countries';
import { timeAgo } from '../../lib/time';

export interface ChatRow {
  _id: string;
  other?: {
    _id?: string;
    nickname?: string;
    avatar?: string;
    level?: number;
    country?: string;
    online?: boolean;
    liveStreamId?: string | null;
    verification?: { verified?: boolean };
  };
  lastMessage?: string;
  lastMessageType?: 'text' | 'voice' | 'gift' | 'image';
  lastMessageAt?: string;
  lastMessageStatus?: 'sending' | 'sent' | 'delivered' | 'seen';
  lastMessageSenderId?: string;
  unread?: number;
  muted?: boolean;
  type?: 'private' | 'group';
  /** "Activating 1/3" — chat-streak progress (requirement #16C.4). */
  streak?: { current: number; target: number };
}

interface ChatListRowProps {
  chat: ChatRow;
  currentUserId?: string;
  onOpen: () => void;
  onMute?: (muted: boolean) => void;
  onDelete?: () => void;
  onLongPress?: (chat: ChatRow) => void;
}

const SWIPE_THRESHOLD = 75; // px to trigger action on release
const MAX_SWIPE = 110;

export const ChatListRow = ({
  chat,
  currentUserId,
  onOpen,
  onMute,
  onDelete,
  onLongPress,
}: ChatListRowProps) => {
  const [offset, setOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<'none' | 'x' | 'y'>('none');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressed = useRef(false);
  const hasMoved = useRef(false);

  const other = chat.other || {};
  const unread = chat.unread || 0;
  const isMine = chat.lastMessageSenderId && currentUserId && chat.lastMessageSenderId === currentUserId;

  const renderStatusTick = () => {
    if (!isMine) return null;
    const status = chat.lastMessageStatus || 'sent';

    if (status === 'seen') {
      return <Checks className="w-3.5 h-3.5 text-[#0284c7] shrink-0" title="Seen" />;
    }
    if (status === 'delivered') {
      return <Checks className="w-3.5 h-3.5 text-ink-ghost shrink-0" title="Delivered" />;
    }
    return <Check className="w-3.5 h-3.5 text-ink-ghost shrink-0" title="Sent" />;
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
          } catch {
            // ignore
          }
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

    // Dampen drag past max swipe
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
      // Slide right -> Mute / Unmute
      if (offset >= SWIPE_THRESHOLD) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(30);
          } catch {
            // ignore
          }
        }
        onMute?.(!chat.muted);
      }
      // Slide left -> Delete / Remove
      else if (offset <= -SWIPE_THRESHOLD) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(30);
          } catch {
            // ignore
          }
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
    <div className="relative overflow-hidden bg-slate-100 select-none">
      {/* Left Action: Slide Right to Mute/Unmute */}
      <div
        className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 pr-3 transition-colors ${
          offset > 0 ? (chat.muted ? 'bg-indigo-500' : 'bg-amber-500') : 'opacity-0'
        }`}
        style={{ width: `${Math.max(0, offset)}px` }}
      >
        <div className="flex items-center gap-1.5 text-white font-bold text-xs whitespace-nowrap overflow-hidden">
          {chat.muted ? <Bell className="w-5 h-5 shrink-0" /> : <BellOff className="w-5 h-5 shrink-0" />}
          {offset >= 55 && <span>{chat.muted ? 'Unmute' : 'Mute'}</span>}
        </div>
      </div>

      {/* Right Action: Slide Left to Remove / Delete */}
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

      {/* Main Foreground Card */}
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
        className="relative flex items-center gap-3.5 px-4 py-3 bg-white active:bg-slate-50
          touch-pan-y cursor-pointer group"
      >
        {/* Avatar with Online/Live badge */}
        <div className="relative shrink-0">
          <Avatar
            src={other.avatar}
            nickname={other.nickname || '?'}
            size="md"
            online={other.online}
            className="ring-1 ring-black/5"
          />
        </div>

        {/* Middle Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
            <span className="font-bold text-[15px] text-ink truncate group-hover:text-primary-600 transition-colors">
              {other.nickname || 'User'}
            </span>
            {other.uid && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                ID: {other.uid}
              </span>
            )}
            {other.country && (
              <span className="shrink-0 text-sm leading-none">{flagEmoji(other.country)}</span>
            )}
            {typeof other.level === 'number' && other.level > 0 && <LevelBadge level={other.level} />}
            {chat.muted && <BellOff className="w-3.5 h-3.5 text-ink-ghost shrink-0" />}
          </div>

          {chat.streak && chat.streak.current < chat.streak.target && (
            <span className="inline-flex items-center gap-1 mb-0.5 h-[18px] px-1.5 rounded bg-amber-500/10 text-[10px] font-bold text-amber-600">
              ⭐ Activating {chat.streak.current}/{chat.streak.target}
            </span>
          )}

          <div className="flex items-center gap-1.5 text-[13px] text-ink-muted truncate">
            {renderStatusTick()}
            <div className="truncate">{renderPreviewContent()}</div>
          </div>
        </div>

        {/* Right Info: Time + Unread Pill */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
          <span
            className={`text-[11px] tabular-nums font-medium ${
              unread > 0 ? 'text-primary-600 font-semibold' : 'text-ink-faint'
            }`}
          >
            {timeAgo(chat.lastMessageAt)}
          </span>

          {unread > 0 && !chat.muted && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[11px] font-black flex items-center justify-center shadow-sm animate-in fade-in zoom-in-75">
              {unread > 99 ? '99+' : unread}
            </span>
          )}

          {unread > 0 && chat.muted && (
            <span className="w-2.5 h-2.5 rounded-full bg-ink-ghost" />
          )}
        </div>
      </div>
    </div>
  );
};
