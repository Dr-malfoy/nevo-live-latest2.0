import client from './client';
import type { ApiResponse } from '../types';

/** Official inbox categories — requirement #16C / #65. */
export type OfficialChatKey = 'system' | 'arrival_notice' | 'new_followers' | 'income_reminder';

export interface OfficialChatRow {
  key: OfficialChatKey;
  title: string;
  icon: string;
  subtitle: string;
  unread: number;
  time: string;
}

export interface ActiveChatUser {
  _id: string;
  uid?: string;
  nickname: string;
  avatar?: string;
  level?: number;
  country?: string;
  online?: boolean;
  /** Non-null when this person is live right now — tap goes to the live room. */
  liveStreamId?: string | null;
  roomId?: string | null;
  relationship?: 'friend' | 'follower' | 'following' | 'recent' | 'suggested';
}

export interface ChatStreak {
  current: number;
  target: number;
  litUp: boolean;
  lastChatDate?: string;
}

export const chatApi = {
  getChats: (params?: any) => client.get<ApiResponse>('/chats', { params }),

  getChat: (chatId: string) => client.get<ApiResponse>(`/chats/${chatId}`),

  getOrCreateChat: (userId: string) => client.post<ApiResponse>('/chats', { userId }),

  getMessages: (chatId: string, params?: any) =>
    client.get<ApiResponse>(`/chats/${chatId}/messages`, { params }),

  sendMessage: (chatId: string, message: string, extras?: any) =>
    client.post<ApiResponse>(`/chats/${chatId}/messages`, { message, ...extras }),

  markRead: (chatId: string) => client.post<ApiResponse>(`/chats/${chatId}/read`),

  getUnreadCount: () => client.get<ApiResponse<{ count: number }>>('/chats/unread-count'),

  /* ── Not built yet — specified in API-SPEC.md (#16 / #65) ──────────
     Wrap these in `optional()` at the call site so the section hides
     until the backend ships them.                                     */

  /** The four coloured official rows (System / Arrival / Followers / Income). */
  getOfficialRows: () => client.get<ApiResponse<OfficialChatRow[]>>('/chats/official'),

  getOfficialItems: (key: OfficialChatKey, page = 1) =>
    client.get<ApiResponse>(`/chats/official/${key}`, { params: { page } }),

  markOfficialRead: (key: OfficialChatKey) => client.post<ApiResponse>(`/chats/official/${key}/read`),

  /** The story strip of people who are live or online. */
  getActiveUsers: () => client.get<ApiResponse<ActiveChatUser[]>>('/chats/active-users'),

  /** "Chat 3 days straight to light up your Starlink". */
  getStreak: (chatId: string) => client.get<ApiResponse<ChatStreak>>(`/chats/${chatId}/streak`),

  editMessage: (chatId: string, messageId: string, message: string) =>
    client.put<ApiResponse>(`/chats/${chatId}/messages/${messageId}`, { message }),

  deleteMessage: (chatId: string, messageId: string) =>
    client.delete<ApiResponse>(`/chats/${chatId}/messages/${messageId}`),

  clearChat: (chatId: string) => client.delete<ApiResponse>(`/chats/${chatId}/clear`),

  muteChat: (chatId: string, muted: boolean) =>
    client.post<ApiResponse>(`/chats/${chatId}/mute`, { muted }),

  deleteChat: (chatId: string) => client.delete<ApiResponse>(`/chats/${chatId}`),
};
