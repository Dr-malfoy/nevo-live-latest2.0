import { Schema, model, Document, Types } from 'mongoose';

export type OfficialHostType = 'alpha' | 'aurora';
export type OfficialHostApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface IOfficialHostApplicationDocument extends Document {
  userId: Types.ObjectId;
  hostType: OfficialHostType;
  gender: string;
  status: OfficialHostApplicationStatus;
  realName: string;
  phone: string;
  whatsapp?: string;
  bio?: string;
  socialLink?: string;
  statsAtApplication: {
    liveSeconds7d: number;
    liveHours7d: number;
    validDays7d: number;
    giftCoins7d: number;
    meetsLiveTime: boolean;
    meetsDailyRules: boolean;
    meetsGiftCoins: boolean;
  };
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const officialHostApplicationSchema = new Schema<IOfficialHostApplicationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hostType: {
      type: String,
      enum: ['alpha', 'aurora'],
      required: true,
      index: true,
    },
    gender: { type: String, default: 'unspecified' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    realName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' },
    socialLink: { type: String, trim: true, default: '' },
    statsAtApplication: {
      liveSeconds7d: { type: Number, default: 0 },
      liveHours7d: { type: Number, default: 0 },
      validDays7d: { type: Number, default: 0 },
      giftCoins7d: { type: Number, default: 0 },
      meetsLiveTime: { type: Boolean, default: false },
      meetsDailyRules: { type: Boolean, default: false },
      meetsGiftCoins: { type: Boolean, default: false },
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

officialHostApplicationSchema.index({ userId: 1, status: 1 });
officialHostApplicationSchema.index({ createdAt: -1 });

export const OfficialHostApplication = model<IOfficialHostApplicationDocument>(
  'OfficialHostApplication',
  officialHostApplicationSchema
);
