import {RouteProp, useRoute} from '@react-navigation/native';
import {filters, FiltersBlock, FilterType, PointerLabel, DeltaPill} from './components';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {LineChart, lineDataItem} from 'react-native-gifted-charts';
import {RootStackParamList} from './types';
import {calculateLabelIndexes, formatPercent, formatPrice} from './utils';
import {fetchQuoteHistory, HistoryPrice} from './api/quotes';
import {useQuery} from '@tanstack/react-query';
import {colors} from '../assets/colors';
import {FONT_FAMILY} from '../assets/fonts';

export const ChartScreen = () => {
  const [filteredPrices, setFilteredPrices] = useState<HistoryPrice[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('semana');
  const {
    params: {code},
  } = useRoute<RouteProp<RootStackParamList, 'ChartScreen'>>();

  const {
    data: prices = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['history', code],
    queryFn: () => fetchQuoteHistory(code),
  });

  useEffect(() => {
    const filter = filters.find(item => item.type === selectedFilter);
    const sliceCount = filter?.value ?? prices.length;
    setFilteredPrices(prices.slice(-sliceCount));
  }, [selectedFilter, prices]);

  const pointerLabelComponent = useCallback((items: lineDataItem[]) => {
    return <PointerLabel items={items[0]} />;
  }, []);

  // Escala el eje Y al rango real del período (min–max) en lugar de arrancar
  // siempre en 0, que aplasta variaciones chicas contra el techo del gráfico.
  const {yAxisOffset, maxValue} = useMemo(() => {
    if (filteredPrices.length === 0) {
      return {yAxisOffset: undefined, maxValue: undefined};
    }
    const values = filteredPrices.map(item => item.compra);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const padding = (rawMax - rawMin) * 0.1 || rawMax * 0.02 || 1;
    const offset = Math.max(0, rawMin - padding);
    return {yAxisOffset: offset, maxValue: rawMax - offset + padding};
  }, [filteredPrices]);

  const stats = useMemo(() => {
    if (filteredPrices.length === 0) {
      return null;
    }
    const values = filteredPrices.map(item => item.compra);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const first = values[0];
    const last = values[values.length - 1];
    const deltaPct = first === 0 ? 0 : ((last - first) / first) * 100;
    return {min, max, avg, last, deltaPct};
  }, [filteredPrices]);

  const data = useMemo<lineDataItem[]>(() => {
    if (filteredPrices.length === 0) {
      return [];
    }
    const indexes = calculateLabelIndexes(filteredPrices.length);
    return filteredPrices.map<lineDataItem>((item, index) => ({
      value: item.compra,
      label: indexes.includes(index)
        ? item.fecha.split('-').reverse().slice(0, 2).join('.')
        : undefined,
      dataPointText: new Date(item.fecha).toLocaleDateString('es-AR'),
      labelTextStyle: indexes.includes(index)
        ? {
            color: colors.textMuted,
            fontFamily: FONT_FAMILY.bold,
            fontSize: 10,
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            marginLeft: filteredPrices.length === 7 ? -4 : 0,
          }
        : undefined,
    }));
  }, [filteredPrices]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>No se pudo cargar el historial.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {stats ? (
        <View style={styles.priceRow}>
          <Text style={[styles.priceValue, styles.ticker]}>{formatPrice(stats.last)}</Text>
          <DeltaPill porcentaje={formatPercent(stats.deltaPct)} size="md" />
        </View>
      ) : null}

      <FiltersBlock
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
      />

      <View style={styles.card}>
        {data.length > 0 ? (
          <LineChart
            data={data}
            width={280}
            height={190}
            spacing={280 / data.length}
            thickness={2.25}
            color={colors.accent}
            curved
            areaChart
            startFillColor={colors.accent}
            endFillColor={colors.accent}
            startOpacity={0.28}
            endOpacity={0}
            hideDataPoints
            yAxisOffset={yAxisOffset}
            maxValue={maxValue}
            hideYAxisText
            yAxisColor="transparent"
            xAxisColor={colors.border}
            rulesColor={colors.border}
            rulesType="solid"
            noOfSections={3}
            initialSpacing={4}
            endSpacing={4}
            pointerConfig={{
              pointerStripUptoDataPoint: true,
              pointerStripColor: colors.border,
              pointerStripWidth: 2,
              strokeDashArray: [2, 5],
              pointerColor: colors.accent,
              radius: 5,
              pointerLabelWidth: 100,
              pointerLabelHeight: 90,
              pointerLabelComponent: pointerLabelComponent,
            }}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.messageText}>Sin datos para este período.</Text>
          </View>
        )}

        {stats ? (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Mín</Text>
              <Text style={[styles.statValue, styles.ticker]}>{formatPrice(stats.min)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Máx</Text>
              <Text style={[styles.statValue, styles.ticker]}>{formatPrice(stats.max)}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Prom.</Text>
              <Text style={[styles.statValue, styles.ticker]}>{formatPrice(stats.avg)}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  ticker: {
    fontFamily: FONT_FAMILY.ticker,
    letterSpacing: -0.3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 14,
  },
  priceValue: {
    fontSize: 30,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  emptyChart: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    color: colors.textMuted,
    fontFamily: FONT_FAMILY.regular,
    fontSize: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 13,
    color: colors.text,
  },
});
