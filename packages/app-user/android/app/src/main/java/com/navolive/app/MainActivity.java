package com.navolive.app;

import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static Bundle pendingCallBundle = null;
    private static String pendingNotificationUrl = null;
    public static volatile boolean isCallActive = false;
    public static volatile boolean isPartyActive = false;
    public static volatile boolean isLiveActive = false;
    private PowerManager.WakeLock activityWakeLock = null;

    private void acquireActivityWakeLock() {
        if (activityWakeLock == null) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    activityWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "NavoLive:MainActivityWakeLock");
                    activityWakeLock.acquire(4 * 60 * 60 * 1000L);
                    Log.d(TAG, "MainActivity WakeLock acquired");
                }
            } catch (Throwable ignored) {}
        }
    }

    private void releaseActivityWakeLock() {
        if (activityWakeLock != null && activityWakeLock.isHeld()) {
            try {
                activityWakeLock.release();
                Log.d(TAG, "MainActivity WakeLock released");
            } catch (Throwable ignored) {}
            activityWakeLock = null;
        }
    }

    private View blackOverlayView = null;

    public void setScreenOffOverlay(boolean show) {
        runOnUiThread(() -> {
            try {
                WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
                if (wm == null) return;
                if (show) {
                    if (blackOverlayView == null) {
                        blackOverlayView = new View(this);
                        blackOverlayView.setBackgroundColor(0xFF000000);
                        blackOverlayView.setClickable(true);
                        blackOverlayView.setFocusable(true);
                        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                                WindowManager.LayoutParams.MATCH_PARENT,
                                WindowManager.LayoutParams.MATCH_PARENT,
                                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                                        ? WindowManager.LayoutParams.TYPE_APPLICATION_PANEL
                                        : WindowManager.LayoutParams.TYPE_APPLICATION,
                                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                                        | WindowManager.LayoutParams.FLAG_FULLSCREEN,
                                PixelFormat.OPAQUE
                        );
                        params.screenBrightness = 0.0f;
                        wm.addView(blackOverlayView, params);
                    }
                } else {
                    if (blackOverlayView != null) {
                        try {
                            wm.removeView(blackOverlayView);
                        } catch (Throwable ignored) {}
                        blackOverlayView = null;
                        WindowManager.LayoutParams lp = getWindow().getAttributes();
                        lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
                        getWindow().setAttributes(lp);
                    }
                }
            } catch (Throwable t) {
                Log.w(TAG, "setScreenOffOverlay error: " + t.getMessage());
            }
        });
    }

    public class NativeCallBridge {
        @android.webkit.JavascriptInterface
        public void startIncomingRingtone() {
            Log.d(TAG, "NativeCallBridge: startIncomingRingtone invoked from JavaScript");
            runOnUiThread(() -> CallRingtoneManager.startIncoming(MainActivity.this));
        }

        @android.webkit.JavascriptInterface
        public void startOutgoingRingtone() {
            Log.d(TAG, "NativeCallBridge: startOutgoingRingtone invoked from JavaScript");
            runOnUiThread(() -> CallRingtoneManager.startOutgoing(MainActivity.this));
        }

        @android.webkit.JavascriptInterface
        public void startRingtone(boolean isIncoming) {
            Log.d(TAG, "NativeCallBridge: startRingtone invoked from JavaScript, isIncoming=" + isIncoming);
            runOnUiThread(() -> {
                if (isIncoming) {
                    CallRingtoneManager.startIncoming(MainActivity.this);
                } else {
                    CallRingtoneManager.startOutgoing(MainActivity.this);
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void stopRingtone() {
            Log.d(TAG, "NativeCallBridge: stopRingtone invoked from JavaScript");
            runOnUiThread(() -> {
                CallRingtoneManager.stop();
                dismissCallNotification();
            });
        }

        @android.webkit.JavascriptInterface
        public void enableProximitySensor(boolean enable) {
            Log.d(TAG, "NativeCallBridge: enableProximitySensor: " + enable);
            runOnUiThread(() -> {
                if (enable) {
                    ProximitySensorManager.getInstance(MainActivity.this).start(false);
                } else {
                    ProximitySensorManager.getInstance(MainActivity.this).stop();
                    setScreenOffOverlay(false);
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void startOngoingCall(String callerName, String callType) {
            Log.d(TAG, "NativeCallBridge: startOngoingCall invoked: " + callerName + ", type=" + callType);
            runOnUiThread(() -> {
                isCallActive = true;
                if ("audio".equalsIgnoreCase(callType)) {
                    ProximitySensorManager.getInstance(MainActivity.this).start(false);
                }
                Intent intent = new Intent(MainActivity.this, OngoingCallService.class);
                intent.setAction(OngoingCallService.ACTION_START);
                intent.putExtra("callerName", callerName);
                intent.putExtra("callType", callType);
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(intent);
                    } else {
                        startService(intent);
                    }
                } catch (Throwable e) {
                    Log.w(TAG, "Could not start OngoingCallService: " + e.getMessage());
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void stopOngoingCall() {
            Log.d(TAG, "NativeCallBridge: stopOngoingCall invoked");
            runOnUiThread(() -> {
                isCallActive = false;
                ProximitySensorManager.getInstance(MainActivity.this).stop();
                setScreenOffOverlay(false);
                Intent intent = new Intent(MainActivity.this, OngoingCallService.class);
                intent.setAction(OngoingCallService.ACTION_STOP);
                try {
                    startService(intent);
                } catch (Throwable ignored) {}
            });
        }

        @android.webkit.JavascriptInterface
        public void startOngoingParty(String roomName) {
            Log.d(TAG, "NativeCallBridge: startOngoingParty invoked: " + roomName);
            runOnUiThread(() -> {
                isPartyActive = true;
                acquireActivityWakeLock();
                updatePictureInPictureParams(true);
                AudioRouteManager.getInstance(MainActivity.this).startLiveAudio();
                Intent intent = new Intent(MainActivity.this, OngoingCallService.class);
                intent.setAction(OngoingCallService.ACTION_START);
                intent.putExtra("callerName", roomName != null && !roomName.trim().isEmpty() ? roomName : "Party Room");
                intent.putExtra("callType", "party");
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(intent);
                    } else {
                        startService(intent);
                    }
                } catch (Throwable e) {
                    Log.w(TAG, "Could not start OngoingCallService for Party: " + e.getMessage());
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void stopOngoingParty() {
            Log.d(TAG, "NativeCallBridge: stopOngoingParty invoked");
            runOnUiThread(() -> {
                isPartyActive = false;
                if (!isCallActive && !isLiveActive) {
                    releaseActivityWakeLock();
                }
                updatePictureInPictureParams(false);
                AudioRouteManager.getInstance(MainActivity.this).stopLiveAudio();
                Intent intent = new Intent(MainActivity.this, OngoingCallService.class);
                intent.setAction(OngoingCallService.ACTION_STOP);
                try {
                    startService(intent);
                } catch (Throwable ignored) {}
            });
        }

        @android.webkit.JavascriptInterface
        public void startLiveAudio() {
            startLiveAudioWithTitle("Live Stream");
        }

        @android.webkit.JavascriptInterface
        public void startLiveAudioWithTitle(String title) {
            Log.d(TAG, "NativeCallBridge: startLiveAudio invoked: " + title);
            runOnUiThread(() -> {
                isLiveActive = true;
                updatePictureInPictureParams(true);
                keepScreenOn(true);
                AudioRouteManager.getInstance(MainActivity.this).startLiveAudio();
                Intent intent = new Intent(MainActivity.this, OngoingCallService.class);
                intent.setAction(OngoingCallService.ACTION_START);
                intent.putExtra("callerName", title != null && !title.trim().isEmpty() ? title : "Live Stream");
                intent.putExtra("callType", "live");
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(intent);
                    } else {
                        startService(intent);
                    }
                } catch (Throwable e) {
                    Log.w(TAG, "Could not start OngoingCallService for Live: " + e.getMessage());
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void stopLiveAudio() {
            Log.d(TAG, "NativeCallBridge: stopLiveAudio invoked");
            runOnUiThread(() -> {
                isLiveActive = false;
                updatePictureInPictureParams(false);
                keepScreenOn(false);
                AudioRouteManager.getInstance(MainActivity.this).stopLiveAudio();
                Intent intent = new Intent(MainActivity.this, OngoingCallService.class);
                intent.setAction(OngoingCallService.ACTION_STOP);
                try {
                    startService(intent);
                } catch (Throwable ignored) {}
            });
        }

        @android.webkit.JavascriptInterface
        public void setLiveActive(boolean active) {
            Log.d(TAG, "NativeCallBridge: setLiveActive invoked: " + active);
            runOnUiThread(() -> {
                if (active) {
                    startLiveAudio();
                } else {
                    stopLiveAudio();
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void routeAudioToSpeaker() {
            Log.d(TAG, "NativeCallBridge: routeAudioToSpeaker invoked");
            runOnUiThread(() -> AudioRouteManager.getInstance(MainActivity.this).applyAudioRouting(true));
        }

        @android.webkit.JavascriptInterface
        public void setSpeakerphone(boolean on) {
            Log.d(TAG, "NativeCallBridge: setSpeakerphone invoked: " + on);
            runOnUiThread(() -> {
                AudioRouteManager.getInstance(MainActivity.this).setSpeakerphone(on);
                ProximitySensorManager.getInstance(MainActivity.this).setSpeakerphone(on);
            });
        }

        @android.webkit.JavascriptInterface
        public void enterPipMode() {
            Log.d(TAG, "NativeCallBridge: enterPipMode invoked from JS");
            runOnUiThread(MainActivity.this::enterPictureInPicture);
        }

        @android.webkit.JavascriptInterface
        public String getPendingNotificationUrl() {
            String url = pendingNotificationUrl;
            pendingNotificationUrl = null;
            Log.d(TAG, "NativeCallBridge: getPendingNotificationUrl returned: " + url);
            return url != null ? url : "";
        }
    }

    private void attachBridgeInterface() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new NativeCallBridge(), "NevoNativeBridge");
                Log.d(TAG, "NevoNativeBridge attached to WebView successfully");
            }
        } catch (Throwable e) {
            Log.w(TAG, "Could not attach NevoNativeBridge: " + e.getMessage());
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleWindowFlags();

        // Register Javascript interface to allow WebView to control ringtone & read deep links
        attachBridgeInterface();

        if (getBridge() != null && getBridge().getWebView() != null) {
            try {
                android.webkit.WebSettings ws = getBridge().getWebView().getSettings();
                ws.setMediaPlaybackRequiresUserGesture(false);
            } catch (Throwable ignored) {}
        }

        IntentFilter screenFilter = new IntentFilter();
        screenFilter.addAction(Intent.ACTION_SCREEN_OFF);
        screenFilter.addAction(Intent.ACTION_SCREEN_ON);
        registerReceiver(screenStateReceiver, screenFilter);

        ProximitySensorManager.getInstance(this).setListener(isNear -> {
            setScreenOffOverlay(isNear);
            dispatchJs(String.format("try { window.dispatchEvent(new CustomEvent('proximityStateChange', { detail: { isNear: %b } })); } catch (e) {}", isNear));
        });

        handleIntent(getIntent());

        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                if (task.isSuccessful() && task.getResult() != null) {
                    String token = task.getResult();
                    Log.d(TAG, "Native FCM Token fetched: " + token);
                    getSharedPreferences("nevo_push", MODE_PRIVATE).edit().putString("fcm_token", token).apply();
                    String js = String.format("window.dispatchEvent(new CustomEvent('nativeFcmToken', { detail: { token: '%s' } }));", token);
                    dispatchJs(js);
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().postDelayed(() -> dispatchJs(js), 800);
                        getBridge().getWebView().postDelayed(() -> dispatchJs(js), 2000);
                    }
                }
            });
        } catch (Exception e) {
            Log.w(TAG, "Error fetching native FCM token: " + e.getMessage());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        attachBridgeInterface();
    }

    @Override
    public void onPause() {
        super.onPause();
        attachBridgeInterface();
        if ((isCallActive || isLiveActive || isPartyActive) && getBridge() != null && getBridge().getWebView() != null) {
            try {
                // Keep WebView active during background call, live, or party so WebRTC audio capturing and video playback stay uninterrupted
                getBridge().getWebView().onResume();
                getBridge().getWebView().resumeTimers();
            } catch (Throwable ignored) {}
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if ((isCallActive || isLiveActive || isPartyActive) && getBridge() != null && getBridge().getWebView() != null) {
            try {
                getBridge().getWebView().onResume();
                getBridge().getWebView().resumeTimers();
            } catch (Throwable ignored) {}
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWindowFlags();
        handleIntent(intent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        CallRingtoneManager.stop();
        ProximitySensorManager.getInstance(this).stop();
        setScreenOffOverlay(false);
        releaseActivityWakeLock();
        if (isCallActive) {
            isCallActive = false;
            try {
                Intent intent = new Intent(this, OngoingCallService.class);
                intent.setAction(OngoingCallService.ACTION_STOP);
                startService(intent);
            } catch (Throwable ignored) {}
        }
        try {
            unregisterReceiver(screenStateReceiver);
        } catch (Throwable ignored) {}
        if (isLiveActive) {
            isLiveActive = false;
            try {
                Intent intent = new Intent(this, OngoingCallService.class);
                intent.setAction(OngoingCallService.ACTION_STOP);
                startService(intent);
            } catch (Throwable ignored) {}
            try {
                AudioRouteManager.getInstance(this).stopLiveAudio();
            } catch (Throwable ignored) {}
        }
    }

    public void keepScreenOn(boolean keep) {
        runOnUiThread(() -> {
            try {
                if (keep) {
                    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } else {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            } catch (Throwable ignored) {}
        });
    }

    private final BroadcastReceiver screenStateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null) return;
            String action = intent.getAction();
            Log.d(TAG, "screenStateReceiver action: " + action);
            if (Intent.ACTION_SCREEN_OFF.equals(action) || Intent.ACTION_SCREEN_ON.equals(action)) {
                if ((isLiveActive || isPartyActive || isCallActive) && getBridge() != null && getBridge().getWebView() != null) {
                    acquireActivityWakeLock();
                    runOnUiThread(() -> {
                        try {
                            getBridge().getWebView().onResume();
                            getBridge().getWebView().resumeTimers();
                        } catch (Throwable ignored) {}
                        try {
                            AudioRouteManager.getInstance(MainActivity.this).applyAudioRouting(true);
                        } catch (Throwable ignored) {}
                        boolean isScreenOff = Intent.ACTION_SCREEN_OFF.equals(action);
                        dispatchJs("try { " +
                                "window.dispatchEvent(new CustomEvent('nativeScreenOff', { detail: { isScreenOff: " + isScreenOff + " } })); " +
                                "if (typeof AgoraRTC !== 'undefined' && AgoraRTC.audioContext && AgoraRTC.audioContext.state === 'suspended') { " +
                                "  AgoraRTC.audioContext.resume(); " +
                                "} " +
                                "} catch (e) {}");
                    });
                }
            }
        }
    };

    private void handleWindowFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null && keyguardManager.isKeyguardLocked()) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                            | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                            | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        handleCallIntent(intent);
        handleNotificationTapIntent(intent);
    }

    private void handleCallIntent(Intent intent) {
        if (intent == null) return;

        boolean isIncomingCall = intent.getBooleanExtra("isIncomingCall", false);
        String action = intent.getAction();
        if (isIncomingCall || "com.navolive.app.ACCEPT_CALL".equals(action)) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                pendingCallBundle = bundle;
            }

            boolean autoAccept = "accept".equals(intent.getStringExtra("callAction")) ||
                                 "com.navolive.app.ACCEPT_CALL".equals(action);

            // If user explicitly tapped Accept from notification button, stop ringtone and dismiss notification immediately
            if (autoAccept) {
                CallRingtoneManager.stop();
                dismissCallNotification();
            }

            dispatchPendingCallToWebView();
        }
    }

    private void dismissCallNotification() {
        try {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(NevoFirebaseMessagingService.CALL_NOTIFICATION_ID);
            }
        } catch (Throwable ignored) {}
    }

    private void handleNotificationTapIntent(Intent intent) {
        if (intent == null) return;
        String targetUrl = intent.getStringExtra("targetUrl");
        String chatId = intent.getStringExtra("chatId");
        String streamId = intent.getStringExtra("streamId");
        String roomId = intent.getStringExtra("roomId");
        String senderId = intent.getStringExtra("senderId");
        String type = intent.getStringExtra("type");
        String role = intent.getStringExtra("role");
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");

        if (targetUrl == null || targetUrl.isEmpty()) {
            if (chatId != null && !chatId.isEmpty()) {
                targetUrl = "/chat/" + chatId;
            } else if (streamId != null && !streamId.isEmpty()) {
                targetUrl = "/live/" + streamId;
            } else if (roomId != null && !roomId.isEmpty()) {
                targetUrl = "/party/" + roomId;
            } else if (senderId != null && !senderId.isEmpty()) {
                targetUrl = "/user/" + senderId;
            } else if ("withdrawal".equalsIgnoreCase(type)) {
                boolean isAgentReq = "agent".equalsIgnoreCase(role) ||
                        (title != null && title.toLowerCase().contains("request")) ||
                        (body != null && body.toLowerCase().contains("requested"));
                targetUrl = isAgentReq ? "/agent/requests?tab=withdraw" : "/withdraw";
            } else if ("recharge".equalsIgnoreCase(type)) {
                boolean isAgentReq = "agent".equalsIgnoreCase(role) ||
                        (title != null && title.toLowerCase().contains("request")) ||
                        (body != null && body.toLowerCase().contains("requested"));
                targetUrl = isAgentReq ? "/agent/requests?tab=recharge" : "/wallet";
            } else if ("gift".equalsIgnoreCase(type) || "coin_received".equalsIgnoreCase(type) || "coin_transfer".equalsIgnoreCase(type)) {
                targetUrl = "/wallet";
            } else if (type != null && type.startsWith("agency")) {
                targetUrl = "/my-agency";
            } else if ("system".equalsIgnoreCase(type)) {
                targetUrl = "/official-notifications";
            }
        }

        if (targetUrl != null && !targetUrl.isEmpty()) {
            pendingNotificationUrl = targetUrl;
            final String url = targetUrl;
            final String notifType = type != null ? type : "";
            Log.d(TAG, "Notification tap received. Target URL: " + url + ", Type: " + notifType);

            // Set both in window, localStorage, and fire custom event
            String js = String.format(
                    "try {" +
                    "  window.__PENDING_NOTIFICATION_URL__ = '%s';" +
                    "  localStorage.setItem('nevo_pending_tap_url', '%s');" +
                    "  window.dispatchEvent(new CustomEvent('nativeNotificationTap', { detail: { targetUrl: '%s', type: '%s' } }));" +
                    "} catch (e) { console.warn('Tap dispatch error', e); }",
                    url.replace("'", "\\'"),
                    url.replace("'", "\\'"),
                    url.replace("'", "\\'"),
                    notifType.replace("'", "\\'")
            );

            dispatchJs(js);
            if (getBridge() != null && getBridge().getWebView() != null) {
                // Multi-stage retry for cold start timing
                getBridge().getWebView().postDelayed(() -> dispatchJs(js), 300);
                getBridge().getWebView().postDelayed(() -> dispatchJs(js), 800);
                getBridge().getWebView().postDelayed(() -> dispatchJs(js), 1500);
                getBridge().getWebView().postDelayed(() -> dispatchJs(js), 2500);
                getBridge().getWebView().postDelayed(() -> dispatchJs(js), 3500);
            }
        }
    }

    private void dispatchPendingCallToWebView() {
        if (pendingCallBundle == null) return;

        String callId = pendingCallBundle.getString("callId", "");
        String channel = pendingCallBundle.getString("channel", "");
        String callType = pendingCallBundle.getString("callType", "audio");
        String initiatorName = pendingCallBundle.getString("initiatorName", "Someone");
        String initiatorAvatar = pendingCallBundle.getString("initiatorAvatar", "");
        String token = pendingCallBundle.getString("token", "");
        String coinsPerMinute = pendingCallBundle.getString("coinsPerMinute", "0");
        String action = pendingCallBundle.getString("callAction", "");
        boolean autoAccept = "accept".equals(action) || "com.navolive.app.ACCEPT_CALL".equals(action);

        String js = String.format(
                "try {" +
                "  window.dispatchEvent(new CustomEvent('nativeIncomingCall', { detail: { callId: '%s', channel: '%s', type: '%s', initiatorName: '%s', initiatorAvatar: '%s', token: '%s', coinsPerMinute: %s, autoAccept: %b } }));" +
                "} catch (e) { console.warn('Incoming call dispatch error', e); }",
                callId, channel, callType,
                initiatorName.replace("'", "\\'"),
                initiatorAvatar.replace("'", "\\'"),
                token,
                coinsPerMinute != null && !coinsPerMinute.isEmpty() ? coinsPerMinute : "0",
                autoAccept
        );

        // Attempt dispatch immediately, and retry for cold start timing
        dispatchJs(js);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(() -> dispatchJs(js), 300);
            getBridge().getWebView().postDelayed(() -> dispatchJs(js), 800);
            getBridge().getWebView().postDelayed(() -> dispatchJs(js), 1500);
            getBridge().getWebView().postDelayed(() -> dispatchJs(js), 2500);
        }

        // Clean up pending bundle to prevent duplicate/stale call triggers
        pendingCallBundle = null;
        if (getIntent() != null) {
            getIntent().removeExtra("isIncomingCall");
            getIntent().removeExtra("callAction");
        }
    }

    private void dispatchJs(String js) {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        } catch (Exception e) {
            Log.w(TAG, "Error evaluating JS: " + e.getMessage());
        }
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (isPartyActive || isCallActive || isLiveActive) {
            enterPictureInPicture();
        }
    }

    public void updatePictureInPictureParams(boolean active) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                android.app.PictureInPictureParams.Builder builder = new android.app.PictureInPictureParams.Builder();
                android.util.Rational aspectRatio = new android.util.Rational(9, 16);
                builder.setAspectRatio(aspectRatio);
                builder.setAutoEnterEnabled(active);
                setPictureInPictureParams(builder.build());
            } catch (Throwable ignored) {}
        }
    }

    public void enterPictureInPicture() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                android.app.PictureInPictureParams.Builder builder = new android.app.PictureInPictureParams.Builder();
                android.util.Rational aspectRatio = new android.util.Rational(9, 16);
                builder.setAspectRatio(aspectRatio);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    builder.setAutoEnterEnabled(true);
                }
                enterPictureInPictureMode(builder.build());
            } catch (Throwable e) {
                try {
                    enterPictureInPictureMode();
                } catch (Throwable ex) {
                    Log.w(TAG, "enterPictureInPictureMode error: " + ex.getMessage());
                }
            }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, android.content.res.Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        String js = String.format("try { window.dispatchEvent(new CustomEvent('android:pip-changed', { detail: { isInPip: %b } })); } catch(e){}", isInPictureInPictureMode);
        dispatchJs(js);
    }
}
