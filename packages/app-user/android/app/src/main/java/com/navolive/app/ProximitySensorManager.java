package com.navolive.app;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

/**
 * Manages the device hardware Proximity Sensor for Messenger Audio Calls.
 *
 * When an audio call is active in earpiece mode and the user brings the phone
 * to their ear/body, the display automatically turns OFF and touch input is shielded
 * to prevent accidental cheek presses, while audio and microphone remain uninterrupted.
 *
 * When the user moves the phone away from their ear/body, the display automatically
 * turns back ON.
 */
public class ProximitySensorManager implements SensorEventListener {
    private static final String TAG = "ProximitySensorManager";
    private static ProximitySensorManager instance;

    private final Context context;
    private final PowerManager powerManager;
    private final SensorManager sensorManager;
    private final Sensor proximitySensor;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private PowerManager.WakeLock proximityWakeLock = null;
    private boolean isMonitoring = false;
    private boolean isSpeakerphoneOn = false;
    private boolean isNear = false;
    private ProximityListener listener = null;

    public interface ProximityListener {
        void onProximityChanged(boolean isNear);
    }

    private ProximitySensorManager(Context context) {
        this.context = context.getApplicationContext();
        this.powerManager = (PowerManager) this.context.getSystemService(Context.POWER_SERVICE);
        this.sensorManager = (SensorManager) this.context.getSystemService(Context.SENSOR_SERVICE);
        this.proximitySensor = this.sensorManager != null ? this.sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY) : null;
        initWakeLock();
    }

    public static synchronized ProximitySensorManager getInstance(Context context) {
        if (instance == null) {
            instance = new ProximitySensorManager(context);
        }
        return instance;
    }

    public void setListener(ProximityListener listener) {
        this.listener = listener;
    }

    private void initWakeLock() {
        if (powerManager != null) {
            try {
                if (powerManager.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) {
                    proximityWakeLock = powerManager.newWakeLock(
                            PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK,
                            "NavoLive:ProximityScreenOff"
                    );
                    Log.d(TAG, "PROXIMITY_SCREEN_OFF_WAKE_LOCK supported and created");
                } else {
                    Log.d(TAG, "PROXIMITY_SCREEN_OFF_WAKE_LOCK not supported on this device, using SensorManager fallback");
                }
            } catch (Throwable e) {
                Log.w(TAG, "Error initializing proximity wake lock: " + e.getMessage());
            }
        }
    }

    /**
     * Start monitoring proximity sensor for audio calls.
     * Automatically acquires PROXIMITY_SCREEN_OFF_WAKE_LOCK and listens to hardware sensor.
     */
    public synchronized void start(boolean speakerphoneOn) {
        this.isSpeakerphoneOn = speakerphoneOn;
        if (isMonitoring) {
            updateWakeLockState();
            return;
        }

        isMonitoring = true;
        isNear = false;
        Log.d(TAG, "start proximity monitoring (speakerphoneOn=" + speakerphoneOn + ")");

        // Register hardware sensor listener
        if (sensorManager != null && proximitySensor != null) {
            try {
                sensorManager.registerListener(this, proximitySensor, SensorManager.SENSOR_DELAY_NORMAL, mainHandler);
                Log.d(TAG, "SensorManager proximity listener registered");
            } catch (Throwable e) {
                Log.w(TAG, "Could not register proximity sensor listener: " + e.getMessage());
            }
        }

        updateWakeLockState();
    }

    /**
     * Set speakerphone status. When loudspeaker is ON, we pause screen-off wake lock
     * so user can see screen while loudspeaker is active.
     */
    public synchronized void setSpeakerphone(boolean on) {
        this.isSpeakerphoneOn = on;
        Log.d(TAG, "setSpeakerphone: " + on);
        if (isMonitoring) {
            updateWakeLockState();
        }
    }

    private synchronized void updateWakeLockState() {
        if (!isMonitoring || isSpeakerphoneOn) {
            releaseWakeLock();
            if (isNear) {
                isNear = false;
                notifyListener(false);
            }
        } else {
            acquireWakeLock();
        }
    }

    private void acquireWakeLock() {
        if (proximityWakeLock != null && !proximityWakeLock.isHeld()) {
            try {
                proximityWakeLock.acquire(4 * 60 * 60 * 1000L); // 4 hours safety timeout
                Log.d(TAG, "Proximity WakeLock acquired");
            } catch (Throwable e) {
                Log.w(TAG, "Could not acquire proximity wake lock: " + e.getMessage());
            }
        }
    }

    private void releaseWakeLock() {
        if (proximityWakeLock != null && proximityWakeLock.isHeld()) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    proximityWakeLock.release(PowerManager.RELEASE_FLAG_WAIT_FOR_NO_PROXIMITY);
                } else {
                    proximityWakeLock.release();
                }
                Log.d(TAG, "Proximity WakeLock released");
            } catch (Throwable e) {
                try {
                    proximityWakeLock.release();
                } catch (Throwable ignored) {
                    // Ignored
                }
            }
        }
    }

    public synchronized void stop() {
        if (!isMonitoring) return;
        Log.d(TAG, "stop proximity monitoring");
        isMonitoring = false;
        isNear = false;

        releaseWakeLock();

        if (sensorManager != null) {
            try {
                sensorManager.unregisterListener(this);
            } catch (Throwable ignored) {}
        }

        notifyListener(false);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event == null || event.values == null || event.values.length == 0) return;
        if (!isMonitoring || isSpeakerphoneOn) return;

        float distance = event.values[0];
        float maxRange = proximitySensor != null ? proximitySensor.getMaximumRange() : 5.0f;
        boolean near = distance < Math.min(maxRange, 5.0f);

        if (near != isNear) {
            isNear = near;
            Log.d(TAG, "Proximity sensor state changed: isNear=" + isNear + " (distance=" + distance + ", max=" + maxRange + ")");
            notifyListener(isNear);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // No-op
    }

    private void notifyListener(boolean near) {
        mainHandler.post(() -> {
            if (listener != null) {
                listener.onProximityChanged(near);
            }
        });
    }

    public boolean isNear() {
        return isNear;
    }

    public boolean isMonitoring() {
        return isMonitoring;
    }
}
