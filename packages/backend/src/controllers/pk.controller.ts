import { Request, Response, NextFunction } from 'express';
import { pkService } from '../services/pk.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const pkController = {
  async getPkTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await pkService.getPkTypes());
    } catch (error) { next(error); }
  },

  async getPkRank(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await pkService.getPkRank(req.user?.userId));
    } catch (error) { next(error); }
  },

  async invitePk(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { type, targetUserId, pkType, invitees } = req.body;
      const chosenType = (type || pkType || 'friend') as 'friend' | 'random' | 'team';
      const result = await pkService.invitePk(userId, targetUserId, invitees, chosenType);
      sendSuccess(res, result, 'PK invitation sent', 201);
    } catch (error) { next(error); }
  },

  async matchPk(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { type } = req.body;
      const { battleId } = req.params;
      const result = await pkService.matchPk(userId, type || 'random', battleId);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  },

  async teamPk(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { memberIds, team } = req.body;
      const { battleId } = req.params;
      const result = await pkService.teamPk(userId, memberIds, battleId, team || 'A');
      sendSuccess(res, result);
    } catch (error) { next(error); }
  },

  async getPkHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await pkService.getPkHistory(req.user!.userId, page, limit);
      sendPaginated(res, result.data, result.total, page, limit);
    } catch (error) { next(error); }
  },

  async endPk(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await pkService.endPk(req.params.battleId));
    } catch (error) { next(error); }
  },
};
