// import {NativeModules} from 'react-native';
import {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {HomeScreen} from './HomeScreen';
import {ChartScreen} from './ChartScreen';
import {RootStackParamList} from './types';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {registerForPushNotifications} from './notifications';

// const {WidgetModule} = NativeModules;
// const updateWidget = (text: string) => {
//   WidgetModule.updateWidget(text);
// };

const Stack = createStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
    <GestureHandlerRootView>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="HomeScreen"
            component={HomeScreen}
            options={{
              title: 'Home',
              headerStyle: {backgroundColor: '#25292e'},
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen
            name="ChartScreen"
            component={ChartScreen}
            options={{
              title: 'Chart',
              headerStyle: {backgroundColor: '#25292e'},
              headerTintColor: '#fff',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
    </QueryClientProvider>
  );
};

export default App;
