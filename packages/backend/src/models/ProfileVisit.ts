import { Schema, model, Document } from 'mongoose';

/**
 * Requirement #2 — "Visitors = Amar Profile Ke Ke Dekhche Last 7 Days".
 *
 * One row per (visitor, profile) pair; re-visiting bumps `visitTime` rather
 * than inserting a duplicate, so the list reads as "who last looked at me"
 * instead of a raw event log.
 *
 * Rows expire automatically after 7 days via a TTL index, which keeps the
 * collection bounded without a cleanup job.
 */
export interface IProfileVisitDocument extends Document {
  visitorId: Schema.Types.ObjectId;
  profileId: Schema.Types.ObjectId;
  visitTime: Date;
  visitCount: number;
}

const VISIT_WINDOW_DAYS = 7;

const profileVisitSchema = new Schema<IProfileVisitDocument>(
  {
    visitorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    profileId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    visitTime: { type: Date, default: Date.now },
    visitCount: { type: Number, default: 1 },
  },
  { versionKey: false }
);

// One row per pair — the upsert in the service relies on this.
profileVisitSchema.index({ visitorId: 1, profileId: 1 }, { unique: true });

// "Who visited me, most recent first"
profileVisitSchema.index({ profileId: 1, visitTime: -1 });

// TTL — drop visits older than the 7-day window automatically.
profileVisitSchema.index(
  { visitTime: 1 },
  { expireAfterSeconds: VISIT_WINDOW_DAYS * 24 * 60 * 60 }
);

export const ProfileVisit = model<IProfileVisitDocument>('ProfileVisit', profileVisitSchema);
export const PROFILE_VISIT_WINDOW_DAYS = VISIT_WINDOW_DAYS;
