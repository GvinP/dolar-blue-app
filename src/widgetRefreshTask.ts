import {fetchLatestQuotes} from './api/quotes';
import {pushWidgetUpdate} from './widget';

/**
 * Headless JS task (Android): se dispara desde WidgetRefreshTaskService cuando
 * el usuario toca el botón ⟳ del widget, sin abrir la app. Corre en background,
 * sin ninguna Activity/UI — reusa exactamente el mismo fetch que HomeScreen.
 */
export default async function widgetRefreshTask(): Promise<void> {
  try {
    const prices = await fetchLatestQuotes();
    await pushWidgetUpdate(prices);
  } catch (e) {
    console.error('[widgetRefreshTask] failed:', e);
  }
}
