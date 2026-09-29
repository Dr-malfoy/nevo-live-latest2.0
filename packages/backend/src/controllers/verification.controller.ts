import { Request, Response, NextFunction } from 'express';
import { verificationService } from '../services/verification.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export const verificationController = {
  // User: Live Face Verification (instant auto verification)
  async verifyFace(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await verificationService.verifyFace(req.user!.userId, req.body);
      sendSuccess(res, result, 'Live face verified successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  // User: NID / Identity Verification (for trade & buy/sell diamonds)
  async submitNid(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await verificationService.submitNid(req.user!.userId, req.body);
      sendSuccess(res, result, 'NID verification completed successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  // User: submit / resubmit a verification application
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await verificationService.submit(req.user!.userId, req.body);
      sendSuccess(res, request, 'Verification submitted', 201);
    } catch (error) {
      next(error);
    }
  },

  // User: my own application + status
  async getMyRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await verificationService.getMyRequest(req.user!.userId);
      sendSuccess(res, request || null);
    } catch (error) {
      next(error);
    }
  },

  // Admin: list applications (status filter + pagination)
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const { data, total } = await verificationService.getAll({ status, page, limit });
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  // Admin: approve
  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await verificationService.approve(req.params.id, req.user!.userId);
      sendSuccess(res, request, 'Verification approved');
    } catch (error) {
      next(error);
    }
  },

  // Admin: reject with a reason
  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const request = await verificationService.reject(req.params.id, req.user!.userId, reason);
      sendSuccess(res, request, 'Verification rejected');
    } catch (error) {
      next(error);
    }
  },
};
