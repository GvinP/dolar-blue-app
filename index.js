import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './src/App';
import widgetRefreshTask from './src/widgetRefreshTask';

AppRegistry.registerComponent('DolarBlue', () => App);
AppRegistry.registerHeadlessTask('WidgetRefresh', () => widgetRefreshTask);
