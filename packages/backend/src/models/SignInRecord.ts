import { Schema, model, Document } from 'mongoose';

/**
 * Daily sign-in record (BACKEND-GUIDE.md §4.13 — #66).
 *
 * One row per user per (Bangladesh) day; the streak `day` drives the calendar.
 */
export interface ISignInRecordDocument extends Document {
  userId: Schema.Types.ObjectId;
  /** 'YYYY-MM-DD' (Bangladesh). */
  dateKey: string;
  /** Streak position, 1..7 (wraps). */
  day: number;
  reward: number;
  currency: 'coins' | 'tickets';
  createdAt: Date;
}

const signInRecordSchema = new Schema<ISignInRecordDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dateKey: { type: String, required: true },
    day: { type: Number, required: true, min: 1, max: 7 },
    reward: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['coins', 'tickets'], default: 'coins' },
  },
  { timestamps: true }
);

signInRecordSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export const SignInRecord = model<ISignInRecordDocument>('SignInRecord', signInRecordSchema);
