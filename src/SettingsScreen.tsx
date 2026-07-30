import {useCallback, useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {QUOTE_CODE_LIST, QuoteCode} from './types';
import {
  getPushPreferences,
  getWidgetConfig,
  PushPreferences,
  setPushPreferences,
  setWidgetConfig,
  WidgetConfig,
} from './settings';
import {syncPushPreferences} from './notifications';
import {colors} from '../assets/colors';
import {FONT_FAMILY} from '../assets/fonts';

const STEP = 0.5;
const clampThreshold = (value: number) => Math.max(0.5, Math.round(value * 10) / 10);

export const SettingsScreen = () => {
  const [widgetConfig, setWidgetConfigState] = useState<WidgetConfig>({
    slot1: 'blue',
    slot2: 'oficial',
  });
  const [pushPrefs, setPushPrefsState] = useState<PushPreferences>({
    code: 'blue',
    thresholdPct: 2,
  });
  const [thresholdInput, setThresholdInput] = useState('2');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [wc, pp] = await Promise.all([getWidgetConfig(), getPushPreferences()]);
      setWidgetConfigState(wc);
      setPushPrefsState(pp);
      setThresholdInput(String(pp.thresholdPct));
    })();
  }, []);

  const chooseSlot1 = useCallback((code: QuoteCode) => {
    setSaved(false);
    setWidgetConfigState(prev => ({
      ...prev,
      slot1: code,
      slot2: prev.slot2 === code ? null : prev.slot2,
    }));
  }, []);

  const chooseSlot2 = useCallback((code: QuoteCode | null) => {
    setSaved(false);
    setWidgetConfigState(prev => ({...prev, slot2: code}));
  }, []);

  const choosePushCode = useCallback((code: QuoteCode) => {
    setSaved(false);
    setPushPrefsState(prev => ({...prev, code}));
  }, []);

  const step = useCallback((delta: number) => {
    setSaved(false);
    const current = parseFloat(thresholdInput.replace(',', '.')) || 0;
    setThresholdInput(String(clampThreshold(current + delta)));
  }, [thresholdInput]);

  const handleSave = useCallback(async () => {
    const parsed = parseFloat(thresholdInput.replace(',', '.'));
    const thresholdPct = !isNaN(parsed) && parsed > 0 ? parsed : 2;
    const prefs: PushPreferences = {...pushPrefs, thresholdPct};

    await setWidgetConfig(widgetConfig);
    await setPushPreferences(prefs);
    await syncPushPreferences(prefs);

    setPushPrefsState(prefs);
    setThresholdInput(String(thresholdPct));
    setSaved(true);
  }, [widgetConfig, pushPrefs, thresholdInput]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Widget — primera cotización</Text>
      <View style={styles.chips}>
        {QUOTE_CODE_LIST.map(opt => (
          <Pressable
            key={opt.code}
            style={[styles.chip, widgetConfig.slot1 === opt.code && styles.chipSelected]}
            onPress={() => chooseSlot1(opt.code)}>
            <Text
              style={[
                styles.chipText,
                widgetConfig.slot1 === opt.code && styles.chipTextSelected,
              ]}>
              {opt.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Widget — segunda cotización (opcional)</Text>
      <View style={styles.chips}>
        <Pressable
          style={[styles.chip, widgetConfig.slot2 === null && styles.chipSelected]}
          onPress={() => chooseSlot2(null)}>
          <Text
            style={[styles.chipText, widgetConfig.slot2 === null && styles.chipTextSelected]}>
            Ninguna
          </Text>
        </Pressable>
        {QUOTE_CODE_LIST.filter(opt => opt.code !== widgetConfig.slot1).map(opt => (
          <Pressable
            key={opt.code}
            style={[styles.chip, widgetConfig.slot2 === opt.code && styles.chipSelected]}
            onPress={() => chooseSlot2(opt.code)}>
            <Text
              style={[
                styles.chipText,
                widgetConfig.slot2 === opt.code && styles.chipTextSelected,
              ]}>
              {opt.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Notificaciones push — cotización</Text>
      <View style={styles.chips}>
        {QUOTE_CODE_LIST.map(opt => (
          <Pressable
            key={opt.code}
            style={[styles.chip, pushPrefs.code === opt.code && styles.chipSelected]}
            onPress={() => choosePushCode(opt.code)}>
            <Text
              style={[styles.chipText, pushPrefs.code === opt.code && styles.chipTextSelected]}>
              {opt.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Avisarme si cambia más de</Text>
      <View style={styles.stepper}>
        <Pressable onPress={() => step(-STEP)} hitSlop={8} style={styles.stepperBtn}>
          <Text style={styles.stepperBtnText}>–</Text>
        </Pressable>
        <TextInput
          style={[styles.stepperInput, styles.ticker]}
          value={thresholdInput}
          onChangeText={text => {
            setSaved(false);
            setThresholdInput(text);
          }}
          keyboardType="decimal-pad"
          placeholder="2"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.stepperPercent}>%</Text>
        <Pressable onPress={() => step(STEP)} hitSlop={8} style={styles.stepperBtn}>
          <Text style={styles.stepperBtnText}>+</Text>
        </Pressable>
      </View>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{saved ? 'Guardado ✓' : 'Guardar'}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  ticker: {
    fontFamily: FONT_FAMILY.ticker,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontFamily: FONT_FAMILY.bold,
    color: colors.text,
    fontSize: 12.5,
  },
  chipTextSelected: {
    color: colors.accentInk,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
  },
  stepperBtn: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: colors.accent,
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 18,
  },
  stepperInput: {
    minWidth: 44,
    textAlign: 'right',
    color: colors.text,
    fontSize: 15,
    padding: 0,
  },
  stepperPercent: {
    color: colors.text,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 15,
    marginRight: 4,
  },
  saveButton: {
    marginTop: 28,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.accentInk,
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 15,
  },
});
