package com.navolive.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service for Active Ongoing Calls.
 * Keeps microphone capture alive in the background when the user switches to other apps,
 * prevents the Android OS from muting the mic buffer, and prevents the CPU from sleeping.
 */
public class OngoingCallService extends Service {
    private static final String TAG = "OngoingCallService";
    public static final String ACTION_START = "com.navolive.app.START_ONGOING_CALL";
    public static final String ACTION_STOP = "com.navolive.app.STOP_ONGOING_CALL";
    public static final String CHANNEL_ID = "nevo_ongoing_call_channel";
    public static final int NOTIFICATION_ID = 9005;

    private PowerManager.WakeLock wakeLock = null;
    private AudioFocusRequest audioFocusRequest = null;
    private AudioManager audioManager = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        Log.d(TAG, "onStartCommand action: " + action);

        if (ACTION_STOP.equals(action)) {
            stopCallService();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(action)) {
            String callerName = intent.getStringExtra("callerName");
            if (callerName == null || callerName.trim().isEmpty()) {
                callerName = "Friend";
            }
            String callType = intent.getStringExtra("callType");
            startCallForeground(callerName, callType);
        }

        return START_NOT_STICKY;
    }

    private void startCallForeground(String callerName, String callType) {
        createNotificationChannel();

        Intent returnIntent = new Intent(this, MainActivity.class);
        returnIntent.setAction(Intent.ACTION_MAIN);
        returnIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        returnIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                returnIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        boolean isVideo = "video".equalsIgnoreCase(callType);
        boolean isParty = "party".equalsIgnoreCase(callType);
        String callTypeDesc = isParty ? "Voice Party in progress" : isVideo ? "Video Call in progress" : "Voice Call in progress";
        String notificationTitle = isParty ? ("Party Room · " + callerName) : ("Active Call · " + callerName);
        String subText = isParty ? "Party Active" : "Call Active";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(notificationTitle)
                .setContentText(callTypeDesc + " · Tap to return")
                .setSubText(subText)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        Notification notification = builder.build();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // Android 14+ (API 34+)
                int serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
                try {
                    serviceType |= ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL;
                } catch (Throwable ignored) {}
                startForeground(NOTIFICATION_ID, notification, serviceType);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10+ (API 29+)
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            Log.d(TAG, "startForeground succeeded with type microphone");
        } catch (Throwable e) {
            Log.w(TAG, "startForeground fallback without types: " + e.getMessage());
            try {
                startForeground(NOTIFICATION_ID, notification);
            } catch (Throwable ex) {
                Log.e(TAG, "startForeground completely failed: " + ex.getMessage());
            }
        }

        // Acquire WakeLock to keep CPU active during call
        acquireWakeLock();

        // Request AudioFocus for voice communication
        requestCallAudioFocus();

        if (isParty) {
            MainActivity.isPartyActive = true;
        } else {
            MainActivity.isCallActive = true;
        }
    }

    private void acquireWakeLock() {
        if (wakeLock == null) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NavoLive:OngoingCallWakeLock");
                    wakeLock.acquire(4 * 60 * 60 * 1000L); // 4 hours safety max
                    Log.d(TAG, "OngoingCall WakeLock acquired");
                }
            } catch (Throwable e) {
                Log.w(TAG, "Could not acquire WakeLock: " + e.getMessage());
            }
        }
    }

    private void requestCallAudioFocus() {
        try {
            AudioRouteManager.getInstance(this).applyAudioRouting(true);
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build();
                    audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                            .setAudioAttributes(playbackAttributes)
                            .setAcceptsDelayedFocusGain(true)
                            .setOnAudioFocusChangeListener(focusChange -> {
                                Log.d(TAG, "AudioFocus change in OngoingCall: " + focusChange);
                            })
                            .build();
                    audioManager.requestAudioFocus(audioFocusRequest);
                } else {
                    audioManager.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN);
                }
            }
        } catch (Throwable e) {
            Log.w(TAG, "Error setting audio focus / mode: " + e.getMessage());
        }
    }

    private void stopCallService() {
        Log.d(TAG, "stopCallService called");
        MainActivity.isCallActive = false;
        MainActivity.isPartyActive = false;

        try {
            AudioRouteManager.getInstance(this).resetAudioRouting();
        } catch (Throwable ignored) {}

        if (audioManager != null) {
            try {
                audioManager.setMode(AudioManager.MODE_NORMAL);
            } catch (Throwable ignored) {}
        }

        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
                Log.d(TAG, "WakeLock released");
            } catch (Throwable ignored) {}
            wakeLock = null;
        }

        if (audioManager != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    audioManager.abandonAudioFocusRequest(audioFocusRequest);
                    audioFocusRequest = null;
                } else {
                    audioManager.abandonAudioFocus(null);
                }
                audioManager.setMode(AudioManager.MODE_NORMAL);
            } catch (Throwable ignored) {}
        }

        try {
            stopForeground(true);
        } catch (Throwable ignored) {}

        stopSelf();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = nm.getNotificationChannel(CHANNEL_ID);
                if (channel == null) {
                    channel = new NotificationChannel(
                            CHANNEL_ID,
                            "Active Call Service",
                            NotificationManager.IMPORTANCE_LOW
                    );
                    channel.setDescription("Keeps microphone active during background calls");
                    channel.setShowBadge(false);
                    channel.setSound(null, null);
                    channel.enableVibration(false);
                    nm.createNotificationChannel(channel);
                }
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopCallService();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
