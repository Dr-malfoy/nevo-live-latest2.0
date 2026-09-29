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

/**
 * Presence tracking for the online/offline dot (requirement #3).
 *
 * Writing on every request would be one extra write per API call, so each
 * user is only written back to Mongo once per throttle window. The map is
 * capped so a traffic spike cannot grow it without bound.
 */
const PRESENCE_THROTTLE_MS = 60_000;
const PRESENCE_MAP_MAX = 10_000;
const lastTouched = new Map<string, number>();

function touchPresence(userId: string): void {
  const now = Date.now();
  const previous = lastTouched.get(userId);
  if (previous && now - previous < PRESENCE_THROTTLE_MS) return;

  if (lastTouched.size >= PRESENCE_MAP_MAX) lastTouched.clear();
  lastTouched.set(userId, now);

  // Fire-and-forget — presence must never delay or fail a request.
  User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date(now) } }).catch(() => {});
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
    touchPresence(decoded.userId);
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
