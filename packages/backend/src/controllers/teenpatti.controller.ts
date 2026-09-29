import { Request, Response, NextFunction } from 'express';
import { teenPattiService } from '../services/teenpatti.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const teenPattiController = {
  async getMyHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await teenPattiService.getUserHistory(req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await teenPattiService.getStats();
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  },
};
