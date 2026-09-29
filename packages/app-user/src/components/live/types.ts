import type { UserPublic, LiveStream, Gift } from '../../types';
import type { GiftBurst } from './GiftOverlay';

export interface RoomMessage {
  userId: string;
  nickname: string;
  avatar?: string;
  message: string;
  gift?: Gift;
  count?: number;
  isGift?: boolean;
  kind?: 'chat' | 'join';
  level?: number;
  /** True for diamond-paid highlighted (SMS) messages. */
  isHighlight?: boolean;
}

export interface RoomNotification {
  id: string;
  kind: 'join' | 'follow' | 'gift';
  text: string;
  avatar?: string;
}

export interface LiveRoomProps {
  stream: LiveStream | null;
  streamTitle?: string;
  host: UserPublic | null;
  balance?: { coins?: number; diamonds?: number };
  user?: { _id: string; nickname: string; avatar?: string } | null;
  isHost: boolean;
  joined: boolean;
  videoEnabled: boolean;
  cameraOn: boolean;
  micOn: boolean;
  /** RTC connection error message (e.g. network lost) — rendered as a pill. */
  error?: string;
  elapsed: string;
  isFollowing: boolean;
  followBusy?: boolean;
  messages: RoomMessage[];
  notifications: RoomNotification[];
  giftBurst: GiftBurst | null;
  onLeave: () => void;
  onEnd: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onSwitchCamera: () => void;
  onFollowToggle: () => void;
  onChatSend: (message: string) => void;
  onOpenGift: () => void;
  onReport: () => void;
  onHostClick?: (host: UserPublic) => void;
  likeCount: number;
  onLike: () => void;
  /** Host camera enhancements */
  filterCss?: string;
  activeFilterId?: string;
  onSelectFilter?: (id: string) => void;
  stickerState?: {
    stickers: import('../../hooks/useStickers').PlacedSticker[];
    selectedId: string | null;
    selectSticker: (id: string | null) => void;
    addSticker: (stickerId: string) => void;
    moveSticker: (id: string, x: number, y: number) => void;
    resizeSticker: (id: string, delta: number) => void;
    rotateSticker: (id: string, delta: number) => void;
    removeSticker: (id: string) => void;
    bringToFront: (id: string) => void;
  } | null;
  showFilters?: boolean;
  showStickers?: boolean;
  onToggleFilters?: () => void;
  onToggleStickers?: () => void;
}
