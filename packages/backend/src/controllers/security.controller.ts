import { Request, Response, NextFunction } from 'express';
import { securityService } from '../services/security.service';
import { sendSuccess, sendError } from '../utils/response';

export const securityController = {
  /** GET /api/security/asset-password */
  async getState(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await securityService.getAssetPasswordState(req.user!.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/security/asset-password */
  async setPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      if (!password) {
        sendError(res, 'Password is required', 400);
        return;
      }
      const result = await securityService.setAssetPassword(req.user!.userId, password);
      sendSuccess(res, result, 'Asset password set successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /** PUT /api/security/asset-password */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        sendError(res, 'Current and new password are required', 400);
        return;
      }
      const result = await securityService.changeAssetPassword(
        req.user!.userId,
        currentPassword,
        newPassword
      );
      sendSuccess(res, result, 'Asset password updated successfully');
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/security/asset-password/verify */
  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      if (!password) {
        sendError(res, 'Password is required', 400);
        return;
      }
      const result = await securityService.verifyAssetPassword(req.user!.userId, password);
      sendSuccess(res, result, 'Asset password verified');
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/security/asset-password/reset */
  async reset(req: Request, res: Response, next: NextFunction) {
    try {
      const { emailOtp, phoneOtp, nid, newPassword } = req.body;
      const result = await securityService.resetAssetPassword(req.user!.userId, {
        emailOtp,
        phoneOtp,
        nid,
        newPassword,
      });
      sendSuccess(res, result, 'Asset password reset successfully');
    } catch (error) {
      next(error);
    }
  },
};
