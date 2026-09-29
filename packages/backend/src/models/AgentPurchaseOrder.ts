import { Schema, model, Document } from 'mongoose';

export interface IAgentPurchaseOrderDocument extends Document {
  agentId: Schema.Types.ObjectId;
  currency: 'diamond' | 'coin';
  amount: number;
  amountBdt: number;
  paymentMethod: string;
  screenshot: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const agentPurchaseOrderSchema = new Schema<IAgentPurchaseOrderDocument>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currency: { type: String, enum: ['diamond', 'coin'], required: true },
    amount: { type: Number, required: true, min: 1 },
    amountBdt: { type: Number, required: true, min: 1 },
    paymentMethod: { type: String, required: true },
    screenshot: { type: String, required: true },
    transactionId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String },
  },
  { timestamps: true }
);

agentPurchaseOrderSchema.index({ status: 1, createdAt: -1 });

export const AgentPurchaseOrder = model<IAgentPurchaseOrderDocument>('AgentPurchaseOrder', agentPurchaseOrderSchema);
