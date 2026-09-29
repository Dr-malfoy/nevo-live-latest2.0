import { Request, Response, NextFunction } from 'express';
import { levelService } from '../services/level.service';
import { sendSuccess } from '../utils/response';

export const levelController = {
  async getLevels(req: Request, res: Response, next: NextFunction) {
    try {
      const { kind } = req.params;
      sendSuccess(res, await levelService.getLevels(kind));
    } catch (error) { next(error); }
  },

  async getAchievements(req: Request, res: Response, next: NextFunction) {
    try {
      const { category } = req.query as { category?: string };
      sendSuccess(res, await levelService.getAchievements(category));
    } catch (error) { next(error); }
  },
};
