import mongoose from 'mongoose';
import { Notification, NotificationType, User } from '../models';
import { getIO } from '../socket';
import { pushNotificationService } from './pushNotification.service';

export interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  category?: 'system' | 'arrival_notice' | 'new_followers' | 'income_reminder' | 'social' | 'other';
  senderId?: string;
  senderInfo?: {
    nickname?: string;
    avatar?: string;
    uid?: string;
  };
  targetUrl?: string;
  data?: Record<string, any>;
  dedupKey?: string;
  skipPush?: boolean;
}

export const notificationService = {
  /**
   * Create an in-app notification, emit real-time socket event, and send mobile push notification.
   * Handles user preferences, deduplication, and sender enrichment.
   */
  async createNotification(
    userIdOrOptions: string | CreateNotificationOptions,
    typeParam?: NotificationType,
    titleParam?: string,
    messageParam?: string,
    dataParam?: Record<string, any>
  ) {
    try {
      let opts: CreateNotificationOptions;
      if (typeof userIdOrOptions === 'object') {
        opts = userIdOrOptions;
      } else {
        opts = {
          userId: userIdOrOptions,
          type: typeParam || 'system',
          title: titleParam || '',
          message: messageParam || '',
          data: dataParam,
        };
      }

      const { userId, type, title, message, category, senderId, targetUrl, data, skipPush } = opts;
      let senderInfo = opts.senderInfo;

      if (!userId || !mongoose.isValidObjectId(userId)) return null;

      // Check recipient's notification settings
      const recipient = await User.findById(userId).select('settings nickname avatar').lean();
      if (!recipient) return null;

      const notifSettings = (recipient as any).settings?.notifications;
      if (notifSettings) {
        if (type === 'follower' && notifSettings.follow === false) return null;
        if (type === 'gift' && notifSettings.gift === false) return null;
        if (type === 'live_started' && notifSettings.live === false) return null;
        if (type === 'system' && notifSettings.system === false) return null;
      }

      // Sender enrichment if senderId provided and senderInfo not supplied
      if (senderId && mongoose.isValidObjectId(senderId) && (!senderInfo || !senderInfo.nickname)) {
        const sender = await User.findById(senderId).select('nickname avatar uid').lean();
        if (sender) {
          senderInfo = {
            nickname: (sender as any).nickname || 'User',
            avatar: (sender as any).avatar || '',
            uid: (sender as any).uid || '',
          };
        }
      }

      // Deduplication: prevent spamming duplicate notifications for the same event within 15 seconds
      const recentWindow = new Date(Date.now() - 15000);
      const duplicateQuery: any = {
        userId: new mongoose.Types.ObjectId(userId),
        type,
        createdAt: { $gte: recentWindow },
      };
      if (senderId) duplicateQuery.senderId = new mongoose.Types.ObjectId(senderId);
      if (opts.dedupKey && data?.dedupKey) duplicateQuery['data.dedupKey'] = data.dedupKey;

      const existingRecent = await Notification.findOne(duplicateQuery).lean();
      if (existingRecent) {
        return existingRecent;
      }

      // Derive appropriate category if not explicitly provided
      let notifCategory = category;
      if (!notifCategory) {
        if (type === 'follower' || type === 'friend_request' || type === 'friend_request_accepted') {
          notifCategory = 'new_followers';
        } else if (type === 'gift' || type === 'coin_received' || type === 'coin_transfer') {
          notifCategory = 'income_reminder';
        } else if (type === 'live_started' || type === 'live_joined') {
          notifCategory = 'arrival_notice';
        } else {
          notifCategory = 'system';
        }
      }

      // Determine default targetUrl for deep linking if none provided
      let finalTargetUrl = targetUrl || '';
      if (!finalTargetUrl) {
        if (type === 'message' && data?.chatId) {
          finalTargetUrl = `/chat/${data.chatId}`;
        } else if (type === 'follower' && senderId) {
          finalTargetUrl = `/user/${senderId}`;
        } else if ((type === 'live_started' || type === 'live_joined') && data?.streamId) {
          finalTargetUrl = `/stream/${data.streamId}`;
        } else if ((type === 'live_started' || type === 'live_joined') && data?.roomId) {
          finalTargetUrl = `/party/${data.roomId}`;
        } else if (type === 'gift' || type === 'coin_received' || type === 'coin_transfer') {
          finalTargetUrl = '/wallet';
        } else if (type.startsWith('agency')) {
          finalTargetUrl = '/my-agency';
        }
      }

      const notif = await Notification.create({
        userId: new mongoose.Types.ObjectId(userId),
        type,
        category: notifCategory,
        senderId: senderId && mongoose.isValidObjectId(senderId) ? new mongoose.Types.ObjectId(senderId) : undefined,
        senderInfo,
        title,
        message,
        targetUrl: finalTargetUrl,
        data,
      });

      // 1. Emit live socket event to user
      try {
        getIO()?.to(`user:${userId}`).emit('notification:new', notif.toObject());
      } catch {
        // Socket not initialized or offline
      }

      // 2. Send Mobile Push Notification via FCM
      if (!skipPush) {
        const pushPayloadData: Record<string, string> = {
          notificationId: notif._id.toString(),
          type,
          category: notifCategory || 'system',
          targetUrl: finalTargetUrl,
          ...(senderId ? { senderId } : {}),
          ...(senderInfo?.nickname ? { senderNickname: senderInfo.nickname } : {}),
          ...(senderInfo?.avatar ? { senderAvatar: senderInfo.avatar } : {}),
        };

        if (data) {
          for (const [k, v] of Object.entries(data)) {
            if (v !== undefined && v !== null) {
              pushPayloadData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
            }
          }
        }

        pushNotificationService.sendToUser(userId, {
          title,
          body: message,
          imageUrl: senderInfo?.avatar || undefined,
          data: pushPayloadData,
        }).catch((err) => console.warn('[NotificationService] Push send error:', err));
      }

      return notif;
    } catch (err) {
      console.warn('[NotificationService] Failed to create notification:', err);
      return null;
    }
  },

  /**
   * Query user notifications with pagination and category filtering.
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filter?: { category?: string; type?: string; unreadOnly?: boolean }
  ) {
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (filter?.category && filter.category !== 'all') {
      if (filter.category === 'social') {
        query.type = { $in: ['follower', 'friend_request', 'friend_request_accepted', 'message'] };
      } else if (filter.category === 'income') {
        query.type = { $in: ['gift', 'coin_received', 'coin_transfer', 'withdrawal', 'recharge', 'rate_updated'] };
      } else if (filter.category === 'live') {
        query.type = { $in: ['live_started', 'live_joined'] };
      } else if (filter.category === 'agency') {
        query.type = { $in: ['agency_join_request', 'agency_join_approved', 'agency_join_rejected', 'agency_invitation', 'agent_linked'] };
      } else if (filter.category === 'system') {
        query.type = { $in: ['system', 'order'] };
      } else {
        query.category = filter.category;
      }
    }

    if (filter?.type) {
      query.type = filter.type;
    }

    if (filter?.unreadOnly) {
      query.read = false;
    }

    const total = await Notification.countDocuments(query);
    const data = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('senderId', 'nickname avatar uid level')
      .lean();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  async getUnreadCount(userId: string) {
    if (!userId || !mongoose.isValidObjectId(userId)) return 0;
    return Notification.countDocuments({ userId: new mongoose.Types.ObjectId(userId), read: false });
  },

  async markRead(userId: string, notificationId: string) {
    if (!userId || !notificationId || !mongoose.isValidObjectId(notificationId)) return false;
    await Notification.updateOne(
      { _id: new mongoose.Types.ObjectId(notificationId), userId: new mongoose.Types.ObjectId(userId) },
      { $set: { read: true } }
    );
    return true;
  },

  async markAllRead(userId: string) {
    if (!userId || !mongoose.isValidObjectId(userId)) return false;
    await Notification.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), read: false },
      { $set: { read: true } }
    );
    return true;
  },

  async deleteNotification(userId: string, notificationId: string) {
    if (!userId || !notificationId || !mongoose.isValidObjectId(notificationId)) return false;
    await Notification.deleteOne({
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    return true;
  },

  async deleteAllNotifications(userId: string, filter?: { onlyRead?: boolean }) {
    if (!userId || !mongoose.isValidObjectId(userId)) return false;
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (filter?.onlyRead) {
      query.read = true;
    }
    await Notification.deleteMany(query);
    return true;
  },
};

