// import {NativeModules} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {HomeScreen} from './HomeScreen';
import {ChartScreen} from './ChartScreen';
import {RootStackParamList} from './types';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

// const {WidgetModule} = NativeModules;
// const updateWidget = (text: string) => {
//   WidgetModule.updateWidget(text);
// };

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  return (
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
  );
};

export default App;
