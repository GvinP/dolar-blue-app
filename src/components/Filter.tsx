import {Pressable, StyleSheet, Text} from 'react-native';
import {colors} from '../../assets/colors';
import {FONT_FAMILY} from '../../assets/fonts';

type Props = {
  isSelected: boolean;
  onFilterPress: () => void;
  filterName: string;
  filterWidth: number;
};
export const Filter = ({filterName, isSelected, onFilterPress, filterWidth}: Props) => {
  return (
    <Pressable style={[styles.filterContainer, {width: filterWidth}]} onPress={onFilterPress}>
      <Text style={isSelected ? styles.selectedFilterTitle : styles.filterTitle}>{filterName}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  filterTitle: {
    fontFamily: FONT_FAMILY.bold,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  selectedFilterTitle: {
    fontFamily: FONT_FAMILY.bold,
    color: colors.accentInk,
    fontSize: 12,
    textAlign: 'center',
  },
});
