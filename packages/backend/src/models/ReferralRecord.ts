import { Schema, model, Document } from 'mongoose';

/**
 * ReferralRecord tracks an individual invite relationship, validation progress,
 * and coin distribution according to Navo Live referral policy:
 * - 1 Invite = 13,000 Coins (100 TK value)
 * - 5 Invites = 65,000 Coins
 * - 10 Invites = VIP + 65,000 Coins
 * - 25 Invites = 10% Lifetime Commission from invited users' income
 *
 * Invitee Reward:
 * - New User Join = 13,000 Coins (100 TK) after registration + 10 min watch time
 *
 * Refer Valid Logic:
 * - Valid only if: OTP verified + WatchTime > 30 min + Login Day 2
 * - If DeviceID duplicate -> Invalid
 * - Coin Release: 50% instant (6,500 coins), 50% after Day 2 login (6,500 coins)
 */
export interface IReferralRecordDocument extends Document {
  inviterId: Schema.Types.ObjectId;
  inviteeId: Schema.Types.ObjectId;
  inviteCode: string;
  inviteeDeviceId?: string;
  isDuplicateDevice: boolean;
  otpVerified: boolean;
  watchTimeMinutes: number;
  signupDateKey: string;
  loginDates: string[];
  hasDay2Login: boolean;

  status: 'pending' | 'valid' | 'invalid';
  invalidReason?: 'duplicate_device' | 'self_referral' | 'unverified_expired' | string;

  step1Coins: number;
  step1Paid: boolean;
  step1PaidAt?: Date;

  step2Coins: number;
  step2Paid: boolean;
  step2PaidAt?: Date;

  inviteeRewardPaid: boolean;
  inviteeRewardPaidAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const referralRecordSchema = new Schema<IReferralRecordDocument>(
  {
    inviterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    inviteeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    inviteCode: { type: String, required: true },
    inviteeDeviceId: { type: String, index: true },
    isDuplicateDevice: { type: Boolean, default: false },
    otpVerified: { type: Boolean, default: false },
    watchTimeMinutes: { type: Number, default: 0 },
    signupDateKey: { type: String, required: true },
    loginDates: { type: [String], default: [] },
    hasDay2Login: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['pending', 'valid', 'invalid'],
      default: 'pending',
      index: true,
    },
    invalidReason: { type: String },

    step1Coins: { type: Number, default: 6500 },
    step1Paid: { type: Boolean, default: false },
    step1PaidAt: { type: Date },

    step2Coins: { type: Number, default: 6500 },
    step2Paid: { type: Boolean, default: false },
    step2PaidAt: { type: Date },

    inviteeRewardPaid: { type: Boolean, default: false },
    inviteeRewardPaidAt: { type: Date },
  },
  { timestamps: true }
);

referralRecordSchema.index({ inviterId: 1, status: 1 });
referralRecordSchema.index({ inviteeDeviceId: 1 });

export const ReferralRecord = model<IReferralRecordDocument>('ReferralRecord', referralRecordSchema);
