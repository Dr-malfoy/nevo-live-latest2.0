import { Schema, model, Document } from 'mongoose';

/**
 * Achievement poster config (BACKEND-GUIDE.md §4.6 — #53).
 *
 * Grouped by category; each poster has a level, title and image. The `shareUrl`
 * is server-rendered because the poster carries a QR code and must work outside
 * the app.
 */
export type AchievementCategory = 'milestones' | 'merits' | 'identity';

export interface IAchievementPoster {
  level: number;
  title: string;
  image: string;
}

export interface IAchievementConfigDocument extends Document {
  key: string;
  category: AchievementCategory;
  title: string;
  posters: IAchievementPoster[];
  order: number;
}

const achievementConfigSchema = new Schema<IAchievementConfigDocument>({
  key: { type: String, required: true, unique: true, index: true },
  category: {
    type: String,
    enum: ['milestones', 'merits', 'identity'],
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  posters: [
    {
      level: { type: Number, required: true },
      title: { type: String, required: true },
      image: { type: String, default: '' },
      _id: false,
    },
  ],
  order: { type: Number, default: 0 },
});

achievementConfigSchema.index({ category: 1, order: 1 });

export const AchievementConfig = model<IAchievementConfigDocument>('AchievementConfig', achievementConfigSchema);
