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

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleWindowFlags();
        handleCallIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWindowFlags();
        handleCallIntent(intent);
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

    private void handleCallIntent(Intent intent) {
        if (intent == null) return;

        boolean isIncomingCall = intent.getBooleanExtra("isIncomingCall", false);
        String action = intent.getAction();
        if (isIncomingCall || "com.nevolive.app.ACCEPT_CALL".equals(action)) {
            String callId = intent.getStringExtra("callId");
            String channel = intent.getStringExtra("channel");
            String callType = intent.getStringExtra("callType");
            String initiatorName = intent.getStringExtra("initiatorName");
            String initiatorAvatar = intent.getStringExtra("initiatorAvatar");
            String token = intent.getStringExtra("token");
            String coinsPerMinute = intent.getStringExtra("coinsPerMinute");
            boolean autoAccept = "accept".equals(intent.getStringExtra("callAction")) || "com.nevolive.app.ACCEPT_CALL".equals(action);

            Log.d(TAG, "Incoming call intent received: callId=" + callId + ", autoAccept=" + autoAccept);

            // Dismiss system notification since user is now in the app
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(NevoFirebaseMessagingService.CALL_NOTIFICATION_ID);
            }

            // Post event to WebView once bridge is ready
            if (getBridge() != null && getBridge().getWebView() != null) {
                String js = String.format(
                        "window.dispatchEvent(new CustomEvent('nativeIncomingCall', { detail: { callId: '%s', channel: '%s', type: '%s', initiatorName: '%s', initiatorAvatar: '%s', token: '%s', coinsPerMinute: %s, autoAccept: %b } }));",
                        callId != null ? callId : "",
                        channel != null ? channel : "",
                        callType != null ? callType : "audio",
                        initiatorName != null ? initiatorName.replace("'", "\\'") : "Someone",
                        initiatorAvatar != null ? initiatorAvatar.replace("'", "\\'") : "",
                        token != null ? token : "",
                        coinsPerMinute != null && !coinsPerMinute.isEmpty() ? coinsPerMinute : "0",
                        autoAccept
                );
                getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));
            }
        }
    }
}
