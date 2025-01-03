package com.dolarblue

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.dolarblue.WidgetProvider

class WidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WidgetModule"
    }

    @ReactMethod
    fun updateWidget(data: String) {
        val context: Context = reactApplicationContext
        val intent = Intent(context, WidgetProvider::class.java).apply {
            action = WidgetProvider.ACTION_UPDATE_WIDGET
            putExtra(WidgetProvider.EXTRA_WIDGET_TEXT, data)
        }
        context.sendBroadcast(intent)
    }
}
