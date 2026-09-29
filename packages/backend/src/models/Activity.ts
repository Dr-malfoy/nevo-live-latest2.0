import { Schema, model, Document } from 'mongoose';

/**
 * Activity-center event (BACKEND-GUIDE.md §4.13 — #68).
 */
export interface IActivityPrize {
  rankFrom: number;
  rankTo: number;
  amount: number;
}

export interface IActivityDocument extends Document {
  key: string;
  title: string;
  banner: string;
  prizePool: number;
  currency: 'coins' | 'diamonds';
  startAt: Date;
  endAt: Date;
  rulesUrl: string;
  status: 'ongoing' | 'closed';
  prizes: IActivityPrize[];
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivityDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    banner: { type: String, default: '' },
    prizePool: { type: Number, default: 0 },
    currency: { type: String, enum: ['coins', 'diamonds'], default: 'coins' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    rulesUrl: { type: String, default: '' },
    status: { type: String, enum: ['ongoing', 'closed'], default: 'ongoing', index: true },
    prizes: [
      {
        rankFrom: { type: Number, required: true },
        rankTo: { type: Number, required: true },
        amount: { type: Number, required: true },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

activitySchema.index({ status: 1, startAt: -1 });

export const Activity = model<IActivityDocument>('Activity', activitySchema);
