import {NativeModules, Platform} from 'react-native';
import {Cotizacion} from './types';
import {getWidgetConfig} from './settings';

const {WidgetModule} = NativeModules;

/**
 * Empuja el estado actual de cotizaciones al widget de Android, según los
 * slots configurados en Ajustes. Se usa tanto desde HomeScreen (tras cada
 * fetch normal) como desde la headless task disparada por el botón de
 * refresh del widget.
 */
export async function pushWidgetUpdate(prices: Cotizacion[] | undefined): Promise<void> {
  if (!prices || Platform.OS !== 'android' || !WidgetModule) {
    return;
  }
  const config = await getWidgetConfig();
  const slot1 = prices.find(p => p.code === config.slot1);
  const slot2 = config.slot2 ? prices.find(p => p.code === config.slot2) : undefined;
  if (!slot1) {
    return;
  }
  WidgetModule.updateWidget({
    slot1Title: slot1.title,
    slot1Buy: slot1.compra ?? '–',
    slot1Sell: slot1.venta ?? '–',
    slot1Pct: slot1.porcentaje ?? '',
    slot2Visible: !!slot2,
    slot2Title: slot2?.title ?? '',
    slot2Buy: slot2?.compra ?? '–',
    slot2Sell: slot2?.venta ?? '–',
    slot2Pct: slot2?.porcentaje ?? '',
  });
}
