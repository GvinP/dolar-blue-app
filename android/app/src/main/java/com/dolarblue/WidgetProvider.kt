package com.dolarblue

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
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
        const val KEY_UPDATED_AT = "updated_at"

        /** widget.ts manda esto cuando la cotización no tiene ese lado (p.ej. tarjeta). */
        private const val EMPTY_VALUE = "–"

        private fun String?.orAbsent(): String? =
            this?.trim()?.takeIf { it.isNotEmpty() && it != EMPTY_VALUE }

        private fun formatUpdatedAt(updatedAt: Long): String {
            if (updatedAt <= 0L) return ""
            val minutes = (System.currentTimeMillis() - updatedAt) / 60_000
            return when {
                minutes < 1 -> "Actualizado ahora"
                minutes < 60 -> "Actualizado hace ${minutes}m"
                else -> "Actualizado hace ${minutes / 60}h"
            }
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

        // Tap en cualquier lugar del widget → abre la app
        val openApp = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.widget_root, openApp)

        // Botón ⟳ → dispara la headless task "WidgetRefresh" en background, sin abrir la app
        val refresh = PendingIntent.getService(
            context, 1,
            Intent(context, WidgetRefreshTaskService::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.refresh_button, refresh)

        // Slot 1 (siempre visible)
        views.setTextViewText(R.id.slot1_title, prefs.getString(KEY_SLOT1_TITLE, "") ?: "")
        renderPrice(
            views,
            R.id.slot1_price,
            R.id.slot1_sub,
            buy = prefs.getString(KEY_SLOT1_BUY, null),
            sell = prefs.getString(KEY_SLOT1_SELL, null),
        )
        renderPill(context, views, R.id.slot1_pct, prefs.getString(KEY_SLOT1_PCT, null))

        // Slot 2 (configurable desde Ajustes; oculto si el usuario no eligió un segundo curso)
        val slot2Visible = prefs.getBoolean(KEY_SLOT2_VISIBLE, true)
        val slot2Visibility = if (slot2Visible) View.VISIBLE else View.GONE
        views.setViewVisibility(R.id.slot2_separator, slot2Visibility)
        views.setViewVisibility(R.id.slot2_block, slot2Visibility)
        if (slot2Visible) {
            views.setTextViewText(R.id.slot2_title, prefs.getString(KEY_SLOT2_TITLE, "") ?: "")
            renderPrice(
                views,
                R.id.slot2_price,
                R.id.slot2_sub,
                buy = prefs.getString(KEY_SLOT2_BUY, null),
                sell = prefs.getString(KEY_SLOT2_SELL, null),
            )
            renderPill(context, views, R.id.slot2_pct, prefs.getString(KEY_SLOT2_PCT, null))
        }

        views.setTextViewText(R.id.updated_at, formatUpdatedAt(prefs.getLong(KEY_UPDATED_AT, 0L)))

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    /**
     * Misma jerarquía que el `hero` de HomeScreen: la venta manda y la compra va
     * como subtítulo apagado. Cuando sólo hay compra (tarjeta), esa ocupa el lugar
     * principal y el subtítulo pasa a ser el tag "COMPRA" — igual que `rowTag` en
     * la lista, para que no se lea como precio de venta.
     */
    private fun renderPrice(
        views: RemoteViews,
        priceId: Int,
        subId: Int,
        buy: String?,
        sell: String?,
    ) {
        val venta = sell.orAbsent()
        val compra = buy.orAbsent()
        views.setTextViewText(priceId, venta ?: compra ?: EMPTY_VALUE)
        val sub = when {
            venta != null && compra != null -> "Compra $compra"
            venta == null && compra != null -> "COMPRA"
            else -> null
        }
        views.setViewVisibility(subId, if (sub == null) View.GONE else View.VISIBLE)
        if (sub != null) {
            views.setTextViewText(subId, sub)
        }
    }

    /**
     * Espejo de components/DeltaPill.tsx: "-0.32%" → "▼ 0.32%" en rojo, cualquier
     * otra cosa → "▲ …" en verde (sí, incluido el 0%, igual que en la app). Sin
     * dato la pill directamente no se dibuja.
     */
    private fun renderPill(
        context: Context,
        views: RemoteViews,
        pillId: Int,
        porcentaje: String?,
    ) {
        val pct = porcentaje.orAbsent()
        if (pct == null) {
            views.setViewVisibility(pillId, View.GONE)
            return
        }
        val isDown = pct.startsWith("-")
        views.setViewVisibility(pillId, View.VISIBLE)
        views.setTextViewText(pillId, "${if (isDown) "▼" else "▲"} ${pct.replace("-", "")}")
        views.setTextColor(
            pillId,
            context.getColor(if (isDown) R.color.widget_down else R.color.widget_up),
        )
        views.setInt(
            pillId,
            "setBackgroundResource",
            if (isDown) R.drawable.widget_pill_down else R.drawable.widget_pill_up,
        )
    }
}
