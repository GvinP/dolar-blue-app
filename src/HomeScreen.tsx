import {
  Text,
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {useCallback} from 'react';
import {useNavigation} from '@react-navigation/native';
import {RootStackParamList, Cotizacion} from './types';
import {StackNavigationProp} from '@react-navigation/stack';
import {fetchLatestQuotes} from './api/quotes';
import {useQuery} from '@tanstack/react-query';

export const HomeScreen = () => {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, 'HomeScreen'>>();

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
});
