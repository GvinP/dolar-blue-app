package com.dolarblue

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.facebook.react.ReactActivity
import android.appwidget.AppWidgetProvider

class WidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)

        appWidgetIds.forEach { appWidgetId ->
            val intent = Intent(context, ReactActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT)

            val remoteViews = RemoteViews(context.packageName, R.layout.widget_layout)
            remoteViews.setOnClickPendingIntent(R.id.widget_text, pendingIntent)
            remoteViews.setTextViewText(R.id.widget_text, "Updated Text!")

            appWidgetManager.updateAppWidget(appWidgetId, remoteViews)
        }
    }
}
