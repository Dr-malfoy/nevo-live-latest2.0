import { Schema, model, Document, Types } from 'mongoose';

export type DiamondSellerApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface IDiamondSellerApplicationDocument extends Document {
  userId: Types.ObjectId;
  status: DiamondSellerApplicationStatus;
  diamondsAtApplication: number;
  realName: string;
  phone: string;
  whatsapp?: string;
  notes?: string;
  paymentMethods?: {
    bkash?: string;
    nagad?: string;
    rocket?: string;
    binance?: string;
    bybit?: string;
  };
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const diamondSellerApplicationSchema = new Schema<IDiamondSellerApplicationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    diamondsAtApplication: { type: Number, required: true, default: 0 },
    realName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    paymentMethods: {
      bkash: { type: String, trim: true, default: '' },
      nagad: { type: String, trim: true, default: '' },
      rocket: { type: String, trim: true, default: '' },
      binance: { type: String, trim: true, default: '' },
      bybit: { type: String, trim: true, default: '' },
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

diamondSellerApplicationSchema.index({ userId: 1, status: 1 });
diamondSellerApplicationSchema.index({ createdAt: -1 });

export const DiamondSellerApplication = model<IDiamondSellerApplicationDocument>(
  'DiamondSellerApplication',
  diamondSellerApplicationSchema
);
