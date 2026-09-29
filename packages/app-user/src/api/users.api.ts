import client from './client';
import type {
  ApiResponse,
  User,
  UserPublic,
  ProfileStats,
  ProfileVisitor,
  PublicProfile,
  Gender,
} from '../types';

export interface UpdateProfileInput {
  nickname?: string;
  avatar?: string;
  cover?: string;
  /** ISO 3166-1 alpha-2 (BD, IN…). Send '' to clear. */
  country?: string;
  gender?: Gender;
  /** ISO date string. Send '' to clear. */
  birthday?: string;
  bio?: string;
  tags?: string[];
}

/** Follow/unfollow return the fresh counts so callers never re-query. */
export interface FollowResult {
  following: boolean;
  followers: number;
  followingCount: number;
}

export const usersApi = {
  getProfile: () => client.get<ApiResponse<User>>('/users/me'),

  /** Also records the viewer as a visitor on the server (requirement #2). */
  getPublicProfile: (id: string) => client.get<ApiResponse<PublicProfile>>(`/users/${id}`),

  searchUsers: (q: string, params?: any) =>
    client.get<ApiResponse<UserPublic[]>>('/users/search', { params: { q, ...params } }),

  updateProfile: (data: UpdateProfileInput) => client.put<ApiResponse<User>>('/users/me', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    client.put('/users/me/password', { currentPassword, newPassword }),

  deleteAccount: (reauth: { password?: string; idToken?: string }) =>
    client.delete('/users/me', { data: reauth }),

  toggleFollow: (id: string) => client.post<ApiResponse<FollowResult>>(`/users/${id}/follow`),

  follow: (id: string) => client.put<ApiResponse<FollowResult>>(`/users/${id}/follow`),

  unfollow: (id: string) => client.delete<ApiResponse<FollowResult>>(`/users/${id}/follow`),

  getFollowStatus: (id: string) =>
    client.get<ApiResponse<{ following: boolean; followers: number; followingCount: number }>>(
      `/users/${id}/follow-status`
    ),

  /* ── Requirement #2 — the four counts and their lists ─────────── */

  /** Friends / Following / Followers / Visitors counts. */
  getStats: (id?: string) => client.get<ApiResponse<ProfileStats>>(`/users/${id || 'me'}/stats`),

  /** Mutual follows. */
  getFriends: (id?: string, page = 1) =>
    client.get<ApiResponse<UserPublic[]>>(`/users/${id || 'me'}/friends`, { params: { page } }),

  getFollowers: (id?: string, page = 1) =>
    client.get<ApiResponse<UserPublic[]>>(`/users/${id || 'me'}/followers`, { params: { page } }),

  getFollowing: (id?: string, page = 1) =>
    client.get<ApiResponse<UserPublic[]>>(`/users/${id || 'me'}/following`, { params: { page } }),

  /** Visitors from the last 7 days. Owner-only — the server rejects others. */
  getVisitors: (id?: string, page = 1) =>
    client.get<ApiResponse<ProfileVisitor[]>>(`/users/${id || 'me'}/visitors`, { params: { page } }),
};
