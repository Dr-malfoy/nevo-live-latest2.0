package com.nevolive.app;

import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static Bundle pendingCallBundle = null;
    private static String pendingNotificationUrl = null;

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
    }

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
        if (isIncomingCall || "com.nevolive.app.ACCEPT_CALL".equals(action)) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                pendingCallBundle = bundle;
            }

            boolean autoAccept = "accept".equals(intent.getStringExtra("callAction")) ||
                                 "com.nevolive.app.ACCEPT_CALL".equals(action);

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
        boolean autoAccept = "accept".equals(action) || "com.nevolive.app.ACCEPT_CALL".equals(action);

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
}
