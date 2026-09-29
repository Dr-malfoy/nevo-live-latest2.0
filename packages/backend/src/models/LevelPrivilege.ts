import { Schema, model, Document } from 'mongoose';

/**
 * One privilege unlocked by a level (BACKEND-GUIDE.md §4.6 — #33, #43, #55, #61).
 *
 * `scope` is per-privilege data, not a constant: from Lv.60 the Level-Up Effect
 * shows in *all* rooms instead of only the current one, so a single row can
 * carry `scope: 'all_rooms'`.
 */
export interface ILevelPrivilegeDocument extends Document {
  kind: 'wealth' | 'livestream';
  level: number;
  key: string;
  title: string;
  scope: 'current_room' | 'all_rooms' | 'profile' | 'global';
  preview?: string;
  hint?: string;
  pillColor?: string;
  icon?: string;
}

const levelPrivilegeSchema = new Schema<ILevelPrivilegeDocument>({
  kind: { type: String, enum: ['wealth', 'livestream'], required: true, index: true },
  level: { type: Number, required: true, index: true },
  key: { type: String, required: true },
  title: { type: String, required: true },
  scope: {
    type: String,
    enum: ['current_room', 'all_rooms', 'profile', 'global'],
    default: 'global',
  },
  preview: { type: String },
  hint: { type: String },
  pillColor: { type: String },
  icon: { type: String },
});

levelPrivilegeSchema.index({ kind: 1, level: 1, key: 1 }, { unique: true });

export const LevelPrivilege = model<ILevelPrivilegeDocument>('LevelPrivilege', levelPrivilegeSchema);
