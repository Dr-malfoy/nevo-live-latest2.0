import type { VerificationState } from '../types';

/**
 * Live / Social features gate (Go Live, Host Party, Send Messages, Post Moments):
 * Requires Live Face verification (or admin or overall verified).
 */
export const canUseLiveFeatures = (verification?: VerificationState, role?: string): boolean => {
  if (role === 'admin') return true;
  return verification?.faceVerified === true || verification?.verified === true;
};

/**
 * Trade / Financial features gate (Trade Coins, Buy/Sell Diamonds, Withdraw):
 * Requires NID verification (or admin).
 */
export const canUseTradeFeatures = (verification?: VerificationState, role?: string): boolean => {
  if (role === 'admin') return true;
  return verification?.nidVerified === true;
};

/**
 * Legacy Creator-feature gate alias.
 */
export const canUseCreatorFeatures = (verification?: VerificationState, role?: string): boolean => {
  return canUseLiveFeatures(verification, role);
};
