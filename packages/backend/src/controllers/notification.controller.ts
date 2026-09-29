import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const notificationController = {
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await notificationService.getUserNotifications(req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
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
};
