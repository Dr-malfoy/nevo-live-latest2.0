import { Request, Response, NextFunction } from 'express';
import { streamerService } from '../services/streamer.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const streamerController = {
  async getStreamerStats(req: Request, res: Response, next: NextFunction) {
    try {
      const range = (req.query.range as string) || 'today';
      sendSuccess(res, await streamerService.getStreamerStats(req.user!.userId, range));
    } catch (error) { next(error); }
  },

  async getLastReport(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await streamerService.getLastReport(req.user!.userId));
    } catch (error) { next(error); }
  },

  async updateCover(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await streamerService.updateCover(req.user!.userId, req.body.cover));
    } catch (error) { next(error); }
  },

  async getInspiration(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await streamerService.getInspiration());
    } catch (error) { next(error); }
  },

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await streamerService.updateSettings(req.user!.userId, req.body));
    } catch (error) { next(error); }
  },

  async getMilestones(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await streamerService.getMilestones(req.user!.userId));
    } catch (error) { next(error); }
  },

  async getCreatorStats(req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, await streamerService.getCreatorStats(req.user!.userId));
    } catch (error) { next(error); }
  },

  async getVideoFeed(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { userId } = req.query as { userId?: string };
      const result = await streamerService.getVideoFeed(page, limit, userId);
      sendPaginated(res, result.data, result.total, page, limit);
    } catch (error) { next(error); }
  },

  async getStreamHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await streamerService.getStreamHistory(req.user!.userId, page, limit);
      sendPaginated(res, result.data, result.total, page, limit);
    } catch (error) { next(error); }
  },
};
