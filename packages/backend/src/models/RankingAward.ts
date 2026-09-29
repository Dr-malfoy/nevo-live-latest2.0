import { Schema, model, Document } from 'mongoose';

/**
 * A settled ranking prize (BACKEND-GUIDE.md §4.5).
 *
 * Two shapes share this row:
 * - coin prizes  → `currency: 'coin'`, `prize` credited to the balance;
 * - titles       → `currency: 'title'`, e.g. #37's "Star Host" badge with
 *   `expiresAt = now + 7d`, which is not a balance change.
 *
 * The unique index makes settlement idempotent — a replayed sweep can never
 * pay the same user twice for the same board and window.
 */
export interface IRankingAwardDocument extends Document {
  board: string;
  period: string;
  dateKey: string;
  userId: Schema.Types.ObjectId;
  rank: number;
  prize: number;
  currency: 'coin' | 'title';
  badge?: string | null;
  expiresAt?: Date | null;
  status: 'granted';
  createdAt: Date;
  updatedAt: Date;
}

const rankingAwardSchema = new Schema<IRankingAwardDocument>(
  {
    board: { type: String, required: true, index: true },
    period: { type: String, required: true },
    dateKey: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rank: { type: Number, required: true },
    prize: { type: Number, default: 0 },
    currency: { type: String, enum: ['coin', 'title'], default: 'coin' },
    badge: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: ['granted'], default: 'granted' },
  },
  { timestamps: true }
);

rankingAwardSchema.index({ board: 1, dateKey: 1, userId: 1 }, { unique: true });

export const RankingAward = model<IRankingAwardDocument>('RankingAward', rankingAwardSchema);
