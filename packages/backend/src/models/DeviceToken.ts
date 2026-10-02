import { Schema, model, Document } from 'mongoose';

export interface IDeviceTokenDocument extends Document {
  userId: Schema.Types.ObjectId;
  token: string;
  platform: 'android' | 'ios' | 'web';
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deviceTokenSchema = new Schema<IDeviceTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'android',
    },
    deviceId: { type: String, index: true },
    deviceName: { type: String, default: '' },
    appVersion: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    lastActiveAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ userId: 1, isActive: 1 });
deviceTokenSchema.index({ deviceId: 1, userId: 1 });

export const DeviceToken = model<IDeviceTokenDocument>('DeviceToken', deviceTokenSchema);
