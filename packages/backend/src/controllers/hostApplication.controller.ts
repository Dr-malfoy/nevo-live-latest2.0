import { Request, Response, NextFunction } from 'express';
import { hostApplicationService } from '../services/hostApplication.service';
import { hostBonusService } from '../services/hostBonus.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const hostApplicationController = {
  // ── User endpoints ──────────────────────────────────────
  async getEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hostApplicationService.getEligibility(req.user!.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async submitApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hostApplicationService.submitApplication(
        req.user!.userId,
        req.body
      );
      sendSuccess(res, result, 'Application submitted successfully');
    } catch (error) {
      next(error);
    }
  },

  async getMyApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hostApplicationService.getMyApplication(req.user!.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  // ── Host 7-Day Performance Bonus endpoints ────────────────
  async getBonusCycle(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hostBonusService.getActiveCycleForUser(req.user!.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  // ── Admin endpoints ─────────────────────────────────────
  async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, hostType, search, page, limit } = req.query as any;
      const result = await hostApplicationService.getApplications({
        status,
        hostType,
        search,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  },

  async getApplicationDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hostApplicationService.getApplicationDetail(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async reviewApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { action, reason } = req.body;
      const adminId = req.user!.userId;
      const result = await hostApplicationService.reviewApplication(
        req.params.id,
        action,
        adminId,
        reason
      );
      sendSuccess(
        res,
        result,
        action === 'approve' ? 'Host application approved' : 'Host application rejected'
      );
    } catch (error) {
      next(error);
    }
  },

  async getAdminHostBonuses(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, hostType, status, search } = req.query as any;
      const result = await hostBonusService.getAdminHostBonuses({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 15,
        hostType,
        status,
        search,
      });
      sendPaginated(res, result.cycles, result.pagination.total, result.pagination.page, result.pagination.limit);
    } catch (error) {
      next(error);
    }
  },

  async adminForceSettleBonus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await hostBonusService.adminForceSettle(req.params.id);
      sendSuccess(res, result, 'Host bonus cycle settled successfully');
    } catch (error) {
      next(error);
    }
  },
};
