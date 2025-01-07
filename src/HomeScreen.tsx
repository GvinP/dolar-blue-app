import {
  Text,
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  FlatList,
} from 'react-native';
import {useCallback, useEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {RootStackParamList} from './types';
import {StackNavigationProp} from '@react-navigation/stack';
import {Cotizacion, fetchDolar} from './utils';

export const HomeScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, 'HomeScreen'>>();
  const [prices, setPrices] = useState<Cotizacion[] | undefined>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetchDolar();
      setPrices(response);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  }, []);

  const refreshPrices = useCallback(async () => {
    try {
      setIsLoading(true);
      await fetchPrices();
    } finally {
      setIsLoading(false);
    }
  }, [fetchPrices]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const porcentajeColor = useCallback(
    (porcentaje?: string) =>
      porcentaje?.startsWith('-') ? '#af2030' : '#00ff83',
    [],
  );

  const renderItem = useCallback(
    ({item}: {item: Cotizacion}) => {
      return (
        <Pressable
          onPress={() =>
            navigation.navigate('ChartScreen', {
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
      );
    },
    [navigation, porcentajeColor],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={prices}
        renderItem={renderItem}
        keyExtractor={item => item.title}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshPrices} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    padding: 8,
  },
  refreshButton: {
    padding: 16,
  },
  text: {
    color: '#fff',
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
});
