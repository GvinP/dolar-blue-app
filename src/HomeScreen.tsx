import {
  Text,
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  NativeModules,
  Platform,
} from 'react-native';
import {useCallback, useEffect, useLayoutEffect} from 'react';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {RootStackParamList, Cotizacion} from './types';
import {StackNavigationProp} from '@react-navigation/stack';
import {fetchLatestQuotes} from './api/quotes';
import {useQuery} from '@tanstack/react-query';
import {getWidgetConfig} from './settings';

const {WidgetModule} = NativeModules;

export const HomeScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, 'HomeScreen'>>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('SettingsScreen')}
          style={styles.settingsButton}
          hitSlop={12}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const {
    data: prices,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['quotes'],
    queryFn: fetchLatestQuotes,
  });

  const updateWidget = useCallback(async () => {
    if (!prices || Platform.OS !== 'android' || !WidgetModule) return;
    const config = await getWidgetConfig();
    const slot1 = prices.find(p => p.code === config.slot1);
    const slot2 = config.slot2 ? prices.find(p => p.code === config.slot2) : undefined;
    if (!slot1) return;
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
  }, [prices]);

  // Котировки обновились — синхронизируем виджет
  useEffect(() => {
    updateWidget();
  }, [updateWidget]);

  // Вернулись из SettingsScreen — конфигурация слотов могла поменяться
  useFocusEffect(
    useCallback(() => {
      updateWidget();
    }, [updateWidget]),
  );

  const porcentajeColor = useCallback(
    (porcentaje?: string) =>
      porcentaje?.startsWith('-') ? '#af2030' : '#00ff83',
    [],
  );

  const renderItem = useCallback(
    ({item}: {item: Cotizacion}) => (
      <Pressable
        onPress={() =>
          navigation.navigate('ChartScreen', {
            code: item.code,
            title: item.title,
          })
        }>
        <View style={styles.moneda}>
          <View style={styles.row}>
            <Text style={styles.text}>{item.title}</Text>
            <Text
              style={[
                styles.porcentaje,
                {color: porcentajeColor(item.porcentaje)},
              ]}>
              {item.porcentaje}
            </Text>
          </View>
          <View style={styles.row}>
            <View style={styles.price}>
              <Text style={styles.text}>{item.compra}</Text>
            </View>
            <View style={styles.price}>
              <Text style={styles.text}>{item.venta}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    ),
    [navigation, porcentajeColor],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#00ff83" size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.messageText}>
          No se pudieron cargar las cotizaciones.
        </Text>
        <Pressable onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={prices}
        renderItem={renderItem}
        keyExtractor={item => item.code}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.messageText}>Sin datos por el momento.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  listContent: {
    padding: 8,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
  },
  messageText: {
    color: '#808080',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00ff83',
  },
  retryText: {
    color: '#00ff83',
    fontSize: 14,
  },
  moneda: {
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#808080',
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#25292e',
  },
  price: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
  },
  porcentaje: {
    marginLeft: 'auto',
  },
  settingsButton: {
    marginRight: 16,
  },
  settingsIcon: {
    color: '#fff',
    fontSize: 20,
  },
});
