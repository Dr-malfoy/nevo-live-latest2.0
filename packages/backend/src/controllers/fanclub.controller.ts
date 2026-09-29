import { Request, Response, NextFunction } from 'express';
import { fanclubService } from '../services/fanclub.service';
import { sendSuccess } from '../utils/response';

export const fanclubController = {
  async getJoined(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await fanclubService.getJoined(req.user!.userId));
    } catch (error) { next(error); }
  },

  async getMine(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await fanclubService.getMine(req.user!.userId));
    } catch (error) { next(error); }
  },

  async joinFanClub(req: Request, res: Response, next: NextFunction) {
    try {
      const { hostId } = req.params;
      sendSuccess(res, await fanclubService.joinFanClub(hostId, req.user!.userId));
    } catch (error) { next(error); }
  },

  async lightUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { hostId } = req.params;
      sendSuccess(res, await fanclubService.lightUp(hostId, req.user!.userId));
    } catch (error) { next(error); }
  },

  async getFanGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = (req.query.scope as 'joined' | 'mine') || 'joined';
      sendSuccess(res, await fanclubService.getFanGroups(req.user!.userId, scope));
    } catch (error) { next(error); }
  },

  async createFanGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, avatar, announcement } = req.body;
      const result = await fanclubService.createFanGroup(req.user!.userId, name, avatar, announcement);
      sendSuccess(res, result, 'Fan group created', 201);
    } catch (error) { next(error); }
  },

  async joinFanGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      sendSuccess(res, await fanclubService.joinFanGroup(groupId, req.user!.userId));
    } catch (error) { next(error); }
  },

  async getGroupMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const { groupId } = req.params;
      sendSuccess(res, await fanclubService.getGroupMembers(groupId));
    } catch (error) { next(error); }
  },
};
