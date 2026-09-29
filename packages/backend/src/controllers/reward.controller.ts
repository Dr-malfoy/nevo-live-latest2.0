import { Request, Response, NextFunction } from 'express';
import { rewardService } from '../services/reward.service';
import { sendSuccess } from '../utils/response';

export const rewardController = {
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await rewardService.getStatus((req as any).user.userId);
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  },

  async claim(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await rewardService.claimReward((req as any).user.userId);
      sendSuccess(res, result, 'Daily reward claimed');
    } catch (error) {
      next(error);
    }
  },

  async getConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const config = await rewardService.getConfig();
      sendSuccess(res, config);
    } catch (error) {
      next(error);
    }
  },

  async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await rewardService.updateConfig(req.body);
      sendSuccess(res, config, 'Reward config updated');
    } catch (error) {
      next(error);
    }
  },
};
