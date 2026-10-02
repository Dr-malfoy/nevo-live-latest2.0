import { Schema, model, Document } from 'mongoose';

export type NotificationType =
  | 'rate_updated'
  | 'order'
  | 'withdrawal'
  | 'agent_linked'
  | 'recharge'
  | 'system'
  | 'gift'
  | 'message'
  | 'follower'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'live_started'
  | 'live_joined'
  | 'coin_received'
  | 'coin_transfer'
  | 'agency_join_request'
  | 'agency_join_approved'
  | 'agency_join_rejected'
  | 'agency_invitation'
  | 'call';

export interface INotificationDocument extends Document {
  userId: Schema.Types.ObjectId;
  type: NotificationType;
  /**
   * §4.10 — drives the official-inbox rows by key, never by string-matching a
   * translated title. `null` for ordinary user notifications.
   */
  category?: 'system' | 'arrival_notice' | 'new_followers' | 'income_reminder' | 'social' | 'other' | null;
  senderId?: Schema.Types.ObjectId;
  senderInfo?: {
    nickname?: string;
    avatar?: string;
    uid?: string;
  };
  title: string;
  message: string;
  targetUrl?: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'rate_updated',
        'order',
        'withdrawal',
        'agent_linked',
        'recharge',
        'system',
        'gift',
        'message',
        'follower',
        'friend_request',
        'friend_request_accepted',
        'live_started',
        'live_joined',
        'coin_received',
        'coin_transfer',
        'agency_join_request',
        'agency_join_approved',
        'agency_join_rejected',
        'agency_invitation',
        'call',
      ],
      default: 'system',
      index: true,
    },
    category: {
      type: String,
      enum: ['system', 'arrival_notice', 'new_followers', 'income_reminder', 'social', 'other'],
      default: null,
      index: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    senderInfo: {
      nickname: { type: String, default: '' },
      avatar: { type: String, default: '' },
      uid: { type: String, default: '' },
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    targetUrl: { type: String, default: '' },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const Notification = model<INotificationDocument>('Notification', notificationSchema);
