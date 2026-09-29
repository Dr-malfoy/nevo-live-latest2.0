import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (maxRequests: number = 600, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Bypass in local development or test mode to avoid blocking client apps
    if (process.env.NODE_ENV !== 'production') {
      next();
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      sendError(res, 'Too many requests, please try again later', 429);
      return;
    }

    record.count++;
    next();
  };
};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 300000);
