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

      <Text style={styles.sectionTitle}>Umbral de cambio (%)</Text>
      <TextInput
        style={styles.input}
        value={thresholdInput}
        onChangeText={text => {
          setSaved(false);
          setThresholdInput(text);
        }}
        keyboardType="decimal-pad"
        placeholder="2"
        placeholderTextColor="#808080"
      />

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{saved ? 'Guardado ✓' : 'Guardar'}</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#808080',
  },
  chipSelected: {
    backgroundColor: '#00ff83',
    borderColor: '#00ff83',
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#25292e',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#808080',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    width: 100,
  },
  saveButton: {
    marginTop: 28,
    backgroundColor: '#00ff83',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#25292e',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
