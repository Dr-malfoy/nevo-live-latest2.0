import { Request, Response, NextFunction } from 'express';
import { referralService } from '../services/referral.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const referralController = {
  /** GET /api/referral/summary */
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await referralService.getSummary(req.user!.userId);
      sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/referral/claim */
  async claim(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await referralService.claimDailyReward(req.user!.userId);
      sendSuccess(res, result, 'Referral reward claimed');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/referral/rank */
  async getRank(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const rank = await referralService.getRank(page, 20);
      sendSuccess(res, rank);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/referral/templates */
  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const templates = await referralService.getTemplates(req.user!.userId);
      sendSuccess(res, templates);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/referral/templates/:id/share */
  async shareTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await referralService.shareTemplate(req.user!.userId, req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/referral/materials */
  async getMaterials(req: Request, res: Response, next: NextFunction) {
    try {
      const materials = await referralService.getMaterials(req.user!.userId);
      sendSuccess(res, materials);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/referral/tasks */
  async getTasks(_req: Request, res: Response, next: NextFunction) {
    try {
      const tasks = await referralService.getReferralTasks();
      sendSuccess(res, tasks);
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/referral/ticker */
  async getTicker(_req: Request, res: Response, next: NextFunction) {
    try {
      const ticker = await referralService.getTicker();
      sendSuccess(res, ticker);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/agency/invite */
  async inviteAgencyHost(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, hostCode } = req.body;
      const result = await referralService.inviteHostToAgency(req.user!.userId, userId, hostCode);
      sendSuccess(res, result, 'Host invited to agency');
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/agency/invitations */
  async getAgencyInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const invitations = await referralService.getAgencyInvitations(req.user!.userId);
      sendSuccess(res, invitations);
    } catch (error) {
      next(error);
    }
  },
};
