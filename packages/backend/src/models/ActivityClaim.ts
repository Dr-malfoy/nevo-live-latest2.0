import { Schema, model, Document, Types } from 'mongoose';

export interface IActivityClaimDocument extends Document {
  userId: Types.ObjectId;
  activityKey: string;
  taskKey: string;
  dateKey: string;
  rewardAmount: number;
  currency: 'coins' | 'diamonds';
  claimedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const activityClaimSchema = new Schema<IActivityClaimDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    activityKey: { type: String, required: true, index: true },
    taskKey: { type: String, required: true },
    dateKey: { type: String, required: true },
    rewardAmount: { type: Number, required: true },
    currency: { type: String, enum: ['coins', 'diamonds'], default: 'coins' },
    claimedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

activityClaimSchema.index({ userId: 1, activityKey: 1, taskKey: 1, dateKey: 1 }, { unique: true });
activityClaimSchema.index({ userId: 1, claimedAt: -1 });

export const ActivityClaim = model<IActivityClaimDocument>('ActivityClaim', activityClaimSchema);
