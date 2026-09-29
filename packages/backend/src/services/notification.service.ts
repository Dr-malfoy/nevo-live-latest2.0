import { Notification } from '../models';
import { getIO } from '../socket';

export const notificationService = {
  async createNotification(
    userId: string,
    type: 'rate_updated' | 'order' | 'withdrawal' | 'agent_linked' | 'recharge' | 'system' | 'gift',
    title: string,
    message: string,
    data?: Record<string, any>
  ) {
    const notif = await Notification.create({ userId, type, title, message, data });
    try {
      getIO().to(`user:${userId}`).emit('notification:new', notif.toObject());
    } catch {
      // Socket not initialized — notification still saved
    }
    return notif;
  },

  async getUserNotifications(userId: string, page: number, limit: number) {
    const total = await Notification.countDocuments({ userId });
    const data = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    return { data, total };
  },

  async getUnreadCount(userId: string) {
    return Notification.countDocuments({ userId, read: false });
  },

  async markRead(userId: string, notificationId: string) {
    await Notification.updateOne({ _id: notificationId, userId }, { $set: { read: true } });
    return true;
  },

  async markAllRead(userId: string) {
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    return true;
  },
};
