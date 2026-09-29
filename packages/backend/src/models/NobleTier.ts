import { Schema, model, Document } from 'mongoose';

export interface INobleTierDocument extends Document {
  type: 'silver' | 'gold' | 'platinum' | 'diamond';
  priceDiamonds: number;
  durationDays: number;
  benefits: string[];
  isActive: boolean;
}

const nobleTierSchema = new Schema<INobleTierDocument>({
  type: {
    type: String,
    enum: ['silver', 'gold', 'platinum', 'diamond'],
    required: true,
    unique: true,
  },
  priceDiamonds: { type: Number, required: true },
  durationDays: { type: Number, required: true },
  benefits: [{ type: String }],
  isActive: { type: Boolean, default: true },
});

export const NobleTier = model<INobleTierDocument>('NobleTier', nobleTierSchema);
