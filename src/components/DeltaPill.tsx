import {StyleSheet, Text, View} from 'react-native';
import {colors} from '../../assets/colors';
import {FONT_FAMILY} from '../../assets/fonts';

type Props = {
  /** String tipo "0.80%" o "-0.32%" — ver formatPct en api/quotes.ts */
  porcentaje?: string;
  size?: 'sm' | 'md';
};

export const DeltaPill = ({porcentaje, size = 'sm'}: Props) => {
  if (!porcentaje) {
    return null;
  }
  const isDown = porcentaje.startsWith('-');
  const label = porcentaje.replace('-', '');

  return (
    <View style={[styles.pill, isDown ? styles.down : styles.up, size === 'md' && styles.pillMd]}>
      <Text
        style={[styles.text, {color: isDown ? colors.down : colors.up}, size === 'md' && styles.textMd]}>
        {isDown ? '▼' : '▲'} {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  pillMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  up: {backgroundColor: colors.upBg},
  down: {backgroundColor: colors.downBg},
  text: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 12,
  },
  textMd: {
    fontSize: 13,
  },
});
