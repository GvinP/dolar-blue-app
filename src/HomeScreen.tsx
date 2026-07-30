import {
  Text,
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  AppState,
} from 'react-native';
import {useCallback, useEffect, useLayoutEffect} from 'react';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {RootStackParamList, Cotizacion} from './types';
import {StackNavigationProp} from '@react-navigation/stack';
import {fetchLatestQuotes, fetchQuoteHistory} from './api/quotes';
import {useQuery} from '@tanstack/react-query';
import {pushWidgetUpdate} from './widget';
import {Sparkline, DeltaPill} from './components';
import {colors} from '../assets/colors';
import {FONT_FAMILY} from '../assets/fonts';

const HERO_CODE = 'blue';

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

  const hero = prices?.find(p => p.code === HERO_CODE) ?? prices?.[0];
  const others = prices?.filter(p => p.code !== hero?.code) ?? [];

  // Mismo queryKey que ChartScreen — si el usuario después entra al gráfico de
  // Blue, reutiliza este fetch en vez de pedirlo de nuevo.
  const {data: heroHistory} = useQuery({
    queryKey: ['history', HERO_CODE],
    queryFn: () => fetchQuoteHistory(HERO_CODE),
    enabled: !!hero,
    staleTime: 5 * 60 * 1000,
  });
  const sparkData = heroHistory?.slice(-8).map(h => h.compra);

  const updateWidget = useCallback(async () => {
    await pushWidgetUpdate(prices);
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

  // Приложение вернулось на передний план (в т.ч. по тапу на кнопку виджета) — тянем свежие данные
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refetch();
      }
    });
    return () => subscription.remove();
  }, [refetch]);

  const goToChart = useCallback(
    (item: Cotizacion) =>
      navigation.navigate('ChartScreen', {code: item.code, title: item.title}),
    [navigation],
  );

  const renderItem = useCallback(
    ({item}: {item: Cotizacion}) => (
      <Pressable onPress={() => goToChart(item)} style={({pressed}) => pressed && styles.rowPressed}>
        <View style={styles.row}>
          <Text style={styles.rowName}>{item.title.replace(/^Dólar\s*/i, '')}</Text>
          <View style={styles.rowRight}>
            {item.venta ? (
              <Text style={[styles.rowPriceMain, styles.ticker]}>{item.venta}</Text>
            ) : (
              <View style={styles.rowPriceStack}>
                <Text style={[styles.rowPriceMain, styles.ticker]}>{item.compra}</Text>
                <Text style={styles.rowTag}>compra</Text>
              </View>
            )}
            {item.porcentaje ? (
              <DeltaPill porcentaje={item.porcentaje} />
            ) : (
              <Text style={styles.chevMini}>›</Text>
            )}
          </View>
        </View>
      </Pressable>
    ),
    [goToChart],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.accent} size="large" />
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
        data={others}
        renderItem={renderItem}
        keyExtractor={item => item.code}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          hero ? (
            <>
              <Pressable onPress={() => goToChart(hero)}>
                <View style={styles.hero}>
                  <View style={styles.heroTop}>
                    <Text style={styles.heroLabel}>{hero.title}</Text>
                    <DeltaPill porcentaje={hero.porcentaje} />
                  </View>
                  <View style={styles.heroBody}>
                    <View>
                      <Text style={[styles.heroPrice, styles.ticker]}>
                        {hero.venta ?? hero.compra}
                      </Text>
                      {hero.venta && hero.compra ? (
                        <Text style={styles.heroSub}>
                          Compra <Text style={[styles.heroSubValue, styles.ticker]}>{hero.compra}</Text>
                        </Text>
                      ) : null}
                    </View>
                    {sparkData && sparkData.length >= 2 ? (
                      <Sparkline data={sparkData} />
                    ) : null}
                  </View>
                </View>
              </Pressable>
              {others.length > 0 ? <Text style={styles.section}>Otras cotizaciones</Text> : null}
            </>
          ) : null
        }
        ListHeaderComponentStyle={styles.listHeader}
        ListFooterComponent={others.length > 0 ? <View style={styles.rowsSpacer} /> : null}
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
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticker: {
    fontFamily: FONT_FAMILY.ticker,
    letterSpacing: -0.3,
  },
  messageText: {
    color: colors.textMuted,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  retryText: {
    color: colors.accent,
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
  },

  hero: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroPrice: {
    fontSize: 36,
    color: colors.text,
  },
  heroSub: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  heroSubValue: {
    fontSize: 12,
    color: colors.text,
  },

  section: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 10,
    marginLeft: 2,
  },
  rowsSpacer: {height: 4},

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowName: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowPriceMain: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  rowPriceStack: {
    alignItems: 'flex-end',
  },
  rowTag: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: 1,
  },
  chevMini: {
    color: colors.textMuted,
    fontSize: 16,
    opacity: 0.6,
    width: 14,
    textAlign: 'center',
  },

  settingsButton: {
    marginRight: 16,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    color: colors.textMuted,
    fontSize: 16,
  },
});
