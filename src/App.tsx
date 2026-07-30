import {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {useFonts} from 'expo-font';
import {HomeScreen} from './HomeScreen';
import {ChartScreen} from './ChartScreen';
import {SettingsScreen} from './SettingsScreen';
import {RootStackParamList} from './types';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {registerForPushNotifications} from './notifications';
import {fontAssets, FONT_FAMILY} from '../assets/fonts';
import {colors} from '../assets/colors';

const Stack = createStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

const headerOptions = {
  headerStyle: {backgroundColor: colors.background, shadowOpacity: 0, elevation: 0},
  headerTintColor: colors.text,
  headerTitleStyle: {fontFamily: FONT_FAMILY.bold},
  headerBackTitleVisible: false,
};

// Si la carga de fuentes tarda más que esto (o nunca resuelve), arrancamos
// igual con la fuente de sistema — mejor eso que una pantalla negra permanente.
const FONT_LOAD_TIMEOUT_MS = 4000;

const App = () => {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  if (fontError) {
    return (
      <View style={[styles.loading, styles.errorPadding]}>
        <Text style={styles.errorText}>Error cargando fuentes:{'\n'}{String(fontError)}</Text>
      </View>
    );
  }

  // Evita el flash con la fuente de sistema mientras cargan Figtree/Martian Mono
  if (!fontsLoaded && !timedOut) {
    return <View style={styles.loading} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
    <GestureHandlerRootView>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{...headerOptions, headerShadowVisible: false}}>
          <Stack.Screen
            name="HomeScreen"
            component={HomeScreen}
            options={{title: 'DólarBlue'}}
          />
          <Stack.Screen
            name="ChartScreen"
            component={ChartScreen}
            options={({route}) => ({title: route.params.title})}
          />
          <Stack.Screen
            name="SettingsScreen"
            component={SettingsScreen}
            options={{title: 'Ajustes'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorPadding: {
    padding: 20,
    justifyContent: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
  },
});

export default App;
