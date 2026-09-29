import client from './client';
import type { ApiResponse, UserPublic } from '../types';

/**
 * Referral, fan club, watch history and short video.
 * Specified in BACKEND-GUIDE.md §4.4, §4.8, §4.10 and §4.12.
 */

/* ── Referral (#25, #26, #27, #30, #58) — §4.4 ────────────────────── */

export interface ReferralSummary {
  myId: string;
  maxReward: number;
  claimed: number;
  inviteeCount: number;
  availableToday: number;
  perInvite: number;
}

export interface ReferralTemplate {
  id: string;
  title: string;
  thumbnail?: string;
  badge?: 'HOT' | 'NEW' | null;
  shareCount: number;
  downloadCount: number;
  shareUrl?: string;
}

export interface ReferralTask {
  key: string;
  label: string;
  reward: number;
  done: boolean;
}

export interface AgencyInvitation {
  _id: string;
  invitee: { uid: string; nickname: string; avatar?: string };
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  sentAt: string;
}

export const referralApi = {
  getSummary: () => client.get<ApiResponse<ReferralSummary>>('/referral/summary'),
  claim: () => client.post<ApiResponse<{ claimed: number }>>('/referral/claim'),
  getRank: (page = 1) =>
    client.get<ApiResponse<{ rank: number; user: UserPublic; amount: number }[]>>('/referral/rank', {
      params: { page },
    }),
  getTemplates: () => client.get<ApiResponse<ReferralTemplate[]>>('/referral/templates'),
  shareTemplate: (id: string) =>
    client.post<ApiResponse<{ shareUrl: string }>>(`/referral/templates/${id}/share`),
  getMaterials: () => client.get<ApiResponse<ReferralTemplate[]>>('/referral/materials'),
  getTasks: () =>
    client.get<ApiResponse<{ rules: { maxDailyLiveHoursCounted: number }; tasks: ReferralTask[] }>>(
      '/referral/tasks'
    ),
  getTicker: () =>
    client.get<ApiResponse<{ nickname: string; claimed: number; earned: number }[]>>('/referral/ticker'),

  /** #25 — invite a host into my agency. */
  inviteHost: (userId: string, hostCode: string) =>
    client.post<ApiResponse>('/agency/invite', { userId, hostCode }),
  getInvitations: () => client.get<ApiResponse<AgencyInvitation[]>>('/agency/invitations'),
};

/* ── Fan club / fan group (#41, #59) — §4.10 ──────────────────────── */

export interface FanClubEntry {
  _id: string;
  host: UserPublic;
  clubName?: string;
  fanPower: number;
  tier?: number;
  frozen?: boolean;
}

export interface FanGroup {
  _id: string;
  name: string;
  avatar?: string;
  memberCount: number;
  /** Set when the group has a chat thread. */
  chatId?: string;
}

export const fanClubApi = {
  getJoined: () => client.get<ApiResponse<FanClubEntry[]>>('/fanclub/joined'),
  getMine: () => client.get<ApiResponse<FanClubEntry | null>>('/fanclub/mine'),
  join: (hostId: string) => client.post<ApiResponse>(`/fanclub/${hostId}/join`),
  lightUp: (hostId: string) => client.post<ApiResponse>(`/fanclub/${hostId}/light-up`),

  getGroups: (scope: 'joined' | 'mine' = 'joined') =>
    client.get<ApiResponse<FanGroup[]>>('/fangroups', { params: { scope } }),
  createGroup: (name: string) => client.post<ApiResponse<FanGroup>>('/fangroups', { name }),
  getMembers: (groupId: string) => client.get<ApiResponse<UserPublic[]>>(`/fangroups/${groupId}/members`),
};

/* ── Watch history (#63) — §4.12 ──────────────────────────────────── */

export interface WatchItem {
  targetId: string;
  cover?: string;
  title?: string;
  hostName?: string;
  country?: string;
  ended: boolean;
  viewerCount?: number;
}

export interface WatchGroup {
  label: string;
  items: WatchItem[];
}

export const historyApi = {
  /** Fire-and-forget on entering a live room or video. */
  record: (type: 'live' | 'video', targetId: string) =>
    client.post<ApiResponse>('/history/watch', { type, targetId }),

  get: (type: 'live' | 'video' = 'live', page = 1) =>
    client.get<ApiResponse<{ groups: WatchGroup[] }>>('/history/watch', { params: { type, page } }),

  clear: () => client.delete<ApiResponse>('/history/watch'),
};

/* ── Short video (#57) — §4.8 ─────────────────────────────────────── */

export interface VideoItem {
  _id: string;
  userId: UserPublic;
  content?: string;
  videoUrl?: string;
  thumbnail?: string;
  durationSec?: number;
  hashtags?: string[];
  likes: string[];
  comments: unknown[];
  viewCount?: number;
  giftCount?: number;
  shareCount?: number;
  createdAt: string;
  /** True when the author is someone the viewer follows. */
  fromFollowing?: boolean;
}

export const videoApi = {
  getFeed: (tab: 'following' | 'popular' | 'hot' = 'popular', page = 1) =>
    client.get<ApiResponse<VideoItem[]>>('/videos/feed', { params: { tab, page } }),

  view: (id: string) => client.post<ApiResponse>(`/videos/${id}/view`),
  share: (id: string) => client.post<ApiResponse>(`/videos/${id}/share`),
  gift: (id: string, giftId: string, quantity = 1) =>
    client.post<ApiResponse>(`/videos/${id}/gift`, { giftId, quantity }),
};
