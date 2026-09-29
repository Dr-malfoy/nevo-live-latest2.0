import { Schema, model, Document } from 'mongoose';
import { IRewardTier } from './DailyRewardConfig';

export interface IDailyRewardClaimDocument extends Document {
  userId: Schema.Types.ObjectId;
  date: string;            // 'YYYY-MM-DD' — Bangladesh local day
  count: number;           // daily count (host's earned coins) at claim time
  liveMinutes: number;     // total live minutes that day at claim time
  tier: IRewardTier;       // snapshot of the tier that was claimed
  rewardCoins: number;     // coins credited
  status: 'claimed' | 'pending' | 'failed';
  createdAt: Date;
}

const dailyRewardClaimSchema = new Schema<IDailyRewardClaimDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  liveMinutes: { type: Number, required: true, default: 0 },
  tier: {
    count: { type: Number, required: true },
    rewardCoins: { type: Number, required: true },
    requiredHours: { type: Number, required: true },
  },
  rewardCoins: { type: Number, required: true },
  status: {
    type: String,
    enum: ['claimed', 'pending', 'failed'],
    default: 'claimed',
  },
  createdAt: { type: Date, default: Date.now },
});

// One claim per user per day — guards double-claim races
dailyRewardClaimSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyRewardClaim = model<IDailyRewardClaimDocument>('DailyRewardClaim', dailyRewardClaimSchema);
