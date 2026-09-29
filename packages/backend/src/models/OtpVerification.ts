import { Schema, model, Document } from 'mongoose';

export type OtpChannel = 'sms' | 'whatsapp';
export type OtpPurpose = 'signup' | 'login' | 'reset_password';

export interface IOtpVerificationDocument extends Document {
  phone: string;
  channel: OtpChannel;
  purpose: OtpPurpose;
  otpHash?: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  lastSentAt: Date;
  requestCount: number;
  windowExpiresAt: Date;
  verifiedAt?: Date;
  verificationToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const otpVerificationSchema = new Schema<IOtpVerificationDocument>(
  {
    phone: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: ['sms', 'whatsapp'],
      default: 'sms',
      required: true,
    },
    purpose: {
      type: String,
      enum: ['signup', 'login', 'reset_password'],
      default: 'signup',
      required: true,
    },
    otpHash: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
    requestCount: {
      type: Number,
      default: 1,
    },
    windowExpiresAt: {
      type: Date,
      required: true,
    },
    verifiedAt: {
      type: Date,
    },
    verificationToken: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active verification record per phone & purpose
otpVerificationSchema.index({ phone: 1, purpose: 1 });

// MongoDB TTL Index: automatically remove records 1 hour after expiration
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

export const OtpVerification = model<IOtpVerificationDocument>(
  'OtpVerification',
  otpVerificationSchema
);
