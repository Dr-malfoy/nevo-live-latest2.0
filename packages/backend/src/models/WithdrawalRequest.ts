import { Schema, model, Document } from 'mongoose';

export interface IWithdrawalRequestDocument extends Document {
  userId: Schema.Types.ObjectId;
  agentId: Schema.Types.ObjectId;
  currency: 'diamond' | 'coin';
  amount: number;
  amountBdt: number;
  method: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  agentNote?: string;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalRequestSchema = new Schema<IWithdrawalRequestDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    currency: { type: String, enum: ['diamond', 'coin'], required: true },
    amount: { type: Number, required: true, min: 1 },
    amountBdt: { type: Number, required: true, min: 1 },
    method: { type: String, required: true },
    accountNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending',
      index: true,
    },
    agentNote: { type: String },
    adminNote: { type: String },
  },
  { timestamps: true }
);

withdrawalRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
withdrawalRequestSchema.index({ agentId: 1, status: 1, createdAt: -1 });

export const WithdrawalRequest = model<IWithdrawalRequestDocument>('WithdrawalRequest', withdrawalRequestSchema);
