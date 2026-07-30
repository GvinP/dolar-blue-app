import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {Filter} from './Filter';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {colors} from '../../assets/colors';

export const filters: {name: string; type: Filter; value?: number}[] = [
  {name: 'Sem', type: 'semana', value: 7},
  {name: 'Mes', type: 'mes', value: 30},
  {name: '3M', type: '3meses', value: 90},
  {name: '6M', type: '6meses', value: 180},
  {name: 'Año', type: 'año', value: 365},
];
export type Filter = 'semana' | 'mes' | '3meses' | '6meses' | 'año' | 'todo';

type Props = {
  selectedFilter: Filter;
  setSelectedFilter: (filter: Filter) => void;
};

export const FiltersBlock = ({selectedFilter, setSelectedFilter}: Props) => {
  const {width} = useWindowDimensions();
  const filterWidth = (width - 32 - 8) / filters.length;
  const animateStyle = useAnimatedStyle(() => {
    return {
      left: withTiming(
        4 + filters.findIndex(item => item.type === selectedFilter) * filterWidth,
      ),
    };
  });
  return (
    <View style={styles.filters}>
      <Animated.View style={[styles.activeFilter, {width: filterWidth}, animateStyle]} />
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  activeFilter: {
    height: 32,
    backgroundColor: colors.accent,
    position: 'absolute',
    borderRadius: 10,
  },
});
