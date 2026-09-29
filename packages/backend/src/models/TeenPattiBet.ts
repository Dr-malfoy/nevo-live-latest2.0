import { Schema, model, Document } from 'mongoose';

export interface ITeenPattiBetDocument extends Document {
  userId: Schema.Types.ObjectId;
  roundId: Schema.Types.ObjectId;
  currency: 'diamond' | 'coin';
  ante: number;
  totalBet: number;
  winAmount: number;
  status: 'playing' | 'folded' | 'won' | 'lost';
  handRank?: number;
  handName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const teenPattiBetSchema = new Schema<ITeenPattiBetDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roundId: { type: Schema.Types.ObjectId, ref: 'TeenPattiRound', required: true, index: true },
    currency: { type: String, enum: ['diamond', 'coin'], required: true },
    ante: { type: Number, required: true, min: 0 },
    totalBet: { type: Number, required: true, min: 0 },
    winAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['playing', 'folded', 'won', 'lost'], default: 'playing' },
    handRank: { type: Number },
    handName: { type: String },
  },
  { timestamps: true }
);

teenPattiBetSchema.index({ roundId: 1, createdAt: -1 });

export const TeenPattiBet = model<ITeenPattiBetDocument>('TeenPattiBet', teenPattiBetSchema);
