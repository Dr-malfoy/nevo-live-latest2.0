import { Request, Response, NextFunction } from 'express';
import { diamondSellerService } from '../services/diamondSeller.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const diamondSellerController = {
  async getEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await diamondSellerService.getEligibility(req.user!.userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  async submitApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const application = await diamondSellerService.submitApplication(req.user!.userId, req.body);
      sendSuccess(res, application, 'Diamond Seller application submitted successfully');
    } catch (err) {
      next(err);
    }
  },

  async getMyApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await diamondSellerService.getEligibility(req.user!.userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  // Admin endpoints
  async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search, page, limit } = req.query;
      const result = await diamondSellerService.getApplications({
        status: status as string,
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      sendPaginated(res, result.data, result.total, result.page, result.limit);
    } catch (err) {
      next(err);
    }
  },

  async getApplicationDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const app = await diamondSellerService.getApplicationDetail(req.params.id);
      sendSuccess(res, app);
    } catch (err) {
      next(err);
    }
  },

  async reviewApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { action, reason } = req.body;
      const result = await diamondSellerService.reviewApplication(
        req.params.id,
        action,
        req.user!.userId,
        reason
      );
      sendSuccess(res, result, `Application ${action}ed successfully`);
    } catch (err) {
      next(err);
    }
  },
};
