import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { User, WatchHistory } from '../models';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export const userController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await userService.getProfile(req.user!.userId);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  },

  async getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await userService.getPublicProfile(req.params.id, req.user?.userId);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  },

  /** Requirement #2 — Friends / Following / Followers / Visitors counts. */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const targetId = req.params.id || req.user!.userId;
      const stats = await userService.getProfileStats(targetId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  },

  /** Visitor list — carries `visitTime` so the UI can show "2h ago". */
  async getVisitors(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const targetId = req.params.id || req.user!.userId;

      // A visitor list is private — only the profile owner may read it.
      if (targetId !== req.user!.userId) {
        return sendError(res, 'You can only view your own visitors', 403);
      }

      const { data, total } = await userService.getVisitors(targetId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  /** Mutual follows. */
  async getFriends(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await userService.getFriends(req.params.id || req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      // `?country=BD,IN` — same shape as the stream feed.
      const countries = String(req.query.country || '')
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c && c.toUpperCase() !== 'ALL');
      const { data, total } = await userService.searchUsers(q, req.user!.userId, page, limit, countries);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await userService.updateProfile(req.user!.userId, req.body);
      sendSuccess(res, profile, 'Profile updated');
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await userService.changePassword(req.user!.userId, currentPassword, newPassword);
      sendSuccess(res, null, 'Password changed');
    } catch (error) {
      next(error);
    }
  },

  async toggleFollow(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.followUser(req.user!.userId, req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /** Explicit follow (idempotent) */
  async follow(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.follow(req.user!.userId, req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /** Explicit unfollow (idempotent) */
  async unfollow(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.unfollow(req.user!.userId, req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async followStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.followStatus(req.user!.userId, req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async getFollowers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await userService.getFollowers(req.params.id || req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async getFollowing(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { data, total } = await userService.getFollowing(req.params.id || req.user!.userId, page, limit);
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { password, idToken } = req.body || {};
      const result = await userService.deleteAccount(req.user!.userId, { password, idToken });
      sendSuccess(res, result, 'Account deleted');
    } catch (error) {
      next(error);
    }
  },

  /** PUT /api/users/me/call-price (#72) */
  async setCallPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const { coinsPerMinute } = req.body;
      if (!coinsPerMinute || typeof coinsPerMinute !== 'number' || coinsPerMinute < 10000) {
        sendError(res, 'Call price must be at least 10,000 coins per minute', 400);
        return;
      }
      const user = await User.findByIdAndUpdate(
        req.user!.userId,
        { callPricePerMinute: coinsPerMinute },
        { new: true }
      );
      sendSuccess(res, { coinsPerMinute: user?.callPricePerMinute || 10000 }, 'Call price updated');
    } catch (error) {
      next(error);
    }
  },

  // ── §4.12 Profile / Settings / History / Blacklist ────────────────────────

  /** Profile completion score (0-100) */
  async getCompletion(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId)
        .select('nickname bio avatar birthday country gender verification')
        .lean() as any;
      if (!user) throw new AppError('User not found', 404);
      const fields = ['nickname', 'bio', 'avatar', 'birthday', 'country', 'gender'];
      const filled = fields.filter((f) => user[f] && user[f] !== '').length;
      const score = Math.round((filled / fields.length) * 100);
      const verified = !!user.verification?.phone;
      sendSuccess(res, { score, verified, totalFields: fields.length, filledFields: filled });
    } catch (error) {
      next(error);
    }
  },

  /** Security status (asset password set, phone verified) */
  async getSecurityStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId)
        .select('+assetPassword verification')
        .lean() as any;
      if (!user) throw new AppError('User not found', 404);
      sendSuccess(res, {
        hasAssetPassword: !!user.assetPassword,
        phoneVerified: !!user.verification?.phone,
        emailVerified: !!user.verification?.email,
      });
    } catch (error) {
      next(error);
    }
  },

  /** GET current user settings */
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId).select('settings').lean() as any;
      sendSuccess(res, user?.settings || {});
    } catch (error) {
      next(error);
    }
  },

  /** PATCH user settings (merge update) */
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const updates: Record<string, any> = {};
      const allowed = ['notifications', 'privacy', 'playback', 'privilege'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[`settings.${key}`] = req.body[key];
      }
      const user = await User.findByIdAndUpdate(
        req.user!.userId,
        { $set: updates },
        { new: true }
      ).select('settings');
      sendSuccess(res, user?.settings || {}, 'Settings updated');
    } catch (error) {
      next(error);
    }
  },

  /** GET blacklist (blocked users) */
  async getBlacklist(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId)
        .select('blockedUsers')
        .populate('blockedUsers', 'uid nickname avatar level')
        .lean() as any;
      sendSuccess(res, user?.blockedUsers || []);
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/users/me/blacklist/:targetId — block/unblock toggle */
  async toggleBlacklist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { targetId } = req.params;
      const user = await User.findById(userId).select('blockedUsers');
      if (!user) throw new AppError('User not found', 404);
      const isBlocked = (user.blockedUsers as any[]).some((b: any) => b.toString() === targetId);
      if (isBlocked) {
        await User.updateOne({ _id: userId }, { $pull: { blockedUsers: targetId as any } });
        sendSuccess(res, { blocked: false });
      } else {
        await User.updateOne({ _id: userId }, { $addToSet: { blockedUsers: targetId as any } });
        sendSuccess(res, { blocked: true });
      }
    } catch (error) {
      next(error);
    }
  },

  /** GET /api/users/me/watch-history */
  async getWatchHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { type } = req.query as { type?: string };
      const filter: any = { userId };
      if (type) filter.type = type;
      const total = await WatchHistory.countDocuments(filter);
      const data = await WatchHistory.find(filter)
        .sort({ watchedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      sendPaginated(res, data, total, page, limit);
    } catch (error) {
      next(error);
    }
  },

  /** DELETE /api/users/me/watch-history — clear all history */
  async clearWatchHistory(req: Request, res: Response, next: NextFunction) {
    try {
      await WatchHistory.deleteMany({ userId: req.user!.userId });
      sendSuccess(res, { cleared: true });
    } catch (error) {
      next(error);
    }
  },
};
