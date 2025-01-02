import React from 'react';
import {View, Button, NativeModules} from 'react-native';

// Import the native module
const {WidgetModule} = NativeModules;

const App = () => {
  const updateWidget = (text: string) => {
    WidgetModule.updateWidget(text);
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Button
        title="Update Widget first Button"
        onPress={() => updateWidget('update from first button')}
      />
      <Button
        title="Update Widget second Button"
        onPress={() => updateWidget('second button!!!')}
      />
    </View>
  );
};

export default App;
