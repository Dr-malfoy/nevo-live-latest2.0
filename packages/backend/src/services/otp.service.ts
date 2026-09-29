import crypto from 'crypto';
import { OtpVerification, OtpChannel, OtpPurpose, User } from '../models';
import { otpConfig } from '../config/otp.config';
import { env } from '../config/env';
import { normalizePhoneNumber, getPhoneSearchVariants } from '../utils/phone.util';
import { OtpProviderFactory } from './otp/provider.factory';
import { AppError } from '../middleware/errorHandler';

export interface SendOtpServiceResult {
  success: boolean;
  message: string;
  phone: string;
  channel: OtpChannel;
  cooldownSeconds: number;
  expiresInSeconds: number;
  devOtp?: string; // only populated when OTP_DEV_MODE is active
}

export interface VerifyOtpServiceResult {
  success: boolean;
  message: string;
  phone: string;
  verificationToken: string;
}

export const otpService = {
  /**
   * Generates a cryptographically secure numeric OTP of configured length.
   */
  generateSecureOtp(length: number = otpConfig.length): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return crypto.randomInt(min, max + 1).toString();
  },

  /**
   * Hashes an OTP using HMAC-SHA256 with the server JWT secret key.
   */
  hashOtp(phone: string, otp: string): string {
    const secret = env.jwtSecret || 'otp-salt-key-navo-live';
    return crypto.createHmac('sha256', secret).update(`${phone}:${otp}`).digest('hex');
  },

  /**
   * Generates a secure random verification token valid for completing signup.
   */
  generateVerificationToken(): string {
    return `vtok_${Date.now()}_${crypto.randomBytes(24).toString('hex')}`;
  },

  /**
   * Initiates an OTP send for user signup or verification.
   */
  async sendOtp(params: {
    rawPhone?: string;
    phone?: string;
    channel?: OtpChannel;
    purpose?: OtpPurpose;
    checkExistingUser?: boolean;
  }): Promise<SendOtpServiceResult> {
    const rawInput = params.rawPhone || params.phone || '';
    const { channel = 'sms', purpose = 'signup', checkExistingUser = false } = params;

    // 1. Normalize and validate phone
    const phoneResult = normalizePhoneNumber(rawInput);
    if (!phoneResult.isValid) {
      throw new AppError(phoneResult.error || 'Invalid phone number format', 400);
    }
    const phone = phoneResult.e164;

    // 2. If for signup, verify phone is not already in use (One number = One account rule)
    if (purpose === 'signup' || checkExistingUser) {
      const phoneVariants = getPhoneSearchVariants(rawInput);
      const existingUser = await User.findOne({ phone: { $in: phoneVariants } });
      if (existingUser) {
        throw new AppError('This phone number is already registered to an account. One phone number can only create one account. Please log in or reset your password.', 409);
      }
    }

    if (purpose === 'reset_password') {
      const phoneVariants = getPhoneSearchVariants(rawInput);
      const existingUser = await User.findOne({ phone: { $in: phoneVariants } });
      if (!existingUser) {
        throw new AppError('No account found with this phone number. Please check the number or sign up.', 404);
      }
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + otpConfig.expirySeconds * 1000);
    const windowDate = new Date(now.getTime() + otpConfig.rateLimitWindowSeconds * 1000);

    // 3. Check existing OTP record for cooldown & rate limits
    let record = await OtpVerification.findOne({ phone, purpose });

    if (record) {
      // Cooldown check (prevent rapid resend)
      const secondsSinceLastSent = (now.getTime() - record.lastSentAt.getTime()) / 1000;
      if (secondsSinceLastSent < otpConfig.resendCooldownSeconds) {
        const remainingCooldown = Math.ceil(otpConfig.resendCooldownSeconds - secondsSinceLastSent);
        throw new AppError(
          `Please wait ${remainingCooldown}s before requesting a new verification code.`,
          429
        );
      }

      // Rate limit window check (e.g. max 5 requests per 15 minutes)
      if (record.windowExpiresAt > now) {
        if (record.requestCount >= otpConfig.maxRequestsPerWindow) {
          const remainingMinutes = Math.ceil((record.windowExpiresAt.getTime() - now.getTime()) / 60000);
          throw new AppError(
            `Too many OTP requests. Please wait ${remainingMinutes} minute(s) before trying again.`,
            429
          );
        }
        record.requestCount += 1;
      } else {
        // Reset window
        record.requestCount = 1;
        record.windowExpiresAt = windowDate;
      }
    }

    // 4. Generate secure OTP & hash
    const otp = this.generateSecureOtp();
    const otpHash = this.hashOtp(phone, otp);

    // 5. Dispatch OTP through provider adapter
    const dispatchResult = await OtpProviderFactory.dispatchOtp({
      phone,
      otp,
      channel,
      purpose,
      expiresInMinutes: Math.round(otpConfig.expirySeconds / 60),
    });

    if (!dispatchResult.success) {
      throw new AppError(
        dispatchResult.error || 'Failed to deliver verification code. Please try again.',
        502
      );
    }

    // 6. Persist/update OTP record in MongoDB
    if (record) {
      record.channel = channel;
      record.otpHash = otpHash;
      record.expiresAt = expiryDate;
      record.attempts = 0;
      record.maxAttempts = otpConfig.maxAttempts;
      record.lastSentAt = now;
      record.verifiedAt = undefined;
      record.verificationToken = undefined;
      await record.save();
    } else {
      record = await OtpVerification.create({
        phone,
        channel,
        purpose,
        otpHash,
        expiresAt: expiryDate,
        attempts: 0,
        maxAttempts: otpConfig.maxAttempts,
        lastSentAt: now,
        requestCount: 1,
        windowExpiresAt: windowDate,
      });
    }

    return {
      success: true,
      message: `Verification code sent via ${channel.toUpperCase()}`,
      phone,
      channel,
      cooldownSeconds: otpConfig.resendCooldownSeconds,
      expiresInSeconds: otpConfig.expirySeconds,
      devOtp: otpConfig.isDevMode ? otp : undefined,
    };
  },

  /**
   * Verifies an entered OTP code.
   */
  async verifyOtp(params: {
    rawPhone?: string;
    phone?: string;
    code: string;
    purpose?: OtpPurpose;
  }): Promise<VerifyOtpServiceResult> {
    const rawInput = params.rawPhone || params.phone || '';
    const { code, purpose = 'signup' } = params;

    const phoneResult = normalizePhoneNumber(rawInput);
    if (!phoneResult.isValid) {
      throw new AppError(phoneResult.error || 'Invalid phone number format', 400);
    }
    const phone = phoneResult.e164;

    const record = await OtpVerification.findOne({ phone, purpose });

    if (!record) {
      throw new AppError('No active verification request found. Please request a new code.', 404);
    }

    const now = new Date();

    // Check expiration
    if (record.expiresAt < now) {
      throw new AppError('Verification code has expired. Please request a new code.', 400);
    }

    // Check max attempts
    if (record.attempts >= record.maxAttempts) {
      throw new AppError('Too many failed attempts. Please request a new verification code.', 429);
    }

    // Validate OTP Hash
    const expectedHash = this.hashOtp(phone, code.trim());
    if (record.otpHash !== expectedHash) {
      record.attempts += 1;
      await record.save();
      const remaining = Math.max(0, record.maxAttempts - record.attempts);
      throw new AppError(
        remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : 'Too many failed attempts. Please request a new code.',
        400
      );
    }

    // Successful Verification: Issue verification token and invalidate OTP hash
    const verificationToken = this.generateVerificationToken();
    record.verifiedAt = now;
    record.verificationToken = verificationToken;
    record.otpHash = ''; // Invalidate immediately to prevent reuse
    await record.save();

    return {
      success: true,
      message: 'Phone number verified successfully',
      phone,
      verificationToken,
    };
  },

  /**
   * Consumes and validates a verification token (used during user creation).
   */
  async consumeVerificationToken(
    phone: string,
    verificationToken: string,
    purpose: OtpPurpose = 'signup'
  ): Promise<boolean> {
    const phoneResult = normalizePhoneNumber(phone);
    const normalizedPhone = phoneResult.isValid ? phoneResult.e164 : phone;

    const record = await OtpVerification.findOne({
      phone: normalizedPhone,
      purpose,
      verificationToken,
    });

    if (!record || !record.verifiedAt) {
      return false;
    }

    // Check token freshness (valid within 30 minutes of verification)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (record.verifiedAt < thirtyMinutesAgo) {
      return false;
    }

    // Invalidate token so it cannot be used again
    record.verificationToken = undefined;
    await record.save();

    return true;
  },
};
