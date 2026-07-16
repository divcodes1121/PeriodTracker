import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { MOTION, RADIUS, SPACE } from '../theme/tokens';

export interface Bar {
  label: string;
  value: number;
  /** Highlight this bar (e.g. the current cycle). */
  emphasis?: boolean;
}

interface BarChartProps {
  data: Bar[];
  color: string;
  height?: number;
  unit?: string;
  /** Draws a dashed mean line across the plot. */
  showAverage?: boolean;
}

/** One bar, growing from the baseline with a staggered delay. */
function Column({
  bar,
  ratio,
  color,
  index,
  dim,
}: {
  bar: Bar;
  ratio: number;
  color: string;
  index: number;
  dim: string;
}) {
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = withDelay(
      index * MOTION.stagger,
      withTiming(ratio, { duration: MOTION.slow, easing: Easing.bezier(0.22, 1, 0.36, 1) })
    );
  }, [ratio, index, grow]);

  const style = useAnimatedStyle(() => ({ height: `${grow.value * 100}%` }));

  return (
    <View style={styles.col}>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.bar,
            { backgroundColor: bar.emphasis === false ? dim : color },
            style,
          ]}
        />
      </View>
      <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.colLabel}>
        {bar.label}
      </Text>
    </View>
  );
}

/**
 * Apple Health-style bar series.
 *
 * Deliberately hand-built rather than pulled from react-native-chart-kit: that
 * library ships its own grid, label and shadow conventions that fight the
 * design system, and it can't do the staggered grow-in. Bars are scaled against
 * a zero-anchored axis so relative heights stay honest.
 */
const BarChart = ({ data, color, height = 148, unit = '', showAverage = false }: BarChartProps) => {
  const { colors: c } = useTheme();
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value));
  const mean = data.reduce((t, d) => t + d.value, 0) / data.length;
  // Head-room so the tallest bar never touches the top rule.
  const ceiling = max * 1.15 || 1;

  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {showAverage && (
          <View
            style={[
              styles.avgLine,
              { bottom: `${(mean / ceiling) * 100}%`, borderColor: c.textTertiary },
            ]}
          >
            <View style={[styles.avgPill, { backgroundColor: c.card }]}>
              <Text variant="caption" tone="tertiary" tabular>
                avg {Math.round(mean)}
                {unit}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.cols}>
          {data.map((b, i) => (
            <Column
              key={`${b.label}-${i}`}
              bar={b}
              ratio={b.value / ceiling}
              color={color}
              index={i}
              dim={c.fillStrong}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  plot: { justifyContent: 'flex-end' },
  cols: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.sm, flex: 1 },
  col: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: RADIUS.xs, minHeight: 3 },
  colLabel: { marginTop: SPACE.sm },
  avgLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.6,
    zIndex: 1,
    alignItems: 'flex-end',
  },
  avgPill: {
    paddingHorizontal: SPACE.sm,
    transform: [{ translateY: -9 }],
  },
});

export default BarChart;
