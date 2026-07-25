package com.dolarblue

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews

class WidgetProvider : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "DolarBlueWidget"
        const val KEY_BLUE_BUY = "blue_buy"
        const val KEY_BLUE_SELL = "blue_sell"
        const val KEY_BLUE_PCT = "blue_pct"
        const val KEY_OFICIAL_BUY = "oficial_buy"
        const val KEY_OFICIAL_SELL = "oficial_sell"
        const val KEY_OFICIAL_PCT = "oficial_pct"

        private const val COLOR_POSITIVE = "#00ff83" // mismo verde que en HomeScreen
        private const val COLOR_NEGATIVE = "#af2030" // mismo rojo que en HomeScreen
        private const val COLOR_NEUTRAL = "#808080"  // gris ya usado para texto secundario del widget

        private fun pctColor(pct: String): Int {
            val value = pct.trim().trimEnd('%').replace(',', '.').toDoubleOrNull()
            return Color.parseColor(
                when {
                    value == null || value == 0.0 -> COLOR_NEUTRAL
                    value > 0 -> COLOR_POSITIVE
                    else -> COLOR_NEGATIVE
                },
            )
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
    }

    fun renderWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // Tap anywhere → open app
        val openApp = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.widget_root, openApp)
        views.setOnClickPendingIntent(R.id.refresh_button, openApp)

        // Blue
        val bluePct = prefs.getString(KEY_BLUE_PCT, "") ?: ""
        views.setTextViewText(R.id.blue_compra, prefs.getString(KEY_BLUE_BUY, "–") ?: "–")
        views.setTextViewText(R.id.blue_venta, prefs.getString(KEY_BLUE_SELL, "–") ?: "–")
        views.setTextViewText(R.id.blue_porcentaje, bluePct)
        views.setTextColor(R.id.blue_porcentaje, pctColor(bluePct))

        // Oficial
        val oficialPct = prefs.getString(KEY_OFICIAL_PCT, "") ?: ""
        views.setTextViewText(R.id.oficial_compra, prefs.getString(KEY_OFICIAL_BUY, "–") ?: "–")
        views.setTextViewText(R.id.oficial_venta, prefs.getString(KEY_OFICIAL_SELL, "–") ?: "–")
        views.setTextViewText(R.id.oficial_porcentaje, oficialPct)
        views.setTextColor(R.id.oficial_porcentaje, pctColor(oficialPct))

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
