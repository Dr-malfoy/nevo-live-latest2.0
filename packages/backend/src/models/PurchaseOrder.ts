import { Schema, model, Document } from 'mongoose';

export interface IPurchaseOrderDocument extends Document {
  userId: Schema.Types.ObjectId;
  agentId: Schema.Types.ObjectId;
  paymentMethod: string;
  amountBdt: number;
  diamonds: number;
  coins: number;
  screenshot: string;
  transactionId: string;
  accountNumber: string;
  status: 'pending' | 'confirmed' | 'rejected';
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrderSchema = new Schema<IPurchaseOrderDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    paymentMethod: {
      type: String,
      required: true,
    },
    amountBdt: { type: Number, required: true, min: 1 },
    diamonds: { type: Number, default: 0, min: 0 },
    coins: { type: Number, default: 0, min: 0 },
    screenshot: { type: String, required: true },
    transactionId: { type: String, required: true, trim: true },
    accountNumber: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ status: 1, createdAt: -1 });

export const PurchaseOrder = model<IPurchaseOrderDocument>('PurchaseOrder', purchaseOrderSchema);
