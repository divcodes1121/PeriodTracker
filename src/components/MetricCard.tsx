import { View, StyleSheet } from 'react-native';
import Surface from './Surface';
import Text from './Text';
import Icon, { IconName } from './Icon';
import AnimatedNumber from './AnimatedNumber';
import { useTheme } from '../theme/useTheme';
import { inkFor } from '../constants';
import { SPACE, RADIUS } from '../theme/tokens';

interface MetricCardProps {
  label: string;
  /** Numeric values animate; strings render as-is (e.g. "Tomorrow"). */
  value: number | string;
  unit?: string;
  icon: IconName;
  accent: string;
  caption?: string;
  onPress?: () => void;
}

/**
 * Compact health metric tile — the Apple Health "one number, one meaning" unit.
 *
 * The number is the loudest thing on the card by a wide margin; the label is a
 * quiet overline. That inversion (data first, chrome second) is most of what
 * separates a health product from a dashboard.
 */
const MetricCard = ({ label, value, unit, icon, accent, caption, onPress }: MetricCardProps) => {
  const { colors: c, isDark } = useTheme();

  return (
    <Surface
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      style={styles.card}
    >
      <View style={[styles.iconWrap, { backgroundColor: isDark ? c.fill : `${accent}1F` }]}>
        {/* Pastel accents fail 3:1 on their own light tint — ink them in light mode. */}
        <Icon name={icon} size={17} color={isDark ? accent : inkFor(accent)} />
      </View>

      <View style={styles.valueRow}>
        {typeof value === 'number' ? (
          <AnimatedNumber value={value} variant="title2" />
        ) : (
          <Text variant="title3" numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
        )}
        {unit ? (
          <Text variant="caption" tone="tertiary" style={styles.unit}>
            {unit}
          </Text>
        ) : null}
      </View>

      <Text variant="overline" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      {caption ? (
        <Text variant="caption" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
          {caption}
        </Text>
      ) : null}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: { flex: 1, padding: SPACE.lg },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.md,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  unit: { marginBottom: 2 },
});

export default MetricCard;
