package com.dolarblue

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class WidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetModule"

    @ReactMethod
    fun updateWidget(data: ReadableMap) {
        val context: Context = reactApplicationContext
        val prefs = context.getSharedPreferences(WidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)

        prefs.edit().apply {
            putString(WidgetProvider.KEY_SLOT1_TITLE, data.getString("slot1Title"))
            putString(WidgetProvider.KEY_SLOT1_BUY, data.getString("slot1Buy"))
            putString(WidgetProvider.KEY_SLOT1_SELL, data.getString("slot1Sell"))
            putString(WidgetProvider.KEY_SLOT1_PCT, data.getString("slot1Pct"))
            putBoolean(
                WidgetProvider.KEY_SLOT2_VISIBLE,
                !data.hasKey("slot2Visible") || data.getBoolean("slot2Visible"),
            )
            putString(WidgetProvider.KEY_SLOT2_TITLE, data.getString("slot2Title"))
            putString(WidgetProvider.KEY_SLOT2_BUY, data.getString("slot2Buy"))
            putString(WidgetProvider.KEY_SLOT2_SELL, data.getString("slot2Sell"))
            putString(WidgetProvider.KEY_SLOT2_PCT, data.getString("slot2Pct"))
            apply()
        }

        // Перерисовываем все экземпляры виджета
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, WidgetProvider::class.java))
        val provider = WidgetProvider()
        for (id in ids) {
            provider.renderWidget(context, manager, id)
        }
    }
}
