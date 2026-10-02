import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { User, Agency } from '../models';
import {
  requiresVerification,
  isVerified,
  isFaceVerified,
  isNidVerified,
  FACE_VERIFICATION_REQUIRED_CODE,
  NID_VERIFICATION_REQUIRED_CODE,
  VERIFICATION_REQUIRED_CODE,
} from '../services/verification.service';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.isAdmin && req.user?.role !== 'admin') {
    sendError(res, 'Admin access required', 403);
    return;
  }
  next();
};

export const requireAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.user?.role === 'agent' || req.user?.isAgent || req.user?.role === 'admin' || req.user?.isAdmin) {
    return next();
  }
  try {
    const user = await User.findById(req.user?.userId).select('role isAgent isAdmin agencyId');
    if (user && (user.role === 'agent' || user.isAgent || user.role === 'admin' || user.isAdmin)) {
      if (req.user) {
        req.user.role = user.role;
        req.user.isAgent = user.isAgent;
      }
      return next();
    }
    const ownsAgency = await Agency.exists({ agentId: req.user?.userId });
    if (ownsAgency) {
      if (req.user) {
        req.user.role = 'agent';
        req.user.isAgent = true;
      }
      return next();
    }
  } catch {}
  sendError(res, 'Agent access required', 403);
};

export const requireHost = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'host' && req.user?.role !== 'user' && req.user?.role !== 'agent' && req.user?.role !== 'admin') {
    sendError(res, 'Host access required', 403);
    return;
  }
  next();
};

/**
 * Require Live Face Verification for Live streaming, hosting Party rooms, Chat messages, and posting Moments.
 */
export const requireFaceVerified = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).lean();
    if (!user || !isFaceVerified(user)) {
      sendError(
        res,
        'Live Face Verification is required to go Live, create Party rooms, send messages, or post Moments. Please complete live face verification.',
        403
      );
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require NID Verification for Coin Trading, Buying Diamonds, and Selling Diamonds.
 */
export const requireNidVerified = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).lean();
    if (!user || !isNidVerified(user)) {
      sendError(
        res,
        'NID Verification is required to trade coins and buy/sell diamonds. Please complete NID verification.',
        403
      );
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Block unverified accounts from restricted features.
 */
export const requireVerified = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).lean();
    if (!user || !isVerified(user)) {
      sendError(res, 'Please verify your account before using this feature', 403);
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};
