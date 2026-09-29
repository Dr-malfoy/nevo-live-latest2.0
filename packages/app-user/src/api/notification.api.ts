import client from './client';
import type { ApiResponse } from '../types';

export const notificationApi = {
  getNotifications: (params?: any) =>
    client.get<ApiResponse>('/notifications', { params }),

  getUnreadCount: () =>
    client.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  markRead: (id: string) =>
    client.put(`/notifications/${id}/read`),

  markAllRead: () =>
    client.put('/notifications/read-all'),
};
