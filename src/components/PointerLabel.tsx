import {StyleSheet, Text, View} from 'react-native';
import {lineDataItem} from 'react-native-gifted-charts';
import {colors} from '../../assets/colors';
import {FONT_FAMILY} from '../../assets/fonts';

type Props = {
  items: lineDataItem;
};

export const PointerLabel = ({items}: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.date}>{items.dataPointText}</Text>
      <View style={styles.bubble}>
        <Text style={[styles.price, styles.ticker]}>{'$' + items.value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 90,
    width: 100,
    justifyContent: 'center',
    marginTop: -20,
    marginLeft: -40,
  },
  date: {
    fontFamily: FONT_FAMILY.regular,
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'center',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticker: {
    fontFamily: FONT_FAMILY.ticker,
  },
  price: {
    textAlign: 'center',
    color: colors.accent,
    fontSize: 14,
  },
});
