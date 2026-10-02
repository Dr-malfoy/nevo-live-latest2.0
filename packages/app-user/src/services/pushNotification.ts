import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';
import { notificationApi } from '../api';

let isInitialized = false;
let currentToken: string | null = null;

export interface PushNotificationHandlers {
  onIncomingCall?: (callData: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    initiatorId: string;
    initiatorName: string;
    initiatorAvatar?: string;
    token: string;
    coinsPerMinute?: number;
  }) => void;
  onCallCancelled?: (callId: string) => void;
  onNavigate?: (url: string) => void;
}

export const pushNotificationService = {
  /**
   * Initialize native & web push notifications, request permissions, and register token with backend.
   */
  async init(handlers: PushNotificationHandlers = {}) {
    if (!Capacitor.isNativePlatform()) {
      // Running on web browser — web push can also be used if configured
      return;
    }

    if (isInitialized) return;
    isInitialized = true;

    try {
      // 1. Request Push Notification permissions
      const permStatus = await PushNotifications.checkPermissions();
      let granted = permStatus.receive === 'granted';

      if (!granted) {
        const reqStatus = await PushNotifications.requestPermissions();
        granted = reqStatus.receive === 'granted';
      }

      if (!granted) {
        console.warn('[Push] Push notification permission not granted');
        return;
      }

      // 2. Create notification channels on Android
      try {
        await PushNotifications.createChannel({
          id: 'nevo_calls',
          name: 'Incoming Calls',
          description: 'High-priority notifications for audio and video calls',
          importance: 5, // High / Max importance
          visibility: 1, // Public on lockscreen
          vibration: true,
          sound: 'default',
        });

        await PushNotifications.createChannel({
          id: 'nevo_notifications',
          name: 'General Notifications',
          description: 'Messages, gifts, social alerts and updates',
          importance: 4,
          visibility: 1,
          vibration: true,
          sound: 'default',
        });
      } catch (channelErr) {
        console.warn('[Push] Error creating Android notification channels:', channelErr);
      }

      // 3. Register with Apple APNs / Google FCM
      await PushNotifications.register();

      // 4. Handle successful token registration
      PushNotifications.addListener('registration', async (token: Token) => {
        currentToken = token.value;
        try {
          const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';
          await notificationApi.registerPushToken({
            token: token.value,
            platform,
            deviceName: navigator.userAgent.slice(0, 100),
          });
          localStorage.setItem('nevo_push_token', token.value);
        } catch (regErr) {
          console.warn('[Push] Failed to save device token on server:', regErr);
        }
      });

      // 5. Handle registration error
      PushNotifications.addListener('registrationError', (error: any) => {
        console.warn('[Push] Error on push registration:', error);
      });

      // 6. Handle notification received in foreground / background
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        const data = notification.data || {};

        if (data.type === 'INCOMING_CALL' && handlers.onIncomingCall) {
          handlers.onIncomingCall({
            callId: data.callId,
            channel: data.channel,
            type: data.callType === 'video' ? 'video' : 'audio',
            initiatorId: data.initiatorId,
            initiatorName: data.initiatorName || 'Someone',
            initiatorAvatar: data.initiatorAvatar,
            token: data.token,
            coinsPerMinute: data.coinsPerMinute ? Number(data.coinsPerMinute) : 0,
          });
        } else if (data.type === 'CALL_CANCELLED' && handlers.onCallCancelled) {
          handlers.onCallCancelled(data.callId);
        }
      });

      // 7. Handle user tapping / opening notification from notification tray
      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const data = action.notification.data || {};

        if (data.type === 'INCOMING_CALL' && handlers.onIncomingCall) {
          handlers.onIncomingCall({
            callId: data.callId,
            channel: data.channel,
            type: data.callType === 'video' ? 'video' : 'audio',
            initiatorId: data.initiatorId,
            initiatorName: data.initiatorName || 'Someone',
            initiatorAvatar: data.initiatorAvatar,
            token: data.token,
            coinsPerMinute: data.coinsPerMinute ? Number(data.coinsPerMinute) : 0,
          });
        } else if (data.targetUrl && handlers.onNavigate) {
          handlers.onNavigate(data.targetUrl);
        } else if (data.type === 'message' && data.chatId && handlers.onNavigate) {
          handlers.onNavigate(`/chat/${data.chatId}`);
        } else if (data.type === 'follower' && data.senderId && handlers.onNavigate) {
          handlers.onNavigate(`/user/${data.senderId}`);
        } else if (data.type === 'live_started' && data.streamId && handlers.onNavigate) {
          handlers.onNavigate(`/stream/${data.streamId}`);
        }
      });
    } catch (err) {
      console.warn('[Push] Error initializing Push Notifications:', err);
    }
  },

  /**
   * Unregister push token on logout
   */
  async unregister() {
    const token = currentToken || localStorage.getItem('nevo_push_token');
    if (token) {
      try {
        await notificationApi.unregisterPushToken({ token });
        localStorage.removeItem('nevo_push_token');
      } catch {}
    }
    isInitialized = false;
    currentToken = null;
  },
};
