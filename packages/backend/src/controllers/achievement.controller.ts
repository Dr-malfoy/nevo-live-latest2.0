import { Request, Response, NextFunction } from 'express';
import { achievementService } from '../services/achievement.service';
import { sendSuccess } from '../utils/response';

export const achievementController = {
  /**
   * GET /api/achievements?category=milestones|merits|identity|all
   */
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { category } = req.query as { category?: string };
      const userId = req.user?.userId;
      const result = await achievementService.getAchievements(category, userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};
