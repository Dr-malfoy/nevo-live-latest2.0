import { Schema, model, Document } from 'mongoose';

/**
 * Fan club membership (BACKEND-GUIDE.md §4.10 — #41).
 *
 * Joining a host's fan club costs coins; membership grants a badge and the
 * "light up" interactive action.
 */
export interface IFanClubDocument extends Document {
  hostId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  clubName?: string;
  fanPower?: number;
  level: number;
  /** Days remaining on the membership; null = permanent. */
  expiresAt?: Date | null;
  /** Light-up counter — drives the fan-club leaderboard / fan value. */
  lighting: number;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const fanClubSchema = new Schema<IFanClubDocument>(
  {
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clubName: { type: String, default: '' },
    fanPower: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1 },
    expiresAt: { type: Date, default: null },
    lighting: { type: Number, default: 0, min: 0 },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One membership per (host, fan) pair.
fanClubSchema.index({ hostId: 1, userId: 1 }, { unique: true });

export const FanClub = model<IFanClubDocument>('FanClub', fanClubSchema);
