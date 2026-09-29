import { Schema, model, Document } from 'mongoose';

export interface IGiftDocument extends Document {
  giftId: string;
  name: string;
  icon: string;
  priceDiamonds: number;
  animation?: string;
  /** #14 — Lottie / MP4 / SVGA the client plays on send. */
  animationUrl?: string;
  /**
   * #14 — how big to render. Stored rather than derived from price so a cheap
   * seasonal gift can be promoted to a full-screen effect without an app update.
   */
  animationTier: 'corner' | 'medium' | 'fullscreen';
  soundUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const giftSchema = new Schema<IGiftDocument>(
  {
    giftId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    priceDiamonds: { type: Number, required: true, min: 1 },
    animation: { type: String },
    animationUrl: { type: String },
    animationTier: {
      type: String,
      enum: ['corner', 'medium', 'fullscreen'],
      default: 'corner',
    },
    soundUrl: { type: String },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

giftSchema.index({ isActive: 1, order: 1 });

export const Gift = model<IGiftDocument>('Gift', giftSchema);
