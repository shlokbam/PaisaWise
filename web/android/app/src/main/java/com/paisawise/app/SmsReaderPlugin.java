package com.paisawise.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_SMS }, alias = "readSms"),
        @Permission(strings = { Manifest.permission.RECEIVE_SMS }, alias = "receiveSms")
    }
)
public class SmsReaderPlugin extends Plugin {

    private static final String PREFS_NAME = "PaisaWiseSMS";
    private static final String KEY_LAST_SYNC = "last_synced_timestamp";

    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(), Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS)
                == PackageManager.PERMISSION_GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("readSms", call, "smsPermissionCallback");
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(), Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED;

        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void readAllSms(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("SMS permission not granted");
            return;
        }

        int maxMessages = call.getInt("maxMessages", 500);
        long sinceTimestamp = call.getLong("sinceTimestamp", 0L);
        long untilTimestamp = call.getLong("untilTimestamp", 0L);
        JSArray messages = new JSArray();

        try {
            Uri smsUri = Uri.parse("content://sms/inbox");
            String[] projection = {"_id", "address", "body", "date"};
            String sortOrder = "date DESC";

            String selection = null;
            String[] selectionArgs = null;

            if (sinceTimestamp > 0 && untilTimestamp > 0) {
                selection = "date >= ? AND date <= ?";
                selectionArgs = new String[]{ String.valueOf(sinceTimestamp), String.valueOf(untilTimestamp) };
            } else if (sinceTimestamp > 0) {
                selection = "date >= ?";
                selectionArgs = new String[]{ String.valueOf(sinceTimestamp) };
            } else if (untilTimestamp > 0) {
                selection = "date <= ?";
                selectionArgs = new String[]{ String.valueOf(untilTimestamp) };
            }

            Cursor cursor = getContext().getContentResolver().query(
                smsUri, projection, selection, selectionArgs, sortOrder
            );

            if (cursor != null) {
                int count = 0;
                while (cursor.moveToNext() && count < maxMessages) {
                    String id = cursor.getString(cursor.getColumnIndexOrThrow("_id"));
                    String address = cursor.getString(cursor.getColumnIndexOrThrow("address"));
                    String body = cursor.getString(cursor.getColumnIndexOrThrow("body"));
                    long date = cursor.getLong(cursor.getColumnIndexOrThrow("date"));

                    JSObject msg = new JSObject();
                    msg.put("id", id);
                    msg.put("sender", address != null ? address : "");
                    msg.put("body", body != null ? body : "");
                    msg.put("date", date);
                    messages.put(msg);
                    count++;
                }
                cursor.close();
            }
        } catch (Exception e) {
            call.reject("Failed to read SMS: " + e.getMessage());
            return;
        }

        JSObject result = new JSObject();
        result.put("messages", messages);
        call.resolve(result);
    }

    @PluginMethod
    public void getLastSyncTime(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long lastSynced = prefs.getLong(KEY_LAST_SYNC, 0L);
        JSObject result = new JSObject();
        result.put("lastSyncedTimestamp", lastSynced);
        call.resolve(result);
    }

    @PluginMethod
    public void setLastSyncTime(PluginCall call) {
        long timestamp = call.getLong("timestamp", System.currentTimeMillis());
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putLong(KEY_LAST_SYNC, timestamp).apply();
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        call.resolve();
    }
}
