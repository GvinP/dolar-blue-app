import {filters, FiltersBlock, FilterType, PointerLabel} from './components';
import {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {LineChart, lineDataItem} from 'react-native-gifted-charts';

type Price = {
  date: string;
  source: 'Oficial' | 'Blue';
  value_sell: number;
  value_buy: number;
  // casa: string;
  // compra: number;
  // venta: number;
  // fecha: string;
};

export const ChartScreen = () => {
  const [prices, setPrices] = useState<Price[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('semana');

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const response = await fetch(
        // 'https://api.argentinadatos.com/v1/cotizaciones/dolares'
        'https://api.bluelytics.com.ar/v2/evolution.json',
      );
      const priceData = await response.json();
      setPrices(priceData.slice(0, 730).reverse());
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  };
  return (
    <View style={styles.container}>
      <FiltersBlock
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
      />
      <View style={{alignItems: 'center'}}>
        <LineChart
          data={prices
            .filter(item => item.source === 'Blue')
            .slice(
              -(
                filters[filters.findIndex(item => item.type === selectedFilter)]
                  .value || prices.length
              ),
            )
            .map(item => ({
              value: item.value_buy,
              label: item.date,
              labelTextStyle: {color: 'white', fontSize: 8, marginLeft: 6},
            }))}
          // .filter((item) => item.casa === casa)
          // .slice(
          //   -(
          //     filters[
          //       filters.findIndex((item) => item.type === selectedFilter)
          //     ].value || prices.length
          //   )
          // )
          // .map((item, index) => ({
          //   value: item.compra,
          //   label: new Date(item.fecha).toLocaleDateString('es-AR'),
          //   labelTextStyle: { color: 'white', fontSize: 8, marginLeft: 6 },
          // }))}
          data2={prices
            .filter(item => item.source === 'Oficial')
            .slice(
              -(
                filters[filters.findIndex(item => item.type === selectedFilter)]
                  .value || prices.length
              ),
            )
            .map(item => ({
              value: item.value_buy,
              label: item.date,
              labelTextStyle: {color: 'white', fontSize: 8, marginLeft: 6},
            }))}
          // .filter((item) => item.casa === 'blue')
          // .slice(
          //   -(
          //     filters[
          //       filters.findIndex((item) => item.type === selectedFilter)
          //     ].value || prices.length
          //   )
          // )
          // .map((item, index) => ({
          //   value: item.compra,
          //   label: new Date(item.fecha).toLocaleDateString('es-AR'),
          //   labelTextStyle: { color: 'white', fontSize: 8, marginLeft: 6 },
          // }))}
          width={320}
          height={300}
          hideDataPoints
          spacing={
            320 /
            (filters[filters.findIndex(item => item.type === selectedFilter)]
              .value || prices.length)
          }
          color="#af2030"
          color2="#00ff83"
          thickness={2}
          // startFillColor="rgba(20,105,81,0.3)"
          // endFillColor="rgba(20,85,81,0.01)"
          startOpacity={0.9}
          endOpacity={0.2}
          initialSpacing={0}
          noOfSections={6}
          maxValue={1800}
          yAxisColor="white"
          yAxisThickness={0.2}
          rulesType="solid"
          rulesColor="gray"
          yAxisTextStyle={{color: 'gray'}}
          xAxisColor="gray"
          xAxisType="solid"
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
            pointerLabelComponent: (items: lineDataItem[]) => {
              return <PointerLabel items={items} />;
            },
          }}
        />
      </View>
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
