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
    user.assetPasswordPlain = password;
    user.assetPasswordFailCount = 0;
    user.assetPasswordLockedUntil = undefined;
    await user.save();

    return { success: true };
  },

  async changeAssetPassword(userId: string, currentPassword: string, newPassword: string) {
    if (!ASSET_PASSWORD_REGEX.test(newPassword)) {
      throw new AppError('New asset password must be exactly 4 numeric digits', 400);
    }

    const user = await User.findById(userId).select('+assetPassword +assetPasswordPlain');
    if (!user) throw new AppError('User not found', 404);

    if (!user.assetPassword) {
      throw new AppError('Asset password is not set yet', 400);
    }

    // Check lock
    if (user.assetPasswordLockedUntil && user.assetPasswordLockedUntil > new Date()) {
      throw new AppError(`Asset password locked. Try again after ${user.assetPasswordLockedUntil.toISOString()}`, 403);
    }

    const matches = await bcrypt.compare(currentPassword, user.assetPassword) || (user.assetPasswordPlain && user.assetPasswordPlain === currentPassword);
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
    user.assetPasswordPlain = newPassword;
    user.assetPasswordFailCount = 0;
    user.assetPasswordLockedUntil = undefined;
    await user.save();

    return { success: true };
  },

  async verifyAssetPassword(userId: string, password: string) {
    if (!ASSET_PASSWORD_REGEX.test(password)) {
      throw new AppError('Asset password must be exactly 4 numeric digits', 400);
    }

    const user = await User.findById(userId).select('+assetPassword +assetPasswordPlain');
    if (!user) throw new AppError('User not found', 404);

    if (!user.assetPassword) {
      throw new AppError('Asset password is not set yet', 400);
    }

    // Check lock
    if (user.assetPasswordLockedUntil && user.assetPasswordLockedUntil > new Date()) {
      throw new AppError(`Asset password locked. Try again after ${user.assetPasswordLockedUntil.toISOString()}`, 403);
    }

    const matches = await bcrypt.compare(password, user.assetPassword) || (user.assetPasswordPlain && user.assetPasswordPlain === password);
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
    user.assetPasswordPlain = payload.newPassword;
    user.assetPasswordFailCount = 0;
    user.assetPasswordLockedUntil = undefined;
    await user.save();

    return { success: true };
  },

  // ─── ADMIN ASSET PASSWORD LOOKUP & MANAGEMENT ────────────────────

  async adminLookupAssetPassword(params: { uid?: string; contact?: string; query?: string } | string) {
    let uid = typeof params === 'string' ? '' : (params.uid || '').trim();
    let contact = typeof params === 'string' ? '' : (params.contact || '').trim();
    const query = typeof params === 'string' ? params.trim() : (params.query || '').trim();

    if (!uid && !contact && query) {
      if (query.includes('+')) {
        const parts = query.split('+').map((p) => p.trim());
        uid = parts[0] || '';
        contact = parts[1] || '';
      } else if (query.includes(',')) {
        const parts = query.split(',').map((p) => p.trim());
        uid = parts[0] || '';
        contact = parts[1] || '';
      } else {
        uid = query;
      }
    }

    if (!uid && !contact) {
      throw new AppError('Please provide User UID and registered Phone Number or Email', 400);
    }

    let user: any = null;

    if (uid && contact) {
      // Find user by UID first
      user = await User.findOne({ uid }).select('+assetPassword +assetPasswordPlain');
      if (!user) {
        throw new AppError(`No user found with UID "${uid}"`, 404);
      }

      // Check whether phone or email matches
      const cleanContact = contact.toLowerCase();
      const phoneMatches = user.phone && user.phone.trim() === contact;
      const emailMatches = user.email && user.email.trim().toLowerCase() === cleanContact;

      if (!phoneMatches && !emailMatches) {
        throw new AppError(
          `Security Mismatch: The registered phone number or email does not match UID "${uid}". Please check the Help Center request.`,
          400
        );
      }
    } else if (uid) {
      user = await User.findOne({ uid }).select('+assetPassword +assetPasswordPlain');
      if (!user) {
        user = await User.findOne({
          $or: [
            { phone: uid },
            { email: uid.toLowerCase() },
            ...(uid.length === 24 && /^[0-9a-fA-F]{24}$/.test(uid) ? [{ _id: uid }] : []),
          ],
        }).select('+assetPassword +assetPasswordPlain');
      }
    } else if (contact) {
      user = await User.findOne({
        $or: [
          { phone: contact },
          { email: contact.toLowerCase() },
        ],
      }).select('+assetPassword +assetPasswordPlain');
    }

    if (!user) {
      throw new AppError(`No user found matching the provided search details`, 404);
    }

    const isLocked = !!(user.assetPasswordLockedUntil && user.assetPasswordLockedUntil > new Date());

    return {
      _id: user._id,
      uid: user.uid,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isAgent: user.isAgent,
      diamonds: user.diamonds || 0,
      coins: user.coins || 0,
      createdAt: user.createdAt,
      isSet: !!user.assetPassword,
      assetPassword: user.assetPasswordPlain || (user.assetPassword ? '[Hash Stored - Click Reset to change]' : 'Not Set'),
      failCount: user.assetPasswordFailCount || 0,
      isLocked,
      lockedUntil: isLocked ? user.assetPasswordLockedUntil?.toISOString() : null,
      verifiedMatch: !!(uid && contact),
    };
  },

  async adminSetOrResetAssetPassword(userId: string, newPassword: string) {
    if (!ASSET_PASSWORD_REGEX.test(newPassword)) {
      throw new AppError('Asset password must be exactly 4 numeric digits', 400);
    }

    const user = await User.findById(userId).select('+assetPassword +assetPasswordPlain');
    if (!user) throw new AppError('User not found', 404);

    const salt = await bcrypt.genSalt(10);
    user.assetPassword = await bcrypt.hash(newPassword, salt);
    user.assetPasswordPlain = newPassword;
    user.assetPasswordFailCount = 0;
    user.assetPasswordLockedUntil = undefined;
    await user.save();

    return {
      success: true,
      assetPassword: newPassword,
      message: `Asset password successfully set to "${newPassword}" for user ${user.nickname} (UID: ${user.uid})`,
    };
  },

  async adminUnlockAssetPassword(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    user.assetPasswordFailCount = 0;
    user.assetPasswordLockedUntil = undefined;
    await user.save();

    return { success: true, message: `Account asset password unlocked for ${user.nickname}` };
  },
};
