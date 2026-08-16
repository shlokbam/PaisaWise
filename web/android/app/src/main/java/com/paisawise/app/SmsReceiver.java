package com.paisawise.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

public class SmsReceiver extends BroadcastReceiver {

    private static final String TAG = "PaisaWiseSmsReceiver";
    private static final String CHANNEL_ID = "paisawise_sms_channel";
    private static final int NOTIFICATION_ID = 88102;

    private static final String[] BANK_SENDERS = {
        "HDFCBK", "HDFCBANK", "SBIBNK", "SBIPSG", "ICICIB", "ICICIBK",
        "AXISBK", "KOTAKB", "INDBNK", "PNBSMS", "BOIIND", "CANBNK",
        "YESBNK", "IDBIBK", "FEDBK",  "SCBANK", "RBLBNK", "UCOBNK",
        "PAYTM",  "GPAY",   "PHONEPE","AMAZON", "FLIPKRT", "BARODA", "BOBSMS", "BOB"
    };

    private static final String[] FINANCIAL_KEYWORDS = {
        "DEBITED", "CREDITED", "DEBIT", "CREDIT", "DR.", "DR ", "CR.", "CR ",
        "SENT", "RECEIVED", "PAID", "PAYMENT", "UPI", "NEFT", "IMPS", "RTGS",
        "RS.", "INR", "A/C", "AMT"
    };

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        try {
            Object[] pdus = (Object[]) bundle.get("pdus");
            String format = bundle.getString("format");

            if (pdus != null) {
                for (Object pdu : pdus) {
                    SmsMessage smsMessage;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                    } else {
                        smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                    }

                    if (smsMessage != null) {
                        String sender = smsMessage.getDisplayOriginatingAddress();
                        String body = smsMessage.getMessageBody();
                        long date = smsMessage.getTimestampMillis();

                        if (isFinancialBankSms(sender, body)) {
                            Log.d(TAG, "Financial SMS detected from: " + sender);
                            ingestSmsInBackground(context, sender, body, date);
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error receiving SMS: " + e.getMessage(), e);
        }
    }

    private boolean isFinancialBankSms(String sender, String body) {
        if (sender == null || body == null) return false;
        String senderUpper = sender.toUpperCase(Locale.ROOT);
        String bodyUpper = body.toUpperCase(Locale.ROOT);

        boolean isBank = false;
        for (String b : BANK_SENDERS) {
            if (senderUpper.contains(b)) {
                isBank = true;
                break;
            }
        }

        boolean hasKeyword = false;
        for (String k : FINANCIAL_KEYWORDS) {
            if (bodyUpper.contains(k)) {
                hasKeyword = true;
                break;
            }
        }

        return isBank || hasKeyword;
    }

    private void ingestSmsInBackground(Context context, String sender, String body, long date) {
        new Thread(() -> {
            try {
                // Default server URL — update if custom configured
                String serverUrl = "http://192.168.1.6:8000/api/v1/mobile/ingest";
                
                URL url = new URL(serverUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; utf-8");
                conn.setRequestProperty("Accept", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(30000); // 30 seconds for Render cold starts
                conn.setReadTimeout(30000);

                JSONObject jsonParam = new JSONObject();
                jsonParam.put("sender", sender != null ? sender : "");
                jsonParam.put("body", body != null ? body : "");
                jsonParam.put("date", date);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = jsonParam.toString().getBytes("utf-8");
                    os.write(input, 0, input.length);
                }

                int code = conn.getResponseCode();
                Log.d(TAG, "Ingest HTTP response code: " + code);

                if (code >= 200 && code < 300) {
                    // Save timestamp in SharedPreferences
                    SharedPreferences prefs = context.getSharedPreferences("PaisaWiseSMS", Context.MODE_PRIVATE);
                    prefs.edit().putLong("last_synced_timestamp", System.currentTimeMillis()).apply();

                    // Show notification on phone
                    showSyncNotification(context, "New bank transaction automatically logged!");
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Failed to send SMS to backend: " + e.getMessage());
            }
        }).start();
    }

    private void showSyncNotification(Context context, String messageText) {
        try {
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "PaisaWise Real-Time SMS Sync",
                    NotificationManager.IMPORTANCE_DEFAULT
                );
                channel.setDescription("Notifications for real-time bank SMS transaction sync");
                notificationManager.createNotificationChannel(channel);
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_upload_done)
                .setContentTitle("PaisaWise Auto-Sync")
                .setContentText(messageText)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true);

            notificationManager.notify(NOTIFICATION_ID, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Notification error: " + e.getMessage());
        }
    }
}
