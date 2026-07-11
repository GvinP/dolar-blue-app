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
            putString(WidgetProvider.KEY_BLUE_BUY, data.getString("blueBuy"))
            putString(WidgetProvider.KEY_BLUE_SELL, data.getString("blueSell"))
            putString(WidgetProvider.KEY_BLUE_PCT, data.getString("bluePct"))
            putString(WidgetProvider.KEY_OFICIAL_BUY, data.getString("oficialBuy"))
            putString(WidgetProvider.KEY_OFICIAL_SELL, data.getString("oficialSell"))
            putString(WidgetProvider.KEY_OFICIAL_PCT, data.getString("oficialPct"))
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
