import { Schema, model, Document } from 'mongoose';

/**
 * Activity-center event (BACKEND-GUIDE.md §4.13 — #68).
 */
export interface IActivityPrize {
  rankFrom: number;
  rankTo: number;
  amount: number;
  title?: string;
}

export interface IActivityTask {
  key: string;
  label: string;
  note?: string;
  metric: 'live_watch_minutes' | 'live_stream_minutes' | 'likes' | 'gift_sent' | 'chat_sent' | 'party_join' | 'share_stream' | string;
  target: number;
  unit?: string;
  reward: {
    currency: 'coins' | 'diamonds';
    amount: number;
  };
  goTo?: string;
  actionLabel?: string;
  order: number;
}

export interface IActivityDocument extends Document {
  key: string;
  title: string;
  tagline?: string;
  description?: string;
  banner: string;
  badge?: string;
  prizePool: number;
  currency: 'coins' | 'diamonds';
  startAt: Date;
  endAt: Date;
  rulesUrl: string;
  rules?: string[];
  status: 'ongoing' | 'closed';
  prizes: IActivityPrize[];
  tasks: IActivityTask[];
  featured?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const activityTaskSchema = new Schema<IActivityTask>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    note: { type: String, default: '' },
    metric: { type: String, required: true },
    target: { type: Number, required: true },
    unit: { type: String, default: '' },
    reward: {
      currency: { type: String, enum: ['coins', 'diamonds'], default: 'coins' },
      amount: { type: Number, required: true },
    },
    goTo: { type: String, default: '/' },
    actionLabel: { type: String, default: 'Go' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const activitySchema = new Schema<IActivityDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    banner: { type: String, default: '' },
    badge: { type: String, default: 'HOT' },
    prizePool: { type: Number, default: 0 },
    currency: { type: String, enum: ['coins', 'diamonds'], default: 'coins' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    rulesUrl: { type: String, default: '' },
    rules: [{ type: String }],
    status: { type: String, enum: ['ongoing', 'closed'], default: 'ongoing', index: true },
    featured: { type: Boolean, default: false },
    prizes: [
      {
        rankFrom: { type: Number, required: true },
        rankTo: { type: Number, required: true },
        amount: { type: Number, required: true },
        title: { type: String, default: '' },
        _id: false,
      },
    ],
    tasks: [activityTaskSchema],
  },
  { timestamps: true }
);

activitySchema.index({ status: 1, startAt: -1 });

export const Activity = model<IActivityDocument>('Activity', activitySchema);
