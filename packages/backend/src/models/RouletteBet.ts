import { Schema, model, Document } from 'mongoose';
import { BetType } from '../utils/roulette';

export interface IRouletteBetDocument extends Document {
  userId: Schema.Types.ObjectId;
  roundId: Schema.Types.ObjectId;
  currency: 'diamond' | 'coin';
  betType: BetType;
  numbers: number[]; // covered wheel positions (0-36)
  betAmount: number;
  winAmount: number;
  status: 'active' | 'won' | 'lost';
  createdAt: Date;
  updatedAt: Date;
}

const rouletteBetSchema = new Schema<IRouletteBetDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roundId: { type: Schema.Types.ObjectId, ref: 'RouletteRound', required: true, index: true },
    currency: { type: String, enum: ['diamond', 'coin'], required: true },
    betType: {
      type: String,
      enum: ['straight', 'split', 'street', 'corner', 'sixline', 'column', 'dozen', 'red', 'black', 'even', 'odd', 'low', 'high'],
      required: true,
    },
    numbers: { type: [Number], required: true },
    betAmount: { type: Number, required: true, min: 0.01 },
    winAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'won', 'lost'], default: 'active' },
  },
  { timestamps: true }
);

rouletteBetSchema.index({ roundId: 1, createdAt: -1 });

export const RouletteBet = model<IRouletteBetDocument>('RouletteBet', rouletteBetSchema);
