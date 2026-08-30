package com.dolarblue

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
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

        /**
         * Qué lado del precio se muestra. A diferencia del resto de las claves, ésta
         * la escribe sólo el widget (botón venta/compra), nunca WidgetModule: si el
         * push de cotizaciones la tocara, cada refresh pisaría la elección.
         */
        const val KEY_SIDE = "side"
        const val SIDE_VENTA = "venta"
        const val SIDE_COMPRA = "compra"

        private const val ACTION_TOGGLE_SIDE = "com.dolarblue.action.TOGGLE_SIDE"

        /** widget.ts manda esto cuando la cotización no tiene ese lado (p.ej. tarjeta). */
        private const val EMPTY_VALUE = "–"

        /** Igual que en las filas de HomeScreen: a 2 celdas de ancho "Dólar" no aporta. */
        private val DOLAR_PREFIX = Regex("^Dólar\\s*", RegexOption.IGNORE_CASE)

        private fun String?.orAbsent(): String? =
            this?.trim()?.takeIf { it.isNotEmpty() && it != EMPTY_VALUE }

        private fun shortTitle(title: String?): String =
            title?.trim()?.replace(DOLAR_PREFIX, "").orEmpty()

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

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action != ACTION_TOGGLE_SIDE) {
            return
        }
        // El toggle es global: un solo gesto cambia todas las instancias del widget.
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val next = if (prefs.getString(KEY_SIDE, SIDE_VENTA) == SIDE_COMPRA) {
            SIDE_VENTA
        } else {
            SIDE_COMPRA
        }
        prefs.edit().putString(KEY_SIDE, next).apply()
        renderAll(context)
    }

    private fun renderAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, WidgetProvider::class.java))
        for (id in ids) {
            renderWidget(context, manager, id)
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

        // Selector venta/compra → broadcast explícito a este mismo receiver
        val preferCompra = prefs.getString(KEY_SIDE, SIDE_VENTA) == SIDE_COMPRA
        val toggleSide = PendingIntent.getBroadcast(
            context, 2,
            Intent(context, WidgetProvider::class.java).setAction(ACTION_TOGGLE_SIDE),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.side_toggle, toggleSide)
        views.setTextViewText(R.id.side_toggle, if (preferCompra) SIDE_COMPRA else SIDE_VENTA)

        // Slot 1 (siempre visible)
        views.setTextViewText(R.id.slot1_title, shortTitle(prefs.getString(KEY_SLOT1_TITLE, "")))
        renderPrice(
            views,
            R.id.slot1_price,
            R.id.slot1_tag,
            buy = prefs.getString(KEY_SLOT1_BUY, null),
            sell = prefs.getString(KEY_SLOT1_SELL, null),
            preferCompra = preferCompra,
        )
        renderPill(context, views, R.id.slot1_pct, prefs.getString(KEY_SLOT1_PCT, null))

        // Slot 2 (configurable desde Ajustes; oculto si el usuario no eligió un segundo curso)
        val slot2Visible = prefs.getBoolean(KEY_SLOT2_VISIBLE, true)
        val slot2Visibility = if (slot2Visible) View.VISIBLE else View.GONE
        views.setViewVisibility(R.id.slot2_separator, slot2Visibility)
        views.setViewVisibility(R.id.slot2_block, slot2Visibility)
        if (slot2Visible) {
            views.setTextViewText(R.id.slot2_title, shortTitle(prefs.getString(KEY_SLOT2_TITLE, "")))
            renderPrice(
                views,
                R.id.slot2_price,
                R.id.slot2_tag,
                buy = prefs.getString(KEY_SLOT2_BUY, null),
                sell = prefs.getString(KEY_SLOT2_SELL, null),
                preferCompra = preferCompra,
            )
            renderPill(context, views, R.id.slot2_pct, prefs.getString(KEY_SLOT2_PCT, null))
        }

        views.setTextViewText(R.id.updated_at, formatUpdatedAt(prefs.getLong(KEY_UPDATED_AT, 0L)))

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    /**
     * Un solo renglón por cotización, como las filas de HomeScreen: a 2 celdas de
     * ancho entra un solo lado del precio, el que eligió el usuario en el widget.
     *
     * El tag debajo aparece únicamente cuando lo mostrado NO es ese lado — pasa con
     * tarjeta, que no tiene venta. Así el caso normal queda limpio y el raro queda
     * explicado, en vez de repetir "venta" en cada fila.
     */
    private fun renderPrice(
        views: RemoteViews,
        priceId: Int,
        tagId: Int,
        buy: String?,
        sell: String?,
        preferCompra: Boolean,
    ) {
        val venta = sell.orAbsent()
        val compra = buy.orAbsent()
        val preferred = if (preferCompra) compra else venta
        val fallback = if (preferCompra) venta else compra

        views.setTextViewText(priceId, preferred ?: fallback ?: EMPTY_VALUE)

        val showFallbackTag = preferred == null && fallback != null
        views.setViewVisibility(tagId, if (showFallbackTag) View.VISIBLE else View.GONE)
        if (showFallbackTag) {
            views.setTextViewText(tagId, if (preferCompra) SIDE_VENTA else SIDE_COMPRA)
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
