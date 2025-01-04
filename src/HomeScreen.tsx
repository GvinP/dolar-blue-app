import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {RootStackParamList} from './types';
import {StackNavigationProp} from '@react-navigation/stack';
import {RefreshIcon} from './icons';
import {Cotizacion, fetchDolar} from './utils';

export const HomeScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, 'HomeScreen'>>();
  const [prices, setPrices] = useState<Cotizacion[] | undefined>([]);
  const [isLoading, setIsLoading] = useState(false);

  const headerRight = useCallback(
    () => (
      <View style={styles.refreshButton}>
        {isLoading ? (
          <ActivityIndicator color="#fff" size={'large'} />
        ) : (
          <Pressable
            onPress={() => {
              fetchPrices();
            }}>
            <RefreshIcon />
          </Pressable>
        )}
      </View>
    ),
    [isLoading],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight,
    });
  }, [navigation, headerRight]);

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      setIsLoading(true);
      const response = await fetchDolar();
      setPrices(response);
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.container}>
        {prices?.map((item, index) => (
          <Pressable
            key={index}
            style={styles.moneda}
            onPress={() => navigation.navigate('ChartScreen')}>
            <View style={styles.row}>
              <Text style={styles.text}>{item.title}</Text>
              <Text
                style={[
                  styles.porcentaje,
                  {
                    color: item.porcentaje?.startsWith('-')
                      ? '#af2030'
                      : '#00ff83',
                  },
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
          </Pressable>
        ))}
      </ScrollView>
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
  button: {
    fontSize: 20,
    textDecorationLine: 'underline',
    color: '#fff',
    padding: 8,
    marginBottom: 8,
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
