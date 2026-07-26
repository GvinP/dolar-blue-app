package com.dolarblue

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Arrancado por el botón ⟳ del widget (ver WidgetProvider). Ejecuta la
 * headless task "WidgetRefresh" (src/widgetRefreshTask.ts) sin abrir
 * ninguna Activity — trae cotizaciones frescas y reescribe el widget.
 */
class WidgetRefreshTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig {
        return HeadlessJsTaskConfig(
            "WidgetRefresh",
            Arguments.createMap(),
            10_000L,
            false,
        )
    }
}
