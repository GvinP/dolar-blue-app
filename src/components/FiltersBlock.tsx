import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {Filter} from './Filter';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

export const filters: {name: string; type: Filter; value?: number}[] = [
  {name: 'Semana', type: 'semana', value: 7},
  {name: 'Mes', type: 'mes', value: 30},
  {name: '3 Meses', type: '3meses', value: 90},
  {name: '6 Meses', type: '6meses', value: 180},
  {name: 'Año', type: 'año', value: 365},
  // { name: 'Todo', type: 'todo'},
];
export type Filter = 'semana' | 'mes' | '3meses' | '6meses' | 'año' | 'todo';

type Props = {
  selectedFilter: Filter;
  setSelectedFilter: (filter: Filter) => void;
};

export const FiltersBlock = ({selectedFilter, setSelectedFilter}: Props) => {
  const {width} = useWindowDimensions();
  const filterWidth = (width - 48) / filters.length;
  const animateStyle = useAnimatedStyle(() => {
    return {
      left: withTiming(
        filters.findIndex(item => item.type === selectedFilter) * filterWidth,
      ),
    };
  });
  return (
    <View style={styles.filters}>
      <Animated.View
        style={[styles.activeFilter, {width: filterWidth}, animateStyle]}
      />
      {filters.map((item, index) => (
        <Filter
          key={index}
          filterName={item.name}
          isSelected={item.type === selectedFilter}
          onFilterPress={() => setSelectedFilter(item.type)}
          filterWidth={filterWidth}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    marginHorizontal: 24,
  },
  activeFilter: {
    height: 30,
    backgroundColor: '#00ff83',
    position: 'absolute',
    borderRadius: 4,
  },
});
