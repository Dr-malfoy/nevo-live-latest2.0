package com.nevolive.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class IncomingCallActionReceiver extends BroadcastReceiver {
    private static final String TAG = "CallActionReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String callId = intent.getStringExtra("callId");
        Log.d(TAG, "Received call action: " + action + " for callId: " + callId);

        if ("com.nevolive.app.DECLINE_CALL".equals(action)) {
            // Dismiss notification immediately
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(NevoFirebaseMessagingService.CALL_NOTIFICATION_ID);
            }
        }
    }
}
