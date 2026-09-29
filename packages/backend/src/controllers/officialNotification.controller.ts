import { Request, Response, NextFunction } from 'express';
import { OfficialNotification } from '../models';
import { officialNotificationService } from '../services/officialNotification.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const officialNotificationController = {
  // ── User-facing ──────────────────────────────────────────────
  async getForUser(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await officialNotificationService.getForUser(req.user?.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      const count = userId
        ? await officialNotificationService.getUnreadCount(userId)
        : await OfficialNotification.countDocuments({ active: true });
      sendSuccess(res, { count });
    } catch (error) {
      next(error);
    }
  },

  async markSeen(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) return sendSuccess(res, { success: true });
      await officialNotificationService.markSeen(req.user.userId, req.params.id);
      sendSuccess(res, { success: true });
    } catch (error) {
      next(error);
    }
  },

  async markAllSeen(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.userId) return sendSuccess(res, { success: true });
      await officialNotificationService.markAllSeen(req.user.userId);
      sendSuccess(res, { success: true });
    } catch (error) {
      next(error);
    }
  },

  // ── Admin ────────────────────────────────────────────────────
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await officialNotificationService.listAdmin(page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, message, icon } = req.body;
      if (!title || !message) {
        res.status(400).json({ success: false, error: 'Title and message are required' });
        return;
      }
      const doc = await officialNotificationService.create({ title, message, icon });
      sendSuccess(res, doc, 'Official notification created', 201);
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await officialNotificationService.update(req.params.id, req.body);
      sendSuccess(res, doc, 'Official notification updated');
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await officialNotificationService.remove(req.params.id);
      sendSuccess(res, null, 'Official notification deleted');
    } catch (error) {
      next(error);
    }
  },
};
