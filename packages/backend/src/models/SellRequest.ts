import { Schema, model, Document } from 'mongoose';

export interface ISellRequestDocument extends Document {
  userId: Schema.Types.ObjectId;
  agentId?: Schema.Types.ObjectId;
  currency: 'diamond' | 'coin';
  amount: number;
  amountBdt: number;
  userPaymentInfo: {
    binanceQr: string;
    binanceAddress: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sellRequestSchema = new Schema<ISellRequestDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    currency: { type: String, enum: ['diamond', 'coin'], required: true },
    amount: { type: Number, required: true, min: 1 },
    amountBdt: { type: Number, required: true, min: 1 },
    userPaymentInfo: {
      binanceQr: { type: String, default: '' },
      binanceAddress: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String },
  },
  { timestamps: true }
);

sellRequestSchema.index({ status: 1, createdAt: -1 });
sellRequestSchema.index({ userId: 1, status: 1 });
sellRequestSchema.index({ agentId: 1, status: 1 });

export const SellRequest = model<ISellRequestDocument>('SellRequest', sellRequestSchema);
