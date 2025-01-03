package com.dolarblue

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element

class WidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_UPDATE_WIDGET = "com.dolarblue.action.UPDATE_WIDGET"
        const val EXTRA_WIDGET_TEXT = "com.dolarblue.extra.WIDGET_TEXT"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val remoteViews = RemoteViews(context.packageName, R.layout.widget_layout)
    
        // Fetch data using Coroutine
        CoroutineScope(Dispatchers.IO).launch {
            val data = fetchDolarData()
    
            // Extract Dólar Blue and Dólar Cripto
            val dolarBlue = data["Dólar blue"]
            val dolarCripto = data["Dólar cripto"]
    
            withContext(Dispatchers.Main) {
                // Update Dólar Blue
                dolarBlue?.let {
                    remoteViews.setTextViewText(R.id.blue_compra, "${it.first}")
                    remoteViews.setTextViewText(R.id.blue_venta, "${it.second}")
                    remoteViews.setTextViewText(R.id.blue_porcentaje, "${it.third}")
                }
    
                // Update Dólar Cripto
                dolarCripto?.let {
                    remoteViews.setTextViewText(R.id.cripto_compra, "${it.first}")
                    remoteViews.setTextViewText(R.id.cripto_venta, "${it.second}")
                    remoteViews.setTextViewText(R.id.cripto_porcentaje, "${it.third}")
                }
    
                // Apply updates to widget
                appWidgetManager.updateAppWidget(appWidgetId, remoteViews)
            }
        }
    }


    private suspend fun fetchDolarData(): Map<String, Triple<String, String, String>> {
        val result = mutableMapOf<String, Triple<String, String, String>>()
    
        try {
            val url = "https://www.dolarhoy.com"
            val doc = Jsoup.connect(url).get()
    
            val tiles = doc.select(".tile.is-child")
    
            for (tile in tiles) {
                val title = tile.select(".title").text()
                if (title == "Dólar blue" || title == "Dólar cripto") {
                    val compra = tile.select(".val").getOrNull(0)?.text() ?: ""
                    val venta = tile.select(".val").getOrNull(1)?.text() ?: ""
                    val porcentaje = tile.select(".var-porcentaje").getOrNull(0)?.text() ?: ""
                    result[title] = Triple(compra, venta, porcentaje)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    
        return result
    }
}
