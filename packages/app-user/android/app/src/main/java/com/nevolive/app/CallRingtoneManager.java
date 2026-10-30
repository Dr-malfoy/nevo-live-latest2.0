package com.nevolive.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.media.ToneGenerator;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

public class CallRingtoneManager {
    private static final String TAG = "CallRingtoneManager";
    private static Ringtone currentRingtone = null;
    private static MediaPlayer mediaPlayer = null;
    private static ToneGenerator toneGenerator = null;
    private static Vibrator vibrator = null;
    private static boolean isRinging = false;
    private static boolean isOutgoing = false;
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static Runnable timeoutRunnable = null;
    private static Runnable loopCheckRunnable = null;

    /**
     * Backward-compatible helper to start incoming call ringtone.
     */
    public static synchronized void start(Context context) {
        startIncoming(context);
    }

    /**
     * Start playing the real phone ringtone on STREAM_RING with vibration for an incoming call.
     * Continuously loops until stop() is called or 60s timeout expires.
     */
    public static synchronized void startIncoming(Context context) {
        if (context == null) return;
        if (isRinging && !isOutgoing) {
            Log.d(TAG, "Incoming ringtone is already playing");
            return;
        }
        stop(); // Reset any existing playback state
        isRinging = true;
        isOutgoing = false;

        Context appContext = context.getApplicationContext() != null ? context.getApplicationContext() : context;

        try {
            // 1. Resolve phone's actual default call ringtone URI
            Uri ringtoneUri = RingtoneManager.getActualDefaultRingtoneUri(appContext, RingtoneManager.TYPE_RINGTONE);
            if (ringtoneUri == null) {
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }
            if (ringtoneUri == null) {
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            Log.d(TAG, "Starting phone incoming ringtone with URI: " + ringtoneUri);

            // 2. Play ringtone via RingtoneManager (native system audio service)
            boolean playedViaRingtone = false;
            try {
                if (ringtoneUri != null) {
                    currentRingtone = RingtoneManager.getRingtone(appContext, ringtoneUri);
                    if (currentRingtone != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            currentRingtone.setLooping(true);
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                    .setLegacyStreamType(AudioManager.STREAM_RING)
                                    .build();
                            currentRingtone.setAudioAttributes(audioAttributes);
                        } else {
                            currentRingtone.setStreamType(AudioManager.STREAM_RING);
                        }
                        currentRingtone.play();
                        playedViaRingtone = true;
                        Log.d(TAG, "RingtoneManager started playing phone ringtone successfully");
                    }
                }
            } catch (Throwable ringEx) {
                Log.w(TAG, "RingtoneManager play failed, falling back to MediaPlayer: " + ringEx.getMessage());
            }

            // 3. Fallback to MediaPlayer if RingtoneManager did not start
            if (!playedViaRingtone && ringtoneUri != null) {
                try {
                    mediaPlayer = new MediaPlayer();
                    mediaPlayer.setDataSource(appContext, ringtoneUri);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .setLegacyStreamType(AudioManager.STREAM_RING)
                                .build();
                        mediaPlayer.setAudioAttributes(audioAttributes);
                    } else {
                        mediaPlayer.setAudioStreamType(AudioManager.STREAM_RING);
                    }
                    mediaPlayer.setLooping(true);
                    mediaPlayer.prepare();
                    mediaPlayer.start();
                    Log.d(TAG, "MediaPlayer fallback started playing phone ringtone on STREAM_RING");
                } catch (Throwable mediaEx) {
                    Log.e(TAG, "MediaPlayer fallback also failed: " + mediaEx.getMessage());
                }
            }

            // 4. Loop assurance: check periodically and restart if playback ended (for Android < P or custom OEM ROMs)
            loopCheckRunnable = new Runnable() {
                @Override
                public void run() {
                    if (isRinging && !isOutgoing) {
                        try {
                            if (currentRingtone != null && !currentRingtone.isPlaying()) {
                                Log.d(TAG, "Ringtone cycle finished; re-triggering play");
                                currentRingtone.play();
                            }
                        } catch (Throwable ignored) {}
                        mainHandler.postDelayed(this, 1200);
                    }
                }
            };
            mainHandler.postDelayed(loopCheckRunnable, 1200);

            // 5. Start phone call vibration pattern
            try {
                vibrator = (Vibrator) appContext.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null && vibrator.hasVibrator()) {
                    long[] pattern = {0, 1000, 1000, 1000, 1000};
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                    } else {
                        vibrator.vibrate(pattern, 0);
                    }
                }
            } catch (Throwable vibEx) {
                Log.w(TAG, "Vibrator start failed: " + vibEx.getMessage());
            }

            // 6. 60-second auto-stop timeout
            timeoutRunnable = () -> {
                Log.d(TAG, "Call ringing timed out after 60 seconds");
                stop();
            };
            mainHandler.postDelayed(timeoutRunnable, 60000);

        } catch (Throwable e) {
            Log.e(TAG, "Unexpected error in CallRingtoneManager.startIncoming: " + e.getMessage());
        }
    }

    /**
     * Start playing standard phone ringback tone for an outgoing call.
     */
    public static synchronized void startOutgoing(Context context) {
        if (context == null) return;
        if (isRinging) {
            Log.d(TAG, "Ringtone or ringback is already active");
            return;
        }
        stop();
        isRinging = true;
        isOutgoing = true;

        try {
            Log.d(TAG, "Starting outgoing phone ringback tone");
            try {
                toneGenerator = new ToneGenerator(AudioManager.STREAM_VOICE_CALL, 85);
                toneGenerator.startTone(ToneGenerator.TONE_SUP_RINGTONE);
            } catch (Throwable t1) {
                try {
                    toneGenerator = new ToneGenerator(AudioManager.STREAM_RING, 85);
                    toneGenerator.startTone(ToneGenerator.TONE_SUP_RINGTONE);
                } catch (Throwable t2) {
                    Log.w(TAG, "ToneGenerator start failed: " + t2.getMessage());
                }
            }

            timeoutRunnable = () -> {
                Log.d(TAG, "Outgoing ringback timed out after 60 seconds");
                stop();
            };
            mainHandler.postDelayed(timeoutRunnable, 60000);
        } catch (Throwable e) {
            Log.e(TAG, "Unexpected error in CallRingtoneManager.startOutgoing: " + e.getMessage());
        }
    }

    /**
     * Stop all ringtones, ringbacks, and vibration immediately.
     */
    public static synchronized void stop() {
        if (!isRinging && currentRingtone == null && mediaPlayer == null && toneGenerator == null && vibrator == null) {
            return;
        }
        Log.d(TAG, "Stopping native call ringtone, ringback, and vibration");
        isRinging = false;
        isOutgoing = false;

        if (timeoutRunnable != null) {
            mainHandler.removeCallbacks(timeoutRunnable);
            timeoutRunnable = null;
        }

        if (loopCheckRunnable != null) {
            mainHandler.removeCallbacks(loopCheckRunnable);
            loopCheckRunnable = null;
        }

        if (toneGenerator != null) {
            try {
                toneGenerator.stopTone();
                toneGenerator.release();
            } catch (Throwable ignored) {}
            toneGenerator = null;
        }

        if (currentRingtone != null) {
            try {
                currentRingtone.stop();
            } catch (Throwable ignored) {}
            currentRingtone = null;
        }

        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.reset();
                mediaPlayer.release();
            } catch (Throwable ignored) {}
            mediaPlayer = null;
        }

        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Throwable ignored) {}
            vibrator = null;
        }
    }

    public static synchronized boolean isRinging() {
        return isRinging;
    }
}
