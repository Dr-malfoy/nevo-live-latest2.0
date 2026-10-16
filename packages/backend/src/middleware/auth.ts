import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { User } from '../models';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

import { referralService } from '../services/referral.service';

/**
 * Presence tracking for the online/offline dot (requirement #3)
 * and Day 2 login check for referral verification.
 */
const PRESENCE_THROTTLE_MS = 60_000;
const PRESENCE_MAP_MAX = 10_000;
const lastTouched = new Map<string, number>();

function touchPresence(userId: string, deviceId?: string): void {
  const now = Date.now();
  const previous = lastTouched.get(userId);
  if (previous && now - previous < PRESENCE_THROTTLE_MS) return;

  if (lastTouched.size >= PRESENCE_MAP_MAX) lastTouched.clear();
  lastTouched.set(userId, now);

  // Fire-and-forget — presence must never delay or fail a request.
  User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date(now) } }).catch(() => {});
  referralService.onUserLogin(userId, deviceId).catch(() => {});
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    const deviceId = (req.headers['x-device-id'] || '') as string;
    touchPresence(decoded.userId, deviceId);
    next();
  } catch (error) {
    sendError(res, 'Invalid or expired token', 401);
  }
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = verifyToken(token);
      touchPresence(req.user.userId);
    } catch {
      // Silently ignore invalid tokens for optional auth
    }
  }

  next();
};
