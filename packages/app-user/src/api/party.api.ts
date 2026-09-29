import client from './client';
import type { ApiResponse, UserPublic } from '../types';

/**
 * Party rooms, seats and PK — #17, #18, #19, #50.
 * Specified in BACKEND-GUIDE.md §4.9.
 *
 * `GET/POST /rooms`, `/rooms/:id`, `:id/join` and `:id/leave` exist.
 * Seats, admins, the room feed and PK do not.
 */

export interface RoomSeat {
  index: number;
  userId?: UserPublic | null;
  isLocked: boolean;
  isMuted?: boolean;
  /** The number shown under each seat. */
  giftValue?: number;
  crown?: boolean;
}

export interface PartyRoomDetail {
  _id: string;
  name: string;
  description?: string;
  ownerId: UserPublic;
  theme?: string;
  announcement?: string;
  seatCount: number;
  seats: RoomSeat[];
  admins?: string[];
  viewerCount?: number;
  isPrivate?: boolean;
  agoraChannel?: string;
  agoraToken?: string;
}

export interface PartyListItem {
  _id: string;
  name: string;
  thumbnail?: string;
  owner: UserPublic;
  tag?: { type: string; label: string };
  memberAvatars?: string[];
  memberCount: number;
  viewerCount: number;
  /** True when someone the viewer follows is inside — drives the blue tag. */
  followingInside?: boolean;
}

/* ── PK (#19) ─────────────────────────────────────────────────────── */

export type PkType = 'friend' | 'random' | 'team';

export interface PkTypeCard {
  type: PkType;
  title: string;
  subtitle: string;
  emoji?: string;
  isDefault?: boolean;
}

export interface PkRank {
  rank: number | null;
  tier: string;
  points: number;
}

export interface PkBattle {
  _id: string;
  type: PkType;
  scoreA: number;
  scoreB: number;
  startedAt: string;
  endsAt: string;
  status: 'pending' | 'running' | 'ended';
  winnerSide?: 'A' | 'B' | null;
}

export const partyApi = {
  /* ── Exists ─────────────────────────────────────────────────────── */
  getRoom: (id: string) => client.get<ApiResponse<PartyRoomDetail>>(`/rooms/${id}`),
  joinRoom: (id: string) => client.post<ApiResponse>(`/rooms/${id}/join`),
  leaveRoom: (id: string) => client.post<ApiResponse>(`/rooms/${id}/leave`),
  closeRoom: (id: string) => client.delete<ApiResponse>(`/rooms/${id}`),
  listRooms: (params?: any) => client.get<ApiResponse<any[]>>('/rooms', { params }),

  /* ── Not built yet — §4.9 ───────────────────────────────────────── */

  /** #50 — the party listing with Following / Party tabs and a country filter. */
  getFeed: (params: { tab: 'following' | 'party'; country?: string; page?: number }) =>
    client.get<ApiResponse<PartyListItem[]>>('/rooms/feed', { params }),

  sit: (roomId: string, index: number) => client.post<ApiResponse>(`/rooms/${roomId}/seats/${index}/sit`),
  stand: (roomId: string, index: number) =>
    client.post<ApiResponse>(`/rooms/${roomId}/seats/${index}/stand`),
  lockSeat: (roomId: string, index: number, locked: boolean) =>
    client.post<ApiResponse>(`/rooms/${roomId}/seats/${index}/lock`, { locked }),
  muteSeat: (roomId: string, index: number, muted: boolean) =>
    client.post<ApiResponse>(`/rooms/${roomId}/seats/${index}/mute`, { muted }),
  kickSeat: (roomId: string, index: number) =>
    client.post<ApiResponse>(`/rooms/${roomId}/seats/${index}/kick`),
  setAdmin: (roomId: string, userId: string, action: 'add' | 'remove') =>
    client.post<ApiResponse>(`/rooms/${roomId}/admins`, { userId, action }),

  getPkTypes: () => client.get<ApiResponse<PkTypeCard[]>>('/pk/types'),
  getPkRank: () => client.get<ApiResponse<PkRank>>('/pk/rank'),
  invitePk: (type: PkType, targetUserId: string) =>
    client.post<ApiResponse<PkBattle>>('/pk/invite', { type, targetUserId }),
  matchPk: (type: PkType = 'random') => client.post<ApiResponse<PkBattle>>('/pk/match', { type }),
  teamPk: (memberIds: string[]) => client.post<ApiResponse<PkBattle>>('/pk/team', { type: 'team', memberIds }),
  getPkHistory: () => client.get<ApiResponse<PkBattle[]>>('/pk/history'),
};
