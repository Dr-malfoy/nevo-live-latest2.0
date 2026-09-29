import { Schema, model, Document } from 'mongoose';

export interface INotificationDocument extends Document {
  userId: Schema.Types.ObjectId;
  type: 'rate_updated' | 'order' | 'withdrawal' | 'agent_linked' | 'recharge' | 'system' | 'gift';
  /**
   * §4.10 — drives the official-inbox rows by key, never by string-matching a
   * translated title. `null` for ordinary user notifications.
   */
  category?: 'system' | 'arrival_notice' | 'new_followers' | 'income_reminder' | 'other' | null;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['rate_updated', 'order', 'withdrawal', 'agent_linked', 'recharge', 'system', 'gift'],
      default: 'system',
    },
    category: {
      type: String,
      enum: ['system', 'arrival_notice', 'new_followers', 'income_reminder', 'other'],
      default: null,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });

export const Notification = model<INotificationDocument>('Notification', notificationSchema);
