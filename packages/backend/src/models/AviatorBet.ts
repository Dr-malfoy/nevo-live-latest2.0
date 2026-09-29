import { Schema, model, Document } from 'mongoose';

export interface IAviatorBetDocument extends Document {
  userId: Schema.Types.ObjectId;
  roundId: Schema.Types.ObjectId; // ref 'AviatorRound'
  currency: 'diamond' | 'coin';
  betAmount: number; // min 0.01
  target: number; // cash-out target multiplier (1.01 – 2.5)
  cashOutAt?: number; // multiplier cashed out at
  status: 'active' | 'cashed_out' | 'lost';
  winAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const aviatorBetSchema = new Schema<IAviatorBetDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roundId: { type: Schema.Types.ObjectId, ref: 'AviatorRound', required: true, index: true },
    currency: { type: String, enum: ['diamond', 'coin'], required: true },
    betAmount: { type: Number, required: true, min: 0.01 },
    target: { type: Number, default: 2.0, min: 1.01, max: 2.5 },
    cashOutAt: { type: Number },
    status: { type: String, enum: ['active', 'cashed_out', 'lost'], default: 'active' },
    winAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

aviatorBetSchema.index({ roundId: 1, createdAt: -1 });

export const AviatorBet = model<IAviatorBetDocument>('AviatorBet', aviatorBetSchema);
