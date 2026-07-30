import {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
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

const App = () => {
  const [fontsLoaded] = useFonts(fontAssets);

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  // Evita el flash con la fuente de sistema mientras cargan Figtree/Martian Mono
  if (!fontsLoaded) {
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
});

export default App;
