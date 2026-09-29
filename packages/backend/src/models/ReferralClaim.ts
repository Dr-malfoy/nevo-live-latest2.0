import { Schema, model, Document } from 'mongoose';

/**
 * A claimed referral payout (BACKEND-GUIDE.md §4.4 — #25, #26).
 *
 * The unique `{ userId, dateKey }` index is what makes "claim today's reward"
 * idempotent — a double tap can never pay twice.
 */
export interface IReferralClaimDocument extends Document {
  userId: Schema.Types.ObjectId;
  /** 'YYYY-MM-DD' (Bangladesh) for the daily claim; 'all-time' for milestones. */
  dateKey: string;
  amount: number;
  currency: 'coins' | 'diamonds';
  inviteeCount: number;
  createdAt: Date;
}

const referralClaimSchema = new Schema<IReferralClaimDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dateKey: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['coins', 'diamonds'], default: 'coins' },
    inviteeCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

referralClaimSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export const ReferralClaim = model<IReferralClaimDocument>('ReferralClaim', referralClaimSchema);
