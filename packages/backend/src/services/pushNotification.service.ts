import admin from 'firebase-admin';
import { getFirebaseApp } from '../config/firebase';
import { DeviceToken } from '../models/DeviceToken';
import mongoose from 'mongoose';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  badge?: number;
}

export interface IncomingCallPushPayload {
  callId: string;
  channel: string;
  type: 'audio' | 'video';
  initiatorId: string;
  initiatorName: string;
  initiatorAvatar?: string;
  token: string;
  coinsPerMinute?: number;
}

export const pushNotificationService = {
  /**
   * Register or refresh a push notification device token for a user.
   * Supports multiple devices per user and handles device ownership transitions cleanly.
   */
  async registerDeviceToken(
    userId: string,
    params: {
      token: string;
      platform?: 'android' | 'ios' | 'web';
      deviceId?: string;
      deviceName?: string;
      appVersion?: string;
    }
  ) {
    if (!userId || !params.token) return null;

    try {
      const userObjId = new mongoose.Types.ObjectId(userId);
      const platform = params.platform || 'android';

      // If a physical device ID is provided, deactivate any old records on this device
      // for other users so previous accounts don't receive notifications on this phone.
      if (params.deviceId) {
        await DeviceToken.updateMany(
          { deviceId: params.deviceId, userId: { $ne: userObjId } },
          { $set: { isActive: false } }
        );
      }

      // Upsert the token for the current user
      const doc = await DeviceToken.findOneAndUpdate(
        { token: params.token },
        {
          $set: {
            userId: userObjId,
            platform,
            deviceId: params.deviceId || '',
            deviceName: params.deviceName || '',
            appVersion: params.appVersion || '',
            isActive: true,
            lastActiveAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return doc;
    } catch (err) {
      console.warn('[PushNotificationService] Failed to register token:', err);
      return null;
    }
  },

  /**
   * Deactivate a specific push token (e.g., upon user logout).
   */
  async unregisterDeviceToken(userId: string, token: string) {
    try {
      if (!userId || !token) return;
      await DeviceToken.updateMany(
        { userId: new mongoose.Types.ObjectId(userId), token },
        { $set: { isActive: false } }
      );
    } catch (err) {
      console.warn('[PushNotificationService] Failed to unregister token:', err);
    }
  },

  /**
   * Send push notification to all active devices of a user.
   * Cleans up invalid/expired tokens automatically.
   */
  async sendToUser(userId: string, payload: PushNotificationPayload) {
    try {
      if (!userId || !mongoose.isValidObjectId(userId)) return;

      const app = getFirebaseApp();
      if (!app) {
        // Firebase admin not configured
        return;
      }

      const activeTokens = await DeviceToken.find({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
      }).lean();

      if (!activeTokens || activeTokens.length === 0) {
        return;
      }

      const tokens = activeTokens.map((t) => t.token);

      // Convert all data properties to strings (required by FCM)
      const sanitizedData: Record<string, string> = {};
      if (payload.data) {
        for (const [key, value] of Object.entries(payload.data)) {
          if (value !== undefined && value !== null) {
            sanitizedData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
          }
        }
      }

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: sanitizedData,
        android: {
          priority: 'high',
          notification: {
            channelId: 'nevo_notifications',
            sound: 'default',
            defaultSound: true,
            defaultVibrateTimings: true,
            priority: 'high',
            visibility: 'public',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: payload.badge || 1,
              contentAvailable: true,
            },
          },
        },
      };

      const messaging = app.messaging();
      const response = await messaging.sendEachForMulticast(message);

      // Check for invalid tokens and deactivate them
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code || '';
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered' ||
            errCode === 'messaging/mismatched-credential'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await DeviceToken.updateMany(
          { token: { $in: invalidTokens } },
          { $set: { isActive: false } }
        );
      }
    } catch (err) {
      console.warn('[PushNotificationService] Failed to send push to user:', err);
    }
  },

  /**
   * Send high-priority incoming call push notification to wake the receiver device
   * and show full-screen incoming call UI even when the app is backgrounded or locked.
   */
  async sendIncomingCallPush(receiverId: string, callData: IncomingCallPushPayload) {
    try {
      if (!receiverId || !mongoose.isValidObjectId(receiverId)) return;

      const app = getFirebaseApp();
      if (!app) return;

      const activeTokens = await DeviceToken.find({
        userId: new mongoose.Types.ObjectId(receiverId),
        isActive: true,
      }).lean();

      if (!activeTokens || activeTokens.length === 0) return;

      const tokens = activeTokens.map((t) => t.token);

      const callTypeLabel = callData.type === 'video' ? 'Incoming Video Call' : 'Incoming Audio Call';
      const callIcon = callData.type === 'video' ? '📹' : '📞';

      const dataPayload: Record<string, string> = {
        type: 'INCOMING_CALL',
        notificationType: 'call',
        callId: String(callData.callId),
        channel: String(callData.channel),
        callType: String(callData.type),
        initiatorId: String(callData.initiatorId),
        initiatorName: String(callData.initiatorName || 'Someone'),
        initiatorAvatar: String(callData.initiatorAvatar || ''),
        token: String(callData.token),
        coinsPerMinute: String(callData.coinsPerMinute || 0),
        timestamp: String(Date.now()),
      };

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: `${callIcon} ${callTypeLabel}`,
          body: `${callData.initiatorName || 'Someone'} is calling you...`,
          imageUrl: callData.initiatorAvatar || undefined,
        },
        data: dataPayload,
        android: {
          priority: 'high',
          ttl: 45 * 1000, // 45 seconds TTL
          notification: {
            channelId: 'nevo_calls',
            sound: 'default',
            priority: 'max',
            visibility: 'public',
            defaultVibrateTimings: true,
            defaultSound: true,
            tag: `call_${callData.callId}`,
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-expiration': String(Math.floor(Date.now() / 1000) + 45),
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      const messaging = app.messaging();
      const response = await messaging.sendEachForMulticast(message);

      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code || '';
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await DeviceToken.updateMany(
          { token: { $in: invalidTokens } },
          { $set: { isActive: false } }
        );
      }
    } catch (err) {
      console.warn('[PushNotificationService] Failed to send incoming call push:', err);
    }
  },

  /**
   * Send high-priority call cancellation push to dismiss the incoming call UI
   * on the callee's device when caller hangs up before call is answered.
   */
  async sendCallCancelledPush(receiverId: string, callId: string) {
    try {
      if (!receiverId || !mongoose.isValidObjectId(receiverId)) return;

      const app = getFirebaseApp();
      if (!app) return;

      const activeTokens = await DeviceToken.find({
        userId: new mongoose.Types.ObjectId(receiverId),
        isActive: true,
      }).lean();

      if (!activeTokens || activeTokens.length === 0) return;

      const tokens = activeTokens.map((t) => t.token);

      const dataPayload: Record<string, string> = {
        type: 'CALL_CANCELLED',
        callId: String(callId),
        timestamp: String(Date.now()),
      };

      const message: admin.messaging.MulticastMessage = {
        tokens,
        data: dataPayload,
        android: {
          priority: 'high',
          ttl: 10 * 1000,
        },
      };

      const messaging = app.messaging();
      await messaging.sendEachForMulticast(message);
    } catch (err) {
      console.warn('[PushNotificationService] Failed to send call cancelled push:', err);
    }
  },
};
