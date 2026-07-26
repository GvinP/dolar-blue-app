import AsyncStorage from '@react-native-async-storage/async-storage';
import {QuoteCode} from './types';

export type WidgetConfig = {
  slot1: QuoteCode;
  /** null = segunda fila oculta en el widget */
  slot2: QuoteCode | null;
};

export type PushPreferences = {
  code: QuoteCode;
  thresholdPct: number;
};

const WIDGET_CONFIG_KEY = 'widget_config';
const PUSH_PREFS_KEY = 'push_preferences';

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {slot1: 'blue', slot2: 'oficial'};
export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {code: 'blue', thresholdPct: 2};

export const getWidgetConfig = async (): Promise<WidgetConfig> => {
  const raw = await AsyncStorage.getItem(WIDGET_CONFIG_KEY);
  if (!raw) {
    return DEFAULT_WIDGET_CONFIG;
  }
  try {
    return {...DEFAULT_WIDGET_CONFIG, ...JSON.parse(raw)};
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
};

export const setWidgetConfig = async (config: WidgetConfig): Promise<void> => {
  await AsyncStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(config));
};

export const getPushPreferences = async (): Promise<PushPreferences> => {
  const raw = await AsyncStorage.getItem(PUSH_PREFS_KEY);
  if (!raw) {
    return DEFAULT_PUSH_PREFERENCES;
  }
  try {
    return {...DEFAULT_PUSH_PREFERENCES, ...JSON.parse(raw)};
  } catch {
    return DEFAULT_PUSH_PREFERENCES;
  }
};

export const setPushPreferences = async (prefs: PushPreferences): Promise<void> => {
  await AsyncStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(prefs));
};
