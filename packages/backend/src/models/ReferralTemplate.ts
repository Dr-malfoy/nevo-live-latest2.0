import { Schema, model, Document } from 'mongoose';

/**
 * Referral link template (BACKEND-GUIDE.md §4.4 — #27).
 *
 * The share cards ("Invite friends", "My Material"). `shareUrl` is a template
 * containing `{uid}` which the server fills per caller.
 */
export interface IReferralTemplateDocument extends Document {
  key: string;
  title: string;
  thumbnail: string;
  badge?: string | null;
  shareCount: number;
  downloadCount: number;
  shareUrl: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const referralTemplateSchema = new Schema<IReferralTemplateDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    badge: { type: String, default: null },
    shareCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    shareUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ReferralTemplate = model<IReferralTemplateDocument>('ReferralTemplate', referralTemplateSchema);
