import {RouteProp, useRoute} from '@react-navigation/native';
import {filters, FiltersBlock, FilterType, PointerLabel} from './components';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {LineChart, lineDataItem} from 'react-native-gifted-charts';
import {RootStackParamList} from './types';
import {calculateLabelIndexes} from './utils';
import {fetchQuoteHistory, HistoryPrice} from './api/quotes';

export const ChartScreen = () => {
  const [prices, setPrices] = useState<HistoryPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<HistoryPrice[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('semana');
  const {
    params: {code},
  } = useRoute<RouteProp<RootStackParamList, 'ChartScreen'>>();

  const fetchPrices = useCallback(async () => {
    try {
      const priceData = await fetchQuoteHistory(code);
      setPrices(priceData);
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  }, [code]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  useEffect(() => {
    setFilteredPrices(
      prices.slice(
        -(
          filters[filters.findIndex(item => item.type === selectedFilter)]
            .value || prices.length
        ),
      ),
    );
  }, [selectedFilter, prices]);

  const pointerLabelComponent = useCallback((items: lineDataItem[]) => {
    return <PointerLabel items={items[0]} />;
  }, []);

  const data = useMemo<lineDataItem[]>(() => {
    const indexes = calculateLabelIndexes(filteredPrices.length);
    return filteredPrices.map<lineDataItem>((item, index) => ({
      value: item.compra,
      label: indexes.includes(index)
        ? item.fecha.split('-').reverse().slice(0, 2).join('.')
        : undefined,
      dataPointText: new Date(item.fecha).toLocaleDateString('es-AR'),
      labelTextStyle: indexes.includes(index)
        ? {
            color: 'white',
            fontSize: 10,
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            marginLeft: filteredPrices.length === 7 ? -4 : 0,
          }
        : undefined,
    }));
  }, [filteredPrices]);

  return (
    <View style={styles.container}>
      <FiltersBlock
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
      />
      {data.length > 0 && (
        <LineChart
          data={data}
          width={300}
          height={200}
          spacing={300 / data.length}
          thickness={2}
          color="#00ff83"
          hideDataPoints
          yAxisTextStyle={{color: 'white'}}
          showVerticalLines
          verticalLinesColor="rgba(14,164,164,0.1)"
          xAxisColor="rgba(14,164,164,0.5)"
          yAxisColor="rgba(14,164,164,0.5)"
          pointerConfig={{
            pointerStripUptoDataPoint: true,
            pointerStripColor: 'lightgray',
            pointerStripWidth: 2,
            strokeDashArray: [2, 5],
            pointerColor: 'lightgray',
            radius: 6,
            pointerLabelWidth: 100,
            pointerLabelHeight: 90,
            pointerLabelComponent: pointerLabelComponent,
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
