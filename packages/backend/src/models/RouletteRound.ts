import { Schema, model, Document } from 'mongoose';

export interface IRouletteRoundDocument extends Document {
  roundNumber: number;
  winningNumber: number; // index into WHEEL (0-36 European; -1 while betting)
  status: 'betting' | 'spinning' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rouletteRoundSchema = new Schema<IRouletteRoundDocument>(
  {
    roundNumber: { type: Number, required: true, unique: true },
    winningNumber: { type: Number, default: -1 },
    status: { type: String, enum: ['betting', 'spinning', 'ended'], default: 'betting' },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

rouletteRoundSchema.index({ roundNumber: -1 });

export const RouletteRound = model<IRouletteRoundDocument>('RouletteRound', rouletteRoundSchema);
