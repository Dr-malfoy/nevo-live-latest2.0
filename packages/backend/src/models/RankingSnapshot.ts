import { Schema, model, Document } from 'mongoose';

/**
 * One precomputed leaderboard row (BACKEND-GUIDE.md §4.5).
 *
 * Only the slow-moving parts live here — identity is re-populated from `User`
 * at read time so `online` and avatars never go stale in a stored snapshot.
 */
export interface IRankingRow {
  rank: number;
  userId: Schema.Types.ObjectId;
  metric: number;
  earnings?: number;
  prize?: number;
  badge?: string | null;
  frame?: string | null;
}

export interface IRankingSnapshotDocument extends Document {
  board: string;
  period: string;
  /** Identifies the resolved window: 'YYYY-MM-DD' for days, week/month start otherwise. */
  dateKey: string;
  /** '' = global; otherwise the sorted, comma-joined country codes that were requested. */
  country: string;
  resetsAt: Date;
  rows: IRankingRow[];
  computedAt: Date;
  settledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const rowSchema = new Schema<IRankingRow>(
  {
    rank: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    metric: { type: Number, default: 0 },
    earnings: { type: Number },
    prize: { type: Number },
    badge: { type: String, default: null },
    frame: { type: String, default: null },
  },
  { _id: false }
);

const snapshotSchema = new Schema<IRankingSnapshotDocument>(
  {
    board: { type: String, required: true, index: true },
    period: { type: String, required: true },
    dateKey: { type: String, required: true },
    country: { type: String, default: '' },
    resetsAt: { type: Date, required: true },
    rows: { type: [rowSchema], default: [] },
    computedAt: { type: Date, default: Date.now },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One snapshot per board / period / window / country filter.
snapshotSchema.index({ board: 1, period: 1, dateKey: 1, country: 1 }, { unique: true });
// Drives the prize-settlement sweep over finished windows.
snapshotSchema.index({ resetsAt: 1, settledAt: 1 });

export const RankingSnapshot = model<IRankingSnapshotDocument>('RankingSnapshot', snapshotSchema);
