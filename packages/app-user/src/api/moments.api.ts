import client from './client';
import type { ApiResponse, Moment } from '../types';

export interface CreateMomentPayload {
  content?: string;
  media?: string[];
  mediaType?: 'image' | 'video';
  videoUrl?: string;
  thumbnail?: string;
  hashtags?: string[];
  durationSec?: number;
}

export const momentsApi = {
  getFeed: (page = 1) =>
    client.get<ApiResponse<Moment[]>>('/moments', { params: { page } }),

  create: (data: CreateMomentPayload) =>
    client.post<ApiResponse<Moment>>('/moments', data),

  update: (id: string, data: { content?: string; hashtags?: string[] }) =>
    client.put<ApiResponse<Moment>>(`/moments/${id}`, data),

  delete: (id: string) =>
    client.delete(`/moments/${id}`),

  toggleLike: (id: string) =>
    client.post<ApiResponse<{ liked: boolean; likesCount?: number }>>(`/moments/${id}/like`),

  addComment: (id: string, text: string) =>
    client.post<ApiResponse<any>>(`/moments/${id}/comment`, { text }),

  share: (id: string) =>
    client.post<ApiResponse<{ shareCount: number }>>(`/moments/${id}/share`),
};
