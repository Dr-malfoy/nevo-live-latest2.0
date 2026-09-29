import { Request, Response, NextFunction } from 'express';
import { callService } from '../services/call.service';
import { sendSuccess } from '../utils/response';

export const callController = {
  async createCall(req: Request, res: Response, next: NextFunction) {
    try {
      // Group form: recipientIds: string[]; legacy 1:1 form: userId: string.
      const raw: unknown = req.body?.recipientIds ?? (req.body?.userId ? [req.body.userId] : []);
      const recipientIds = Array.isArray(raw) ? (raw as string[]).map(String) : [];
      const type = req.body?.type === 'video' ? 'video' : 'audio';
      const result = await callService.createCall(req.user!.userId, recipientIds, type);
      sendSuccess(res, result, 'Call started', 201);
    } catch (error) {
      next(error);
    }
  },

  async acceptCall(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.acceptCall(req.params.id, req.user!.userId);
      sendSuccess(res, result, 'Call accepted');
    } catch (error) {
      next(error);
    }
  },

  async joinCall(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.joinCall(req.params.id, req.user!.userId);
      sendSuccess(res, result, 'Joined call');
    } catch (error) {
      next(error);
    }
  },

  async getActiveCalls(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.getActiveCalls(req.user!.userId);
      sendSuccess(res, result, 'Active calls');
    } catch (error) {
      next(error);
    }
  },

  async getCall(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.getCallById(req.params.id, req.user!.userId);
      sendSuccess(res, result, 'Call session');
    } catch (error) {
      next(error);
    }
  },

  async endCall(req: Request, res: Response, next: NextFunction) {
    try {
      const outcome = req.body?.outcome === 'rejected' ? 'rejected' : req.body?.outcome === 'missed' ? 'missed' : 'ended';
      const result = await callService.endCall(req.params.id, req.user!.userId, outcome);
      sendSuccess(res, result, 'Call ended');
    } catch (error) {
      next(error);
    }
  },

  async getCallQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await callService.getCallQuote(req.user!.userId, req.params.hostId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },
};
