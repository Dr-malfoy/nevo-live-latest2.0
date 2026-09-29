import client from './client';

export const officialNotificationApi = {
  get: (params?: any) => client.get('/official-notifications', { params }),
  getUnreadCount: () => client.get('/official-notifications/unread-count'),
  markSeen: (id: string) => client.put(`/official-notifications/${id}/seen`),
  markAllSeen: () => client.put('/official-notifications/seen-all'),
};
