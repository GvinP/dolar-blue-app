import React, {useState} from 'react';
import {View, Button, NativeModules, Text, ScrollView} from 'react-native';
import {Cotizacion, extractCotizaciones, removeDuplicates} from './utils';

// Import the native module
const {WidgetModule} = NativeModules;

const App = () => {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const updateWidget = (text: string) => {
    WidgetModule.updateWidget(text);
  };

  const fetchDolar = async () => {
    try {
      const response = await fetch(`https://www.dolarhoy.com?${new Date()}`);
      const blob = await response.blob();
      const text = await new Response(blob).text();
      const extractedCotizaciones = extractCotizaciones(text);
      console.log(extractedCotizaciones);
      setCotizaciones(extractedCotizaciones);
    } catch (error) {
      console.error('fetch error', error);
    }
  };

  return (
    <View style={{flex: 1, justifyContent: 'center'}}>
      <ScrollView style={{flex: 1, padding: 20}}>
        {removeDuplicates(cotizaciones)
          .filter(cotizacion => cotizacion.title !== 'Won')
          .map((cotizacion, index) => (
            <View key={index} style={{marginBottom: 10}}>
              <Text
                style={{
                  fontWeight: 'bold',
                  fontSize: 20,
                  marginBottom: 10,
                  color: '#cecece',
                }}>
                {cotizacion.title}
              </Text>
              <Text style={{marginBottom: 10, color: '#cecece'}}>
                {cotizacion.compra}
              </Text>
              <Text style={{marginBottom: 10, color: '#cecece'}}>
                {cotizacion.venta}
              </Text>
              <Text style={{marginBottom: 10, color: '#cecece'}}>
                {cotizacion.porcentaje}
              </Text>
            </View>
          ))}
      </ScrollView>
      <Button
        title="Update Widget first Button"
        onPress={() =>
          updateWidget(
            cotizaciones.find(cotizacion => cotizacion.title === 'Dólar cripto')
              ?.compra || 'no data',
          )
        }
      />
      <View style={{marginTop: 20}}>
        <Button title="Button" onPress={fetchDolar} />
      </View>
    </View>
  );
};

export default App;
