import { Schema, model, Document } from 'mongoose';

export interface IStoryDocument extends Document {
  userId: Schema.Types.ObjectId;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  caption?: string;
  backgroundColor?: string;
  textColor?: string;
  views: Schema.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const storySchema = new Schema<IStoryDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'image' },
    caption: { type: String, trim: true, default: '' },
    backgroundColor: { type: String, default: '#E11D48' },
    textColor: { type: String, default: '#FFFFFF' },
    views: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiration
      index: { expires: 0 }, // MongoDB TTL auto-cleanup
    },
  },
  { timestamps: true }
);

storySchema.index({ userId: 1, expiresAt: 1 });

export const Story = model<IStoryDocument>('Story', storySchema);
