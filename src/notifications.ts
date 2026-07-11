import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import {SUPABASE_URL, SUPABASE_ANON_KEY} from '@env';

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

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync();
    token = result.data;
  } catch (e) {
    console.error('[notifications] failed to get push token:', e);
    return;
  }

  console.log('[notifications] push token:', token);
  await savePushToken(token);
}

async function savePushToken(token: string): Promise<void> {
  try {
    const url = `${SUPABASE_URL}/rest/v1/push_tokens`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        // Игнорируем конфликт (токен уже зарегистрирован) — идемпотентно
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({token}),
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
