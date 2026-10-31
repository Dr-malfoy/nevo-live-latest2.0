import { Schema, model, Document } from 'mongoose';

/**
 * Lucky spin result (BACKEND-GUIDE.md §4.13 — #66).
 *
 * The server picks and credits the slice, then tells the client which index to
 * animate to. The partial unique `{ userId, dateKey }` index enforces one free spin per
 * day — not a client-side check.
 */
export interface ISpinResultDocument extends Document {
  userId: Schema.Types.ObjectId;
  /** 'YYYY-MM-DD' day — one free spin per day. */
  dateKey: string;
  sliceIndex: number;
  amount: number;
  currency: 'coins' | 'diamonds' | 'tickets';
  usedFreeSpin: boolean;
  cost: number;
  createdAt: Date;
}

const spinResultSchema = new Schema<ISpinResultDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dateKey: { type: String, required: true },
    sliceIndex: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['coins', 'diamonds', 'tickets'], default: 'diamonds' },
    usedFreeSpin: { type: Boolean, default: false },
    cost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

spinResultSchema.index(
  { userId: 1, dateKey: 1 },
  { unique: true, partialFilterExpression: { usedFreeSpin: true } }
);

export const SpinResult = model<ISpinResultDocument>('SpinResult', spinResultSchema);
