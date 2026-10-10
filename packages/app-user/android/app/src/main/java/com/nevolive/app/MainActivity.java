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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleWindowFlags();
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
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWindowFlags();
        handleIntent(intent);
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

            // Dismiss system notification since user is entering the app
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(NevoFirebaseMessagingService.CALL_NOTIFICATION_ID);
            }

            dispatchPendingCallToWebView();
        }
    }

    private void handleNotificationTapIntent(Intent intent) {
        if (intent == null) return;
        String targetUrl = intent.getStringExtra("targetUrl");
        String chatId = intent.getStringExtra("chatId");
        String streamId = intent.getStringExtra("streamId");
        String senderId = intent.getStringExtra("senderId");
        String type = intent.getStringExtra("type");

        if (targetUrl == null || targetUrl.isEmpty()) {
            if (chatId != null && !chatId.isEmpty()) {
                targetUrl = "/chat/" + chatId;
            } else if (streamId != null && !streamId.isEmpty()) {
                targetUrl = "/stream/" + streamId;
            } else if (senderId != null && !senderId.isEmpty()) {
                targetUrl = "/user/" + senderId;
            }
        }

        if (targetUrl != null && !targetUrl.isEmpty()) {
            final String url = targetUrl;
            final String notifType = type != null ? type : "";
            String js = String.format(
                    "window.dispatchEvent(new CustomEvent('nativeNotificationTap', { detail: { targetUrl: '%s', type: '%s' } }));",
                    url.replace("'", "\\'"),
                    notifType.replace("'", "\\'")
            );
            dispatchJs(js);
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().postDelayed(() -> dispatchJs(js), 600);
                getBridge().getWebView().postDelayed(() -> dispatchJs(js), 1500);
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
                "window.dispatchEvent(new CustomEvent('nativeIncomingCall', { detail: { callId: '%s', channel: '%s', type: '%s', initiatorName: '%s', initiatorAvatar: '%s', token: '%s', coinsPerMinute: %s, autoAccept: %b } }));",
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
            getBridge().getWebView().postDelayed(() -> dispatchJs(js), 500);
            getBridge().getWebView().postDelayed(() -> dispatchJs(js), 1200);
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
