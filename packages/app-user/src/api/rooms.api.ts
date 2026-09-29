import client from './client';
import type { ApiResponse, Room } from '../types';

export const roomsApi = {
  list: (page = 1) =>
    client.get<ApiResponse<Room[]>>('/rooms', { params: { page } }),

  get: (id: string) =>
    client.get<ApiResponse<Room>>(`/rooms/${id}`),

  create: (data: { name: string; description?: string; seatCount?: number; isPrivate?: boolean }) =>
    client.post<ApiResponse<Room>>('/rooms', data),

  join: (id: string, seatIndex?: number) =>
    client.post<ApiResponse<Room>>(`/rooms/${id}/join`, { seatIndex }),

  leave: (id: string) =>
    client.post(`/rooms/${id}/leave`),
};
