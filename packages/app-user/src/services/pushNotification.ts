import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';
import { notificationApi } from '../api';

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
   * Initialize native push notifications, bind listeners, request permissions, and register token with backend.
   */
  async init(handlers: PushNotificationHandlers = {}) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Remove any existing listeners first to prevent duplicates
      await PushNotifications.removeAllListeners();

      // 1. Bind registration listener BEFORE calling register()
      await PushNotifications.addListener('registration', async (token: Token) => {
        currentToken = token.value;
        console.log('[Push] FCM device token generated:', token.value);
        try {
          const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';
          await notificationApi.registerPushToken({
            token: token.value,
            platform,
            deviceName: navigator.userAgent.slice(0, 100),
          });
          localStorage.setItem('nevo_push_token', token.value);
        } catch (regErr) {
          console.warn('[Push] Failed to register device token on backend:', regErr);
        }
      });

      // 2. Bind registration error listener
      await PushNotifications.addListener('registrationError', (error: any) => {
        console.warn('[Push] Error on push registration:', error);
      });

      // 3. Bind incoming notification listener (foreground & background)
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
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

      // 4. Bind notification tap listener
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
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

      // 5. Request Push Notification permissions (Android 13+ POST_NOTIFICATIONS)
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

      // 6. Create Android notification channels
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

      // 7. Register with Google FCM AFTER listeners are bound
      await PushNotifications.register();
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
    currentToken = null;
  },
};
