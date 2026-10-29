import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';

export const authController = {
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, channel, purpose } = req.body;
      const result = await authService.sendOtp(phone, channel, purpose);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, channel, purpose } = req.body;
      const result = await authService.resendOtp(phone, channel, purpose);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code, idToken, purpose } = req.body;
      const deviceId = (req.body.deviceId || req.headers['x-device-id'] || '') as string;
      if (purpose === 'signup') {
        const result = await authService.verifyOtpOnly(phone, code, 'signup');
        sendSuccess(res, result, 'Phone number verified successfully');
      } else {
        const result = await authService.verifyOtpAndLogin(phone, code, idToken, purpose || 'login', deviceId);
        sendSuccess(res, result, 'Login successful');
      }
    } catch (error) {
      next(error);
    }
  },

  async passwordLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const identifier = req.body.phone || req.body.identifier || req.body.email;
      const { password } = req.body;
      const deviceId = (req.body.deviceId || req.headers['x-device-id'] || '') as string;
      const result = await authService.loginWithPassword(identifier, password, deviceId);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  },

  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken, country } = req.body;
      const deviceId = (req.body.deviceId || req.headers['x-device-id'] || '') as string;
      const result = await authService.loginWithGoogle(idToken, country, deviceId);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  },

  async facebookLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken, accessToken, country } = req.body;
      const deviceId = (req.body.deviceId || req.headers['x-device-id'] || '') as string;
      const result = await authService.loginWithFacebook(idToken, accessToken, country, deviceId);
      sendSuccess(res, result, 'Facebook login successful');
    } catch (error) {
      next(error);
    }
  },

  async devLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, nickname } = req.body;
      const result = await authService.devLogin(phone, nickname);
      sendSuccess(res, result, 'Dev login successful');
    } catch (error) {
      next(error);
    }
  },

  async searchAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req.body.query || req.query.query || '') as string;
      const result = await authService.searchAccount(query);
      sendSuccess(res, result, 'Account found');
    } catch (error) {
      next(error);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const deviceId = (req.body.deviceId || req.headers['x-device-id'] || '') as string;
      const result = await authService.register({ ...req.body, deviceId: req.body.deviceId || deviceId });
      sendSuccess(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, newPassword, code, idToken, verificationToken } = req.body;
      const result = await authService.resetPassword(phone, newPassword, code, idToken, verificationToken);
      sendSuccess(res, result, 'Password updated successfully');
    } catch (error) {
      next(error);
    }
  },
};

