package com.nevolive.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class NevoFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "NevoPushService";
    public static final String CALL_CHANNEL_ID = "nevo_calls";
    public static final String NOTIFICATION_CHANNEL_ID = "nevo_notifications";
    public static final int CALL_NOTIFICATION_ID = 9001;

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM Token received: " + token);
        // Token will be synced by the Capacitor PushNotifications plugin or app init
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM Message received from: " + remoteMessage.getFrom());

        Map<String, String> data = remoteMessage.getData();
        if (data != null && !data.isEmpty()) {
            String type = data.get("type");
            Log.d(TAG, "FCM Message data type: " + type);

            if ("INCOMING_CALL".equalsIgnoreCase(type) || "call".equalsIgnoreCase(data.get("notificationType"))) {
                handleIncomingCall(data);
                return;
            } else if ("CALL_CANCELLED".equalsIgnoreCase(type)) {
                handleCallCancelled(data.get("callId"));
                return;
            }
        }

        // Extract title and body from either remoteMessage.getNotification() or data payload
        String title = null;
        String body = null;

        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
        }

        if ((title == null || title.isEmpty()) && data != null) {
            title = data.get("title");
        }
        if ((body == null || body.isEmpty()) && data != null) {
            body = data.get("body");
            if (body == null || body.isEmpty()) {
                body = data.get("message");
            }
        }

        if (title != null || body != null) {
            showStandardNotification(title, body, data);
        }
    }

    private void handleIncomingCall(Map<String, String> data) {
        String callId = data.get("callId");
        String channel = data.get("channel");
        String callType = data.get("callType");
        if (callType == null) callType = "audio";
        String initiatorName = data.get("initiatorName");
        if (initiatorName == null || initiatorName.isEmpty()) initiatorName = "Someone";
        String initiatorAvatar = data.get("initiatorAvatar");
        String token = data.get("token");
        String coinsPerMinute = data.get("coinsPerMinute");

        Log.d(TAG, "Handling incoming " + callType + " call from: " + initiatorName + ", callId: " + callId);

        // Wake screen
        wakeScreen(this);

        // Create Call Notification Channel with HIGH importance & call ringtone
        createCallNotificationChannel();

        // Intent to launch MainActivity when tapped or answered
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.setAction(Intent.ACTION_VIEW);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        fullScreenIntent.putExtra("isIncomingCall", true);
        fullScreenIntent.putExtra("callAction", "open");
        fullScreenIntent.putExtra("callId", callId);
        fullScreenIntent.putExtra("channel", channel);
        fullScreenIntent.putExtra("callType", callType);
        fullScreenIntent.putExtra("initiatorName", initiatorName);
        fullScreenIntent.putExtra("initiatorAvatar", initiatorAvatar);
        fullScreenIntent.putExtra("token", token);
        fullScreenIntent.putExtra("coinsPerMinute", coinsPerMinute);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this,
                CALL_NOTIFICATION_ID,
                fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // Accept Action Intent
        Intent acceptIntent = new Intent(this, MainActivity.class);
        acceptIntent.setAction("com.nevolive.app.ACCEPT_CALL");
        acceptIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        acceptIntent.putExtra("isIncomingCall", true);
        acceptIntent.putExtra("callAction", "accept");
        acceptIntent.putExtra("callId", callId);
        acceptIntent.putExtra("channel", channel);
        acceptIntent.putExtra("callType", callType);
        acceptIntent.putExtra("initiatorName", initiatorName);
        acceptIntent.putExtra("token", token);
        acceptIntent.putExtra("coinsPerMinute", coinsPerMinute);

        PendingIntent acceptPendingIntent = PendingIntent.getActivity(
                this,
                CALL_NOTIFICATION_ID + 1,
                acceptIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // Decline Action Intent
        Intent declineIntent = new Intent(this, IncomingCallActionReceiver.class);
        declineIntent.setAction("com.nevolive.app.DECLINE_CALL");
        declineIntent.putExtra("callId", callId);

        PendingIntent declinePendingIntent = PendingIntent.getBroadcast(
                this,
                CALL_NOTIFICATION_ID + 2,
                declineIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        String callTypeLabel = "video".equalsIgnoreCase(callType) ? "Incoming Video Call" : "Incoming Audio Call";
        String callIconText = "video".equalsIgnoreCase(callType) ? "📹 " : "📞 ";

        Uri defaultRingtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (defaultRingtoneUri == null) {
            defaultRingtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CALL_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(callIconText + callTypeLabel)
                .setContentText(initiatorName + " is calling you...")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(true)
                .setTimeoutAfter(45000)
                .setSound(defaultRingtoneUri)
                .setVibrate(new long[]{0, 1000, 800, 1000, 800, 1000})
                .setContentIntent(fullScreenPendingIntent)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePendingIntent)
                .addAction(android.R.drawable.ic_menu_call, "Accept", acceptPendingIntent);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        try {
            notificationManager.notify(CALL_NOTIFICATION_ID, builder.build());
        } catch (SecurityException se) {
            Log.w(TAG, "Notification permission missing when showing incoming call notification: " + se.getMessage());
        }

        try {
            startActivity(fullScreenIntent);
        } catch (Exception e) {
            Log.d(TAG, "Direct background startActivity skipped/deferred to full-screen intent: " + e.getMessage());
        }
    }

    private void handleCallCancelled(String callId) {
        Log.d(TAG, "Call cancelled for callId: " + callId);
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(CALL_NOTIFICATION_ID);
        }
    }

    private void showStandardNotification(String title, String body, Map<String, String> data) {
        createGeneralNotificationChannel();

        String type = data != null ? data.get("type") : "";
        String targetUrl = data != null ? data.get("targetUrl") : "";
        String chatId = data != null ? data.get("chatId") : "";
        String streamId = data != null ? data.get("streamId") : "";
        String senderId = data != null ? data.get("senderId") : "";
        String imageUrl = data != null ? (data.containsKey("imageUrl") ? data.get("imageUrl") : data.get("senderAvatar")) : null;

        if (targetUrl == null || targetUrl.isEmpty()) {
            if (chatId != null && !chatId.isEmpty()) {
                targetUrl = "/chat/" + chatId;
            } else if (streamId != null && !streamId.isEmpty()) {
                targetUrl = "/stream/" + streamId;
            } else if (senderId != null && !senderId.isEmpty()) {
                targetUrl = "/user/" + senderId;
            } else if ("gift".equalsIgnoreCase(type) || "recharge".equalsIgnoreCase(type) || "withdrawal".equalsIgnoreCase(type)) {
                targetUrl = "/wallet";
            } else if (type != null && type.startsWith("agency")) {
                targetUrl = "/my-agency";
            }
        }

        // Main Tap Intent
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (data != null) {
            for (Map.Entry<String, String> entry : data.entrySet()) {
                intent.putExtra(entry.getKey(), entry.getValue());
            }
        }
        if (targetUrl != null && !targetUrl.isEmpty()) {
            intent.putExtra("targetUrl", targetUrl);
        }

        int reqCode = (int) System.currentTimeMillis();
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                reqCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        String finalTitle = (title != null && !title.isEmpty()) ? title : "Nevo Live";
        String finalBody = (body != null && !body.isEmpty()) ? body : "";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(finalTitle)
                .setContentText(finalBody)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(finalBody).setBigContentTitle(finalTitle))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setSound(defaultSoundUri)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        // Load avatar / image icon for the notification card if available
        if (imageUrl != null && !imageUrl.isEmpty()) {
            Bitmap bitmap = getBitmapFromUrl(imageUrl);
            if (bitmap != null) {
                builder.setLargeIcon(bitmap);
            }
        }

        // Add custom action buttons based on notification type
        if ("message".equalsIgnoreCase(type)) {
            // Reply action button
            Intent replyIntent = new Intent(this, MainActivity.class);
            replyIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            replyIntent.putExtra("targetUrl", targetUrl);
            replyIntent.putExtra("type", "message");
            PendingIntent replyPendingIntent = PendingIntent.getActivity(
                    this,
                    reqCode + 1,
                    replyIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );
            builder.addAction(android.R.drawable.ic_menu_send, "💬 Reply", replyPendingIntent);
            builder.addAction(android.R.drawable.ic_menu_view, "🚀 Go to App", pendingIntent);
        } else if ("live_started".equalsIgnoreCase(type)) {
            // Watch Live action button
            Intent watchIntent = new Intent(this, MainActivity.class);
            watchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            watchIntent.putExtra("targetUrl", targetUrl);
            PendingIntent watchPendingIntent = PendingIntent.getActivity(
                    this,
                    reqCode + 2,
                    watchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );
            builder.addAction(android.R.drawable.ic_media_play, "📺 Watch Live", watchPendingIntent);
        } else if ("follower".equalsIgnoreCase(type) || "friend_request".equalsIgnoreCase(type) || "friend_request_accepted".equalsIgnoreCase(type)) {
            // View Profile action button
            builder.addAction(android.R.drawable.ic_menu_myplaces, "👤 View Profile", pendingIntent);
        } else if ("gift".equalsIgnoreCase(type) || "recharge".equalsIgnoreCase(type) || "coin_transfer".equalsIgnoreCase(type)) {
            // View Wallet action button
            builder.addAction(android.R.drawable.ic_menu_agenda, "💰 View Wallet", pendingIntent);
        } else {
            // Standard Go to App action button
            builder.addAction(android.R.drawable.ic_menu_view, "🚀 Go to App", pendingIntent);
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        try {
            notificationManager.notify(reqCode, builder.build());
        } catch (SecurityException se) {
            Log.w(TAG, "Notification permission missing: " + se.getMessage());
        }
    }

    private Bitmap getBitmapFromUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) return null;
        try {
            java.net.URL url = new java.net.URL(imageUrl);
            java.net.HttpURLConnection connection = (java.net.HttpURLConnection) url.openConnection();
            connection.setDoInput(true);
            connection.setConnectTimeout(3500);
            connection.setReadTimeout(3500);
            connection.connect();
            java.io.InputStream input = connection.getInputStream();
            return android.graphics.BitmapFactory.decodeStream(input);
        } catch (Exception e) {
            return null;
        }
    }

    private void createCallNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager == null) return;

            NotificationChannel existing = notificationManager.getNotificationChannel(CALL_CHANNEL_ID);
            if (existing != null) return;

            NotificationChannel channel = new NotificationChannel(
                    CALL_CHANNEL_ID,
                    "Incoming Calls",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Full-screen notifications for incoming audio and video calls");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 800, 1000, 800, 1000});
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            Uri defaultRingtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (defaultRingtoneUri != null) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .build();
                channel.setSound(defaultRingtoneUri, audioAttributes);
            }

            notificationManager.createNotificationChannel(channel);
        }
    }

    private void createGeneralNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager == null) return;

            NotificationChannel existing = notificationManager.getNotificationChannel(NOTIFICATION_CHANNEL_ID);
            if (existing != null) return;

            NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "General Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Messages, gifts, followers, and live room updates");
            channel.enableVibration(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            if (defaultSoundUri != null) {
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .build();
                channel.setSound(defaultSoundUri, audioAttributes);
            }

            notificationManager.createNotificationChannel(channel);
        }
    }

    private static void wakeScreen(Context context) {
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                        PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                        "nevolive:call_wakelock"
                );
                wakeLock.acquire(10000); // 10 seconds wake lock
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not acquire wake lock: " + e.getMessage());
        }
    }
}
