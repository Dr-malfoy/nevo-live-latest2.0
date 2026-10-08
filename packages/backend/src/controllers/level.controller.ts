import { Request, Response, NextFunction } from 'express';
import { levelService } from '../services/level.service';
import { sendSuccess } from '../utils/response';

export const levelController = {
  async getLevels(req: Request, res: Response, next: NextFunction) {
    try {
      const { kind } = req.params;
      const userId = req.user?.userId;
      sendSuccess(res, await levelService.getLevels(kind, userId));
    } catch (error) { next(error); }
  },

  async getAchievements(req: Request, res: Response, next: NextFunction) {
    try {
      const { category } = req.query as { category?: string };
      const userId = req.user?.userId;
      sendSuccess(res, await levelService.getAchievements(category, userId));
    } catch (error) { next(error); }
  },
};
