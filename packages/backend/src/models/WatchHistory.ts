import { Schema, model, Document } from 'mongoose';

/**
 * Watch history (BACKEND-GUIDE.md §4.12 — #63).
 *
 * One row per (user, type, target) — re-watching bumps `watchedAt` instead of
 * inserting, so the list is distinct titles, not view events.
 */
export interface IWatchHistoryDocument extends Document {
  userId: Schema.Types.ObjectId;
  type: 'live' | 'video';
  /** The LiveStream or Moment id. */
  targetId: Schema.Types.ObjectId;
  title: string;
  cover: string;
  hostId?: Schema.Types.ObjectId;
  watchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const watchHistorySchema = new Schema<IWatchHistoryDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['live', 'video'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, default: '' },
    cover: { type: String, default: '' },
    hostId: { type: Schema.Types.ObjectId, ref: 'User' },
    watchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

watchHistorySchema.index({ userId: 1, type: 1, watchedAt: -1 });
watchHistorySchema.index({ userId: 1, type: 1, targetId: 1 }, { unique: true });

export const WatchHistory = model<IWatchHistoryDocument>('WatchHistory', watchHistorySchema);
