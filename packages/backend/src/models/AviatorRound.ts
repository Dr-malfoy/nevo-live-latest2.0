import { Schema, model, Document } from 'mongoose';

export interface IAviatorRoundDocument extends Document {
  roundNumber: number;
  crashPoint: number; // the round's crash multiplier (1.0 – 2.5)
  status: 'waiting' | 'flying' | 'crashed';
  startedAt?: Date;
  crashedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const aviatorRoundSchema = new Schema<IAviatorRoundDocument>(
  {
    roundNumber: { type: Number, required: true, unique: true },
    crashPoint: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['waiting', 'flying', 'crashed'], default: 'waiting' },
    startedAt: { type: Date },
    crashedAt: { type: Date },
  },
  { timestamps: true }
);

aviatorRoundSchema.index({ roundNumber: -1 });

export const AviatorRound = model<IAviatorRoundDocument>('AviatorRound', aviatorRoundSchema);
