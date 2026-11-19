package com.navolive.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.util.List;

public class AudioRouteManager {
    private static final String TAG = "AudioRouteManager";
    private static AudioRouteManager instance;

    private final Context context;
    private final AudioManager audioManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean isSpeakerMode = false;
    private boolean isLiveStreamActive = false;
    private boolean isRegistered = false;
    private AudioFocusRequest audioFocusRequest = null;

    private final BroadcastReceiver headsetReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent != null ? intent.getAction() : null;
            if (Intent.ACTION_HEADSET_PLUG.equals(action) ||
                "android.bluetooth.headset.profile.action.CONNECTION_STATE_CHANGED".equals(action)) {
                Log.d(TAG, "Headset plug/connection event detected: " + action);
                if (isLiveStreamActive || isSpeakerMode) {
                    mainHandler.postDelayed(() -> applyAudioRouting(isSpeakerMode), 300);
                }
            }
        }
    };

    private AudioDeviceCallback audioDeviceCallback = null;

    private AudioRouteManager(Context context) {
        this.context = context.getApplicationContext();
        this.audioManager = (AudioManager) this.context.getSystemService(Context.AUDIO_SERVICE);
        initDeviceCallback();
    }

    public static synchronized AudioRouteManager getInstance(Context context) {
        if (instance == null) {
            instance = new AudioRouteManager(context);
        }
        return instance;
    }

    private void initDeviceCallback() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && audioManager != null) {
            audioDeviceCallback = new AudioDeviceCallback() {
                @Override
                public void onAudioDevicesAdded(AudioDeviceInfo[] addedDevices) {
                    Log.d(TAG, "Audio devices added callback");
                    if (isLiveStreamActive || isSpeakerMode) {
                        mainHandler.postDelayed(() -> applyAudioRouting(isSpeakerMode), 300);
                    }
                }

                @Override
                public void onAudioDevicesRemoved(AudioDeviceInfo[] removedDevices) {
                    Log.d(TAG, "Audio devices removed callback");
                    if (isLiveStreamActive || isSpeakerMode) {
                        mainHandler.postDelayed(() -> applyAudioRouting(isSpeakerMode), 300);
                    }
                }
            };
        }
    }

    private synchronized void registerReceivers() {
        if (isRegistered) return;
        try {
            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_HEADSET_PLUG);
            filter.addAction("android.bluetooth.headset.profile.action.CONNECTION_STATE_CHANGED");
            context.registerReceiver(headsetReceiver, filter);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && audioManager != null && audioDeviceCallback != null) {
                audioManager.registerAudioDeviceCallback(audioDeviceCallback, mainHandler);
            }
            isRegistered = true;
            Log.d(TAG, "AudioRouteManager receivers registered");
        } catch (Throwable e) {
            Log.w(TAG, "Error registering headset receivers: " + e.getMessage());
        }
    }

    private synchronized void unregisterReceivers() {
        if (!isRegistered) return;
        try {
            context.unregisterReceiver(headsetReceiver);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && audioManager != null && audioDeviceCallback != null) {
                audioManager.unregisterAudioDeviceCallback(audioDeviceCallback);
            }
            isRegistered = false;
            Log.d(TAG, "AudioRouteManager receivers unregistered");
        } catch (Throwable ignored) {}
    }

    /**
     * Called when a live stream starts (audience or host).
     * Forces audio to Speaker (or Headphone/Headset if connected).
     * Never allows audio to go to the phone earpiece!
     */
    public synchronized void startLiveAudio() {
        Log.d(TAG, "startLiveAudio invoked - forcing Speaker/Headphone route");
        isLiveStreamActive = true;
        isSpeakerMode = true;
        registerReceivers();
        requestLiveAudioFocus();
        applyAudioRouting(true);
        // Secondary re-enforce after 500ms and 1500ms to override any Chromium WebRTC reset
        mainHandler.postDelayed(() -> {
            if (isLiveStreamActive) {
                applyAudioRouting(true);
            }
        }, 500);
        mainHandler.postDelayed(() -> {
            if (isLiveStreamActive) {
                applyAudioRouting(true);
            }
        }, 1500);
    }

    public synchronized void stopLiveAudio() {
        Log.d(TAG, "stopLiveAudio invoked - resetting audio route");
        isLiveStreamActive = false;
        isSpeakerMode = false;
        unregisterReceivers();
        resetAudioRouting();
    }

    public synchronized void setSpeakerphone(boolean on) {
        Log.d(TAG, "setSpeakerphone: " + on);
        isSpeakerMode = on;
        if (on) {
            registerReceivers();
        }
        applyAudioRouting(on);
    }

    private void requestLiveAudioFocus() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build();
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                        .setAudioAttributes(playbackAttributes)
                        .setAcceptsDelayedFocusGain(true)
                        .setOnAudioFocusChangeListener(focusChange -> {
                            Log.d(TAG, "AudioFocus change in LiveAudio: " + focusChange);
                        })
                        .build();
                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            }
        } catch (Throwable e) {
            Log.w(TAG, "requestLiveAudioFocus error: " + e.getMessage());
        }
    }

    /**
     * Apply audio routing to Speaker or Headphone.
     * Checks if wired or bluetooth headset is connected:
     * - If headset connected -> routes to HEADSET.
     * - If no headset -> routes to BUILT-IN LOUDSPEAKER.
     * - NEVER routes to BUILT-IN EARPIECE when preferSpeaker is true!
     */
    public synchronized void applyAudioRouting(boolean preferSpeaker) {
        if (audioManager == null) return;
        try {
            boolean hasHeadset = isHeadsetConnected();
            Log.d(TAG, "applyAudioRouting: preferSpeaker=" + preferSpeaker + ", hasHeadset=" + hasHeadset);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+ (API 31+) explicit setCommunicationDevice API
                audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                List<AudioDeviceInfo> availableDevices = audioManager.getAvailableCommunicationDevices();
                AudioDeviceInfo targetDevice = null;

                if (hasHeadset) {
                    // Find connected headset device
                    for (AudioDeviceInfo dev : availableDevices) {
                        int type = dev.getType();
                        if (type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                            type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                            type == AudioDeviceInfo.TYPE_USB_HEADSET ||
                            type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                            type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
                            type == AudioDeviceInfo.TYPE_HEARING_AID) {
                            targetDevice = dev;
                            break;
                        }
                    }
                }

                if (targetDevice == null && preferSpeaker) {
                    // Find built-in speaker (loudspeaker)
                    for (AudioDeviceInfo dev : availableDevices) {
                        if (dev.getType() == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                            targetDevice = dev;
                            break;
                        }
                    }
                }

                if (targetDevice != null) {
                    boolean success = audioManager.setCommunicationDevice(targetDevice);
                    Log.d(TAG, "setCommunicationDevice: type=" + targetDevice.getType() + " (" + targetDevice.getProductName() + ") success=" + success);
                } else if (!preferSpeaker) {
                    // Target earpiece (only if explicitly requested for phone call earpiece mode)
                    for (AudioDeviceInfo dev : availableDevices) {
                        if (dev.getType() == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                            audioManager.setCommunicationDevice(dev);
                            break;
                        }
                    }
                }

                // Also ensure legacy flag is consistent
                try {
                    audioManager.setSpeakerphoneOn(!hasHeadset && preferSpeaker);
                } catch (Throwable ignored) {}
            } else {
                // Legacy Android (< 12)
                audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                if (hasHeadset) {
                    audioManager.setSpeakerphoneOn(false); // routes to headset
                } else {
                    audioManager.setSpeakerphoneOn(preferSpeaker);
                }
            }
        } catch (Throwable e) {
            Log.w(TAG, "Error applying audio routing: " + e.getMessage());
        }
    }

    public boolean isHeadsetConnected() {
        if (audioManager == null) return false;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                for (AudioDeviceInfo dev : devices) {
                    int type = dev.getType();
                    if (type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                        type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                        type == AudioDeviceInfo.TYPE_USB_HEADSET ||
                        type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                        type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                        type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
                        type == AudioDeviceInfo.TYPE_HEARING_AID) {
                        return true;
                    }
                }
            } else {
                return audioManager.isWiredHeadsetOn() || audioManager.isBluetoothScoOn() || audioManager.isBluetoothA2dpOn();
            }
        } catch (Throwable ignored) {}
        return false;
    }

    public synchronized void resetAudioRouting() {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice();
            }
            audioManager.setSpeakerphoneOn(false);
            audioManager.setMode(AudioManager.MODE_NORMAL);
            if (audioFocusRequest != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
                audioFocusRequest = null;
            } else {
                audioManager.abandonAudioFocus(null);
            }
            Log.d(TAG, "resetAudioRouting completed - MODE_NORMAL");
        } catch (Throwable e) {
            Log.w(TAG, "Error resetting audio routing: " + e.getMessage());
        }
    }
}
