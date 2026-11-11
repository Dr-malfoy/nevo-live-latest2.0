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
  /** Coin prizes for ranks 1 to 5 (1st: 50k, 2nd: 30k, 3rd/4th/5th: 10k) — empty for title-only boards. */
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
