import {Text, View} from 'react-native';
import {lineDataItem} from 'react-native-gifted-charts';

type Props = {
  items: lineDataItem;
};

export const PointerLabel = ({items}: Props) => {
  return (
    <View
      style={{
        height: 90,
        width: 100,
        justifyContent: 'center',
        marginTop: -20,
        marginLeft: -40,
      }}>
      <Text
        style={{
          color: 'white',
          fontSize: 14,
          marginBottom: 6,
          textAlign: 'center',
        }}>
        {items.dataPointText}
      </Text>

      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: '#252900',
        }}>
        <Text
          style={{fontWeight: 'bold', textAlign: 'center', color: '#00ff83'}}>
          {'$' + items.value}
        </Text>
      </View>
    </View>
  );
};
