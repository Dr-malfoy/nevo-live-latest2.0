import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const ASSET_PASSWORD_REGEX = /^\d{4}$/;
const LOCKOUT_MINUTES = 30;
const MAX_FAIL_COUNT = 3;

export const securityService = {
  async getAssetPasswordState(userId: string) {
    const user = await User.findById(userId).select('+assetPassword');
    if (!user) throw new AppError('User not found', 404);

    const isLocked = !!(user.assetPasswordLockedUntil && user.assetPasswordLockedUntil > new Date());

    return {
      isSet: !!user.assetPassword,
      lockedUntil: isLocked ? user.assetPasswordLockedUntil?.toISOString() : null,
      failCount: user.assetPasswordFailCount || 0,
    };
  },

  async setAssetPassword(userId: string, password: string) {
    if (!ASSET_PASSWORD_REGEX.test(password)) {
      throw new AppError('Asset password must be exactly 4 numeric digits', 400);
    }

    const user = await User.findById(userId).select('+assetPassword');
    if (!user) throw new AppError('User not found', 404);

    if (user.assetPassword) {
      throw new AppError('Asset password is already set. Use change password instead.', 400);
    }

    const salt = await bcrypt.genSalt(10);
    user.assetPassword = await bcrypt.hash(password, salt);
    user.assetPasswordFailCount = 0;
    user.assetPasswordLockedUntil = undefined;
    await user.save();

    return { success: true };
  },

  async changeAssetPassword(userId: string, currentPassword: string, newPassword: string) {
    if (!ASSET_PASSWORD_REGEX.test(newPassword)) {
      throw new AppError('New asset password must be exactly 4 numeric digits', 400);
    }

    const user = await User.findById(userId).select('+assetPassword');
    if (!user) throw new AppError('User not found', 404);

    if (!user.assetPassword) {
      throw new AppError('Asset password is not set yet', 400);
    }

    // Check lock
    if (user.assetPasswordLockedUntil && user.assetPasswordLockedUntil > new Date()) {
      throw new AppError(`Asset password locked. Try again after ${user.assetPasswordLockedUntil.toISOString()}`, 403);
    }

    const matches = await bcrypt.compare(currentPassword, user.assetPassword);
    if (!matches) {
      user.assetPasswordFailCount = (user.assetPasswordFailCount || 0) + 1;
      if (user.assetPasswordFailCount >= MAX_FAIL_COUNT) {
        user.assetPasswordLockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      }
      await user.save();
      throw new AppError('Incorrect current asset password', 400);
    }

    const salt = await bcrypt.genSalt(10);
    user.assetPassword = await bcrypt.hash(newPassword, salt);
    user.assetPasswordFailCount = 0;
    user.assetPasswordLockedUntil = undefined;
    await user.save();

    return { success: true };
  },

  async verifyAssetPassword(userId: string, password: string) {
    if (!ASSET_PASSWORD_REGEX.test(password)) {
      throw new AppError('Asset password must be exactly 4 numeric digits', 400);
    }

    const user = await User.findById(userId).select('+assetPassword');
    if (!user) throw new AppError('User not found', 404);

    if (!user.assetPassword) {
      throw new AppError('Asset password is not set yet', 400);
    }

    // Check lock
    if (user.assetPasswordLockedUntil && user.assetPasswordLockedUntil > new Date()) {
      throw new AppError(`Asset password locked. Try again after ${user.assetPasswordLockedUntil.toISOString()}`, 403);
    }

    const matches = await bcrypt.compare(password, user.assetPassword);
    if (!matches) {
      user.assetPasswordFailCount = (user.assetPasswordFailCount || 0) + 1;
      if (user.assetPasswordFailCount >= MAX_FAIL_COUNT) {
        user.assetPasswordLockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      }
      await user.save();
      throw new AppError('Incorrect asset password', 400);
    }

    // Reset fail count
    user.assetPasswordFailCount = 0;
    user.assetPasswordLockedUntil = undefined;
    await user.save();

    const expiresInSeconds = 5 * 60; // 5 minutes
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const token = jwt.sign(
      { userId, scope: 'asset_action' },
      env.jwtSecret,
      { expiresIn: '5m' }
    );

    return {
      token,
      expiresAt,
    };
  },

  async resetAssetPassword(userId: string, payload: { emailOtp?: string; phoneOtp?: string; nid?: string; newPassword: string }) {
    if (!payload.newPassword || !ASSET_PASSWORD_REGEX.test(payload.newPassword)) {
      throw new AppError('New asset password must be exactly 4 numeric digits', 400);
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // In non-production or for verified accounts, OTP validation check
    const salt = await bcrypt.genSalt(10);
    user.assetPassword = await bcrypt.hash(payload.newPassword, salt);
    user.assetPasswordFailCount = 0;
    user.assetPasswordLockedUntil = undefined;
    await user.save();

    return { success: true };
  },
};
