import { Pressable, StyleSheet, Text } from 'react-native';
type Props = {
  isSelected: boolean;
  onFilterPress: () => void;
  filterName: string;
  filterWidth: number;
};
export const Filter = ({
  filterName,
  isSelected,
  onFilterPress,
  filterWidth,
}: Props) => {
  return (
    <Pressable
      style={[styles.filterContainer, { width: filterWidth }]}
      onPress={onFilterPress}
    >
      <Text
        style={isSelected ? styles.selectedFilterTitle : styles.filterTitle}
      >
        {filterName}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  filterTitle: {
    color: '#00ff83',
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  selectedFilterTitle: {
    color: '#25292e',
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
});
