import { Schema, model, Document } from 'mongoose';

export interface IComment {
  userId: Schema.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IMomentDocument extends Document {
  userId: Schema.Types.ObjectId;
  content?: string;
  media: string[];
  /** #57 — a short-video feed entry can be an image or a video post. */
  mediaType: 'image' | 'video';
  videoUrl?: string;
  thumbnail?: string;
  durationSec?: number;
  hashtags: string[];
  likes: Schema.Types.ObjectId[];
  comments: IComment[];
  shares: Schema.Types.ObjectId[];
  viewCount: number;
  giftCount: number;
  shareCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const momentSchema = new Schema<IMomentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, trim: true },
    media: [{ type: String }],
    mediaType: { type: String, enum: ['image', 'video'], default: 'image', index: true },
    videoUrl: { type: String },
    thumbnail: { type: String },
    durationSec: { type: Number },
    hashtags: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    shares: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    viewCount: { type: Number, default: 0 },
    giftCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

momentSchema.index({ createdAt: -1 });
momentSchema.index({ userId: 1, createdAt: -1 });
momentSchema.index({ mediaType: 1, createdAt: -1 });

export const Moment = model<IMomentDocument>('Moment', momentSchema);
