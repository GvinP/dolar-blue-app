import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {Platform} from 'react-native';
import {SUPABASE_URL} from '@env';
import {getPushPreferences, PushPreferences} from './settings';

/** Настройка поведения уведомлений при получении в foreground */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Запрашивает разрешение, получает Expo Push Token и сохраняет его в Supabase.
 * Безопасно вызывать повторно — токен хранится с UNIQUE constraint.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    // Симулятор не поддерживает push-уведомления
    console.log('[notifications] skipped: not a physical device');
    return;
  }

  // Для Android нужен notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'DolarBlue',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const {status: existing} = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const {status} = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[notifications] permission denied');
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.error('[notifications] missing EAS projectId in app.json — run `eas init`');
    return;
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({projectId});
    token = result.data;
  } catch (e) {
    console.error('[notifications] failed to get push token:', e);
    return;
  }

  console.log('[notifications] push token:', token);
  const prefs = await getPushPreferences();
  await savePushToken(token, prefs);
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

// Vía Edge Function (service role) en vez de INSERT directo desde el cliente:
// un upsert anon-directo por `token` requiere que anon pueda LEER la columna
// token (Postgres lo necesita para arbitrar el conflicto de UNIQUE bajo RLS),
// lo cual expondría todos los push tokens de todos los usuarios a cualquiera
// con la anon key. La función valida el body y hace el upsert con service role.
async function savePushToken(token: string, prefs: PushPreferences): Promise<void> {
  try {
    const url = `${SUPABASE_URL}/functions/v1/register-push-token`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        token,
        watch_code: prefs.code,
        threshold_pct: prefs.thresholdPct,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[notifications] failed to save token:', response.status, text);
    } else {
      console.log('[notifications] token saved to Supabase');
    }
  } catch (e) {
    console.error('[notifications] network error saving token:', e);
  }
}
