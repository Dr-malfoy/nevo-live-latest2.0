import { Schema, model, Document } from 'mongoose';

/**
 * Party-room PK battle (BACKEND-GUIDE.md §4.9 — #19).
 *
 * Score = gift value received during the battle window, settled server-side on
 * `endsAt` so a losing client can never decide the result.
 */
export interface IPkBattleDocument extends Document {
  type: 'friend' | 'random' | 'team';
  roomId?: Schema.Types.ObjectId;
  teamA: Schema.Types.ObjectId[];
  teamB: Schema.Types.ObjectId[];
  scoreA: number;
  scoreB: number;
  startedAt: Date;
  endsAt: Date;
  status: 'pending' | 'active' | 'ended';
  winnerSide?: 'A' | 'B' | 'draw' | null;
  settledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const pkBattleSchema = new Schema<IPkBattleDocument>(
  {
    type: { type: String, enum: ['friend', 'random', 'team'], required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    teamA: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    teamB: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    scoreA: { type: Number, default: 0 },
    scoreB: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'ended'],
      default: 'active',
      index: true,
    },
    winnerSide: { type: String, enum: ['A', 'B', 'draw', null], default: null },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

pkBattleSchema.index({ status: 1, endsAt: 1 });
pkBattleSchema.index({ roomId: 1, status: 1 });

export const PkBattle = model<IPkBattleDocument>('PkBattle', pkBattleSchema);
