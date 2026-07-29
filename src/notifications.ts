import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {Platform} from 'react-native';
import {SUPABASE_URL, SUPABASE_ANON_KEY} from '@env';
import {getPushPreferences, PushPreferences} from './settings';

/** Настройка поведения уведомлений при получении в foreground */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// TEMPORAL: reporta cada paso a una tabla de debug en Supabase, ya que no
// tenemos acceso a los logs del dispositivo para un APK standalone.
// Sacar antes de mergear.
async function debugLog(message: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/_debug_log`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({message: `[push] ${message}`}),
    });
  } catch {
    // nada que hacer si ni esto llega
  }
}

/**
 * Запрашивает разрешение, получает Expo Push Token и сохраняет его в Supabase.
 * Безопасно вызывать повторно — токен хранится с UNIQUE constraint.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    await debugLog('start');

    if (!Device.isDevice) {
      // Симулятор не поддерживает push-уведомления
      await debugLog('skipped: not a physical device');
      return;
    }

    // Для Android нужен notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'DolarBlue',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
      await debugLog('notification channel set');
    }

    const {status: existing} = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    await debugLog(`existing permission status: ${existing}`);

    if (existing !== 'granted') {
      const {status} = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      await debugLog(`requested permission, got: ${status}`);
    }

    if (finalStatus !== 'granted') {
      await debugLog('permission denied, aborting');
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    await debugLog(`projectId: ${projectId ?? 'MISSING'}`);
    if (!projectId) {
      return;
    }

    let token: string;
    try {
      const result = await Notifications.getExpoPushTokenAsync({projectId});
      token = result.data;
      await debugLog(`got token: ${token.slice(0, 40)}`);
    } catch (e) {
      await debugLog(`getExpoPushTokenAsync FAILED: ${String(e)}`);
      return;
    }

    const prefs = await getPushPreferences();
    await savePushToken(token, prefs);
    await debugLog('savePushToken call completed');
  } catch (e) {
    await debugLog(`UNCAUGHT error in registerForPushNotifications: ${String(e)}`);
  }
}

/**
 * Re-sincroniza el token actual con nuevas preferencias (código vigilado + umbral).
 * Llamar desde SettingsScreen al guardar cambios.
 */
export async function syncPushPreferences(prefs: PushPreferences): Promise<void> {
  if (!Device.isDevice) {
    return;
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    return;
  }
  try {
    const {data: token} = await Notifications.getExpoPushTokenAsync({projectId});
    await savePushToken(token, prefs);
  } catch (e) {
    console.error('[notifications] failed to sync preferences:', e);
  }
}

async function savePushToken(token: string, prefs: PushPreferences): Promise<void> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/push_tokens?on_conflict=token`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        // Si el token ya existe, actualiza watch_code/threshold_pct (permite re-sincronizar preferencias)
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        token,
        watch_code: prefs.code,
        threshold_pct: prefs.thresholdPct,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      await debugLog(`savePushToken FAILED: ${response.status} ${text}`);
    } else {
      await debugLog('savePushToken OK');
    }
  } catch (e) {
    await debugLog(`savePushToken network error: ${String(e)}`);
  }
}
