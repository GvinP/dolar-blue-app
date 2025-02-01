import {RouteProp, useRoute} from '@react-navigation/native';
import {filters, FiltersBlock, FilterType, PointerLabel} from './components';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {LineChart, lineDataItem} from 'react-native-gifted-charts';
import {RootStackParamList} from './types';
import {calculateLabelIndexes} from './utils';

type Price = {
  // date: string;
  // source: 'Oficial' | 'Blue';
  // value_sell: number;
  // value_buy: number;
  casa: string;
  compra: number;
  venta: number;
  fecha: string;
};

const convertTitle = (title: string) => {
  switch (title) {
    case 'Dólar oficial':
      return 'oficial';
    case 'Dólar blue':
      return 'blue';
    case 'Dólar MEP/Bolsa':
      return 'bolsa';
    case 'Contado con liqui':
      return 'contadoconliqui';
    case 'Dólar cripto':
      return 'cripto';
    default:
      return 'oficial';
  }
};

export const ChartScreen = () => {
  const [prices, setPrices] = useState<Price[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<Price[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('semana');
  const {
    params: {title},
  } = useRoute<RouteProp<RootStackParamList, 'ChartScreen'>>();

  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch(
        `https://api.argentinadatos.com/v1/cotizaciones/dolares/${convertTitle(
          title,
        )}`,
        // 'https://api.bluelytics.com.ar/v2/evolution.json',
      );
      const priceData = await response.json();
      setPrices(priceData.slice(-365));
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  }, [title]);

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
            marginLeft: filteredPrices.length === 7 ? 25 : undefined,
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
      <LineChart
        data={data}
        labelsExtraHeight={10}
        width={330}
        height={300}
        hideDataPoints
        spacing={
          330 /
          ((filters[filters.findIndex(item => item.type === selectedFilter)]
            .value || prices.length) -
            1)
        }
        color="#00ff83"
        thickness={2}
        startOpacity={0.9}
        endOpacity={0.2}
        initialSpacing={0}
        noOfSections={6}
        maxValue={
          (Math.max(...data.map(item => item.value || 0)) -
            Math.min(...data.map(item => item.value || 0))) *
          1.1
        }
        yAxisColor="white"
        yAxisThickness={0.2}
        rulesType="solid"
        rulesColor="gray"
        yAxisTextStyle={{color: 'gray', fontSize: 10}}
        xAxisLabelTextStyle={{color: 'gray', fontSize: 10}}
        xAxisColor="gray"
        xAxisType="solid"
        yAxisOffset={Math.min(...data.map(item => item.value || 0))}
        adjustToWidth
        disableScroll
        // rotateLabel
        pointerConfig={{
          pointerStripHeight: 260,
          pointerStripColor: 'lightgray',
          pointerStripWidth: 2,
          pointerColor: 'lightgray',
          radius: 6,
          pointerLabelWidth: 100,
          pointerLabelHeight: 90,
          activatePointersOnLongPress: true,
          autoAdjustPointerLabelPosition: false,
          pointerLabelComponent,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    justifyContent: 'center',
  },

  text: {
    color: '#fff',
  },
});
