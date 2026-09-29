import { Request, Response, NextFunction } from 'express';
import { aviatorService } from '../services/aviator.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const aviatorController = {
  async getMyHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await aviatorService.getUserHistory(req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await aviatorService.getStats();
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  },
};
