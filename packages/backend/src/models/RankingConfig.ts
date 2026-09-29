import { Schema, model, Document } from 'mongoose';

/**
 * Per-board prize configuration (BACKEND-GUIDE.md §4.5).
 *
 * DB-backed so prizes, the condition line and the eligible country list can be
 * retuned without an app release. `rankingService.getConfig()` falls back to
 * the code defaults on first read and persists them.
 */
export interface IRankingConfigDocument extends Document {
  board: string;
  poolTotal: number;
  /** Coin prizes for rank 1, 2, 3 — empty for title-only boards (#37). */
  prizes: number[];
  condition: string;
  countries: string[];
  updatedAt: Date;
  createdAt: Date;
}

const rankingConfigSchema = new Schema<IRankingConfigDocument>(
  {
    board: { type: String, required: true, unique: true, index: true },
    poolTotal: { type: Number, default: 0, min: 0 },
    prizes: { type: [Number], default: [] },
    condition: { type: String, default: '' },
    countries: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const RankingConfig = model<IRankingConfigDocument>('RankingConfig', rankingConfigSchema);
