import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { pushNotificationService } from '../services/pushNotification.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const notificationController = {
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const category = (req.query.category as string) || undefined;
      const type = (req.query.type as string) || undefined;
      const unreadOnly = req.query.unreadOnly === 'true';

      const { data, total, totalPages } = await notificationService.getUserNotifications(
        req.user!.userId,
        page,
        limit,
        { category, type, unreadOnly }
      );
      sendPaginated(res, data, total, page, limit, { totalPages });
    } catch (error) {
      next(error);
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await notificationService.getUnreadCount(req.user!.userId);
      sendSuccess(res, { count });
    } catch (error) {
      next(error);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.markRead(req.user!.userId, req.params.id);
      sendSuccess(res, null, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllRead(req.user!.userId);
      sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  },

  async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationService.deleteNotification(req.user!.userId, req.params.id);
      sendSuccess(res, null, 'Notification deleted');
    } catch (error) {
      next(error);
    }
  },

  async registerPushToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, platform, deviceId, deviceName, appVersion } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Push token is required' });
      }

      const result = await pushNotificationService.registerDeviceToken(req.user!.userId, {
        token,
        platform,
        deviceId,
        deviceName,
        appVersion,
      });

      sendSuccess(res, result, 'Device token registered successfully');
    } catch (error) {
      next(error);
    }
  },

  async unregisterPushToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }

      await pushNotificationService.unregisterDeviceToken(req.user!.userId, token);
      sendSuccess(res, null, 'Device token unregistered');
    } catch (error) {
      next(error);
    }
  },
};
