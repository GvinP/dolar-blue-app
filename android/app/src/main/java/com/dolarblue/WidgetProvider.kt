package com.dolarblue

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews

class WidgetProvider : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "DolarBlueWidget"
        const val KEY_SLOT1_TITLE = "slot1_title"
        const val KEY_SLOT1_BUY = "slot1_buy"
        const val KEY_SLOT1_SELL = "slot1_sell"
        const val KEY_SLOT1_PCT = "slot1_pct"
        const val KEY_SLOT2_VISIBLE = "slot2_visible"
        const val KEY_SLOT2_TITLE = "slot2_title"
        const val KEY_SLOT2_BUY = "slot2_buy"
        const val KEY_SLOT2_SELL = "slot2_sell"
        const val KEY_SLOT2_PCT = "slot2_pct"

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

        // Slot 1 (siempre visible)
        views.setTextViewText(R.id.slot1_title, prefs.getString(KEY_SLOT1_TITLE, "") ?: "")
        views.setTextViewText(R.id.slot1_compra, prefs.getString(KEY_SLOT1_BUY, "–") ?: "–")
        views.setTextViewText(R.id.slot1_venta, prefs.getString(KEY_SLOT1_SELL, "–") ?: "–")
        val slot1Pct = prefs.getString(KEY_SLOT1_PCT, "") ?: ""
        views.setTextViewText(R.id.slot1_porcentaje, slot1Pct)
        views.setTextColor(R.id.slot1_porcentaje, pctColor(slot1Pct))

        // Slot 2 (configurable desde Ajustes; oculto si el usuario no eligió un segundo curso)
        val slot2Visible = prefs.getBoolean(KEY_SLOT2_VISIBLE, true)
        val slot2Visibility = if (slot2Visible) View.VISIBLE else View.GONE
        views.setViewVisibility(R.id.slot2_separator, slot2Visibility)
        views.setViewVisibility(R.id.slot2_block, slot2Visibility)
        if (slot2Visible) {
            views.setTextViewText(R.id.slot2_title, prefs.getString(KEY_SLOT2_TITLE, "") ?: "")
            views.setTextViewText(R.id.slot2_compra, prefs.getString(KEY_SLOT2_BUY, "–") ?: "–")
            views.setTextViewText(R.id.slot2_venta, prefs.getString(KEY_SLOT2_SELL, "–") ?: "–")
            val slot2Pct = prefs.getString(KEY_SLOT2_PCT, "") ?: ""
            views.setTextViewText(R.id.slot2_porcentaje, slot2Pct)
            views.setTextColor(R.id.slot2_porcentaje, pctColor(slot2Pct))
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
