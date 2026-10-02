import { Schema, model, Document } from 'mongoose';

export interface INoteDocument extends Document {
  userId: Schema.Types.ObjectId;
  text: string;
  emoji?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<INoteDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 60 },
    emoji: { type: String, default: '💭' },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiration
      index: { expires: 0 }, // MongoDB TTL auto-cleanup
    },
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, expiresAt: 1 });

export const Note = model<INoteDocument>('Note', noteSchema);
