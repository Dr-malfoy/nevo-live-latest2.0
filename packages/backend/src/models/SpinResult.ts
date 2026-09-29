import { Schema, model, Document } from 'mongoose';

/**
 * Lucky spin result (BACKEND-GUIDE.md §4.13 — #66).
 *
 * The server picks and credits the slice, then tells the client which index to
 * animate to. The unique `{ userId, dateKey }` index enforces one free spin per
 * UTC day — not a client-side check.
 */
export interface ISpinResultDocument extends Document {
  userId: Schema.Types.ObjectId;
  /** 'YYYY-MM-DD' UTC — one free spin per day. */
  dateKey: string;
  sliceIndex: number;
  amount: number;
  currency: 'coins' | 'diamonds' | 'tickets';
  usedFreeSpin: boolean;
  createdAt: Date;
}

const spinResultSchema = new Schema<ISpinResultDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dateKey: { type: String, required: true },
    sliceIndex: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['coins', 'diamonds', 'tickets'], default: 'coins' },
    usedFreeSpin: { type: Boolean, default: true },
  },
  { timestamps: true }
);

spinResultSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export const SpinResult = model<ISpinResultDocument>('SpinResult', spinResultSchema);
