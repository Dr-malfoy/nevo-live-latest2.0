package com.nevolive.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

public class CallRingtoneManager {
    private static final String TAG = "CallRingtoneManager";
    private static MediaPlayer mediaPlayer = null;
    private static Ringtone fallbackRingtone = null;
    private static Vibrator vibrator = null;
    private static boolean isPlaying = false;
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static Runnable timeoutRunnable = null;

    /**
     * Start playing the real phone ringtone on STREAM_RING with vibration.
     * Continuously loops until stop() is called or 45s timeout expires.
     */
    public static synchronized void start(Context context) {
        if (context == null) return;
        if (isPlaying) {
            Log.d(TAG, "Ringtone is already playing");
            return;
        }
        isPlaying = true;

        try {
            Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            if (ringtoneUri == null) {
                ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }

            // 1. Try playing via MediaPlayer with looping
            try {
                mediaPlayer = new MediaPlayer();
                mediaPlayer.setDataSource(context, ringtoneUri);

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
                Log.d(TAG, "Native MediaPlayer ringtone started looping on STREAM_RING");
            } catch (Throwable mediaEx) {
                Log.w(TAG, "MediaPlayer ringtone start failed, falling back to RingtoneManager: " + mediaEx.getMessage());
                try {
                    fallbackRingtone = RingtoneManager.getRingtone(context, ringtoneUri);
                    if (fallbackRingtone != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            fallbackRingtone.setLooping(true);
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                    .build();
                            fallbackRingtone.setAudioAttributes(audioAttributes);
                        }
                        fallbackRingtone.play();
                        Log.d(TAG, "Fallback RingtoneManager playing successfully");
                    }
                } catch (Throwable ringEx) {
                    Log.e(TAG, "Fallback RingtoneManager also failed: " + ringEx.getMessage());
                }
            }

            // 2. Start looping phone call vibration pattern
            try {
                vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null && vibrator.hasVibrator()) {
                    long[] pattern = {0, 1000, 800, 1000, 800, 1000};
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                    } else {
                        vibrator.vibrate(pattern, 0);
                    }
                }
            } catch (Throwable vibEx) {
                Log.w(TAG, "Vibrator start failed: " + vibEx.getMessage());
            }

            // 3. 45-second auto-stop timeout
            timeoutRunnable = () -> {
                Log.d(TAG, "Call ringing timed out after 45 seconds");
                stop();
            };
            mainHandler.postDelayed(timeoutRunnable, 45000);

        } catch (Throwable e) {
            Log.e(TAG, "Unexpected error in CallRingtoneManager.start: " + e.getMessage());
        }
    }

    /**
     * Stop ringtone and vibration immediately.
     */
    public static synchronized void stop() {
        if (!isPlaying) return;
        isPlaying = false;
        Log.d(TAG, "Stopping native call ringtone and vibration");

        if (timeoutRunnable != null) {
            mainHandler.removeCallbacks(timeoutRunnable);
            timeoutRunnable = null;
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

        if (fallbackRingtone != null) {
            try {
                fallbackRingtone.stop();
            } catch (Throwable ignored) {}
            fallbackRingtone = null;
        }

        if (vibrator != null) {
            try {
                vibrator.cancel();
            } catch (Throwable ignored) {}
            vibrator = null;
        }
    }

    public static synchronized boolean isRinging() {
        return isPlaying;
    }
}
