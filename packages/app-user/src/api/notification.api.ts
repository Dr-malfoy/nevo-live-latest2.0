import client from './client';
import type { ApiResponse } from '../types';

export interface NotificationItem {
  _id: string;
  userId: string;
  type: string;
  category?: string;
  senderId?: {
    _id: string;
    nickname: string;
    avatar?: string;
    uid?: string;
    level?: number;
  };
  senderInfo?: {
    nickname?: string;
    avatar?: string;
    uid?: string;
  };
  title: string;
  message: string;
  targetUrl?: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notificationApi = {
  getNotifications: (params?: { page?: number; limit?: number; category?: string; type?: string; unreadOnly?: boolean }) =>
    client.get<ApiResponse<NotificationItem[]>>('/notifications', { params }),

  getUnreadCount: () =>
    client.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  markRead: (id: string) =>
    client.put<ApiResponse>(`/notifications/${id}/read`),

  markAllRead: () =>
    client.put<ApiResponse>('/notifications/read-all'),

  deleteNotification: (id: string) =>
    client.delete<ApiResponse>(`/notifications/${id}`),

  registerPushToken: (data: {
    token: string;
    platform?: 'android' | 'ios' | 'web';
    deviceId?: string;
    deviceName?: string;
    appVersion?: string;
  }) => client.post<ApiResponse>('/notifications/push-token/register', data),

  unregisterPushToken: (data: { token: string }) =>
    client.post<ApiResponse>('/notifications/push-token/unregister', data),
};
