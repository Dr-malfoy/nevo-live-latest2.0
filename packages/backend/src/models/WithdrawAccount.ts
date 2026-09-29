import { Schema, model, Document } from 'mongoose';

/**
 * A bound withdrawal account (BACKEND-GUIDE.md §4.2 — #23).
 *
 * One row per user + method. `fields` holds exactly the keys the method's
 * `fields` array declares (walletAddress / accountId / email / phone / bank set).
 */
export interface IWithdrawAccountDocument extends Document {
  userId: Schema.Types.ObjectId;
  methodKey: string;
  fields: Record<string, string>;
  isPreferred: boolean;
  boundAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawAccountSchema = new Schema<IWithdrawAccountDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    methodKey: { type: String, required: true },
    fields: { type: Schema.Types.Mixed, default: {} },
    isPreferred: { type: Boolean, default: false },
    boundAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

withdrawAccountSchema.index({ userId: 1, methodKey: 1 }, { unique: true });

export const WithdrawAccount = model<IWithdrawAccountDocument>('WithdrawAccount', withdrawAccountSchema);
