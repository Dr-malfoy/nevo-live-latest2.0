import { Schema, model, Document } from 'mongoose';

export interface IOfficialNotificationDocument extends Document {
  title: string;
  message: string;
  icon?: string;
  /** Users who have seen this notification (drives the per-user red dot). */
  seenBy: Schema.Types.ObjectId[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const officialNotificationSchema = new Schema<IOfficialNotificationDocument>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    icon: { type: String, default: '' },
    seenBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

officialNotificationSchema.index({ createdAt: -1 });
officialNotificationSchema.index({ active: 1, createdAt: -1 });

export const OfficialNotification = model<IOfficialNotificationDocument>(
  'OfficialNotification',
  officialNotificationSchema
);
