import { Schema, model, Document } from 'mongoose';

export interface IAgencyWelcomeBanner {
  enabled?: boolean;
  title?: string;
  message?: string;
  imageUrl?: string;
  theme?: string;
  badgeText?: string;
  floatAnimation?: boolean;
}

export interface IAgencyDocument extends Document {
  agentId: Schema.Types.ObjectId;
  name: string;
  code: string;
  avatar: string;
  cover?: string;
  description: string;
  type: 'public' | 'private';
  level: number;
  commission: number;
  tier: 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  hosts: Schema.Types.ObjectId[];
  totalContribution: number;
  totalLiveHours: number;
  monthlyLiveGiftCoins?: number;
  monthlyCommissionCycle?: string;
  welcomeBanner?: IAgencyWelcomeBanner;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const agencySchema = new Schema<IAgencyDocument>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    avatar: { type: String, default: '' },
    cover: { type: String, default: '' },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    type: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true,
    },
    level: { type: Number, default: 1, min: 1, index: true },
    commission: { type: Number, required: true, min: 0, max: 100, default: 4 },
    tier: {
      type: String,
      enum: ['starter', 'bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'starter',
      index: true,
    },
    hosts: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    totalContribution: { type: Number, default: 0, min: 0, index: true },
    totalLiveHours: { type: Number, default: 0, min: 0 },
    monthlyLiveGiftCoins: { type: Number, default: 0, min: 0 },
    monthlyCommissionCycle: { type: String, default: '' },
    welcomeBanner: {
      enabled: { type: Boolean, default: true },
      title: { type: String, default: '' },
      message: { type: String, default: '' },
      imageUrl: { type: String, default: '' },
      theme: { type: String, default: 'purple' },
      badgeText: { type: String, default: 'OFFICIAL HOST' },
      floatAnimation: { type: Boolean, default: true },
    },
    isBanned: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

agencySchema.index({ name: 'text', description: 'text' });
agencySchema.index({ type: 1, level: -1 });
agencySchema.index({ totalContribution: -1 });

export const Agency = model<IAgencyDocument>('Agency', agencySchema);
