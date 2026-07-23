import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { MOTION, SPACE } from '../theme/tokens';

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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BAR CHART — magnitude, for anything that is not periodic.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cycle length over the last six cycles, symptom counts, sleep hours. Anything
 * indexed by *cycle day* belongs in `PetalChart` instead, because that data is
 * a closed loop and a Cartesian axis has to cut it somewhere.
 *
 * ── Mark specification ────────────────────────────────────────────────────
 *
 * The details that separate a chart from a picture of a chart:
 *
 *   • **Rounded data-end only.** The top corners are rounded; the baseline
 *     corners are square. A fully rounded bar detaches visually from its
 *     axis and starts to read as a floating pill.
 *   • **Zero-anchored, always.** Bar height is proportional to value with the
 *     axis at zero. Truncating the axis to "show the trend better" is lying
 *     with geometry.
 *   • **A 2px surface gap between bars**, so neighbours never merge.
 *   • **Selective direct labels.** Only the tallest bar carries its number.
 *     Labelling every bar turns a chart into a table with decoration; the
 *     reader wanted the shape, and can get exact values elsewhere.
 *   • **Recessive grid.** One dashed mean line at most, in tertiary ink.
 *
 * Hand-built rather than pulled from a chart library: every library ships its
 * own grid, label and shadow conventions that fight the design system, and
 * none of them can do the staggered grow-in on the UI thread.
 */

/** One bar, growing from the baseline with a staggered delay. */
function Column({
  bar,
  ratio,
  color,
  index,
  dim,
  showValue,
  unit,
}: {
  bar: Bar;
  ratio: number;
  color: string;
  index: number;
  dim: string;
  showValue: boolean;
  unit: string;
}) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? ratio : 0);

  useEffect(() => {
    if (reduced) {
      grow.value = ratio;
      return;
    }
    grow.value = withDelay(
      index * MOTION.stagger,
      withTiming(ratio, { duration: MOTION.slow, easing: Easing.bezier(0.22, 1, 0.36, 1) })
    );
  }, [ratio, index, reduced, grow]);

  const style = useAnimatedStyle(() => ({ height: `${grow.value * 100}%` }));

  return (
    <View style={styles.col}>
      {/* Direct label sits above the bar, not on it — a number inside a bar
          fails contrast the moment the bar is short. */}
      {showValue ? (
        <Text variant="caption" tone="secondary" tabular style={styles.value}>
          {Math.round(bar.value)}
          {unit}
        </Text>
      ) : null}
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

const BarChart = ({ data, color, height = 148, unit = '', showAverage = false }: BarChartProps) => {
  const { colors: c } = useTheme();
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value));
  const mean = data.reduce((t, d) => t + d.value, 0) / data.length;
  // Head-room so the tallest bar never touches the top rule.
  const ceiling = max * 1.15 || 1;
  const peak = data.findIndex((d) => d.value === max);

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
              // Only the peak is labelled. See the mark spec above.
              showValue={i === peak}
              unit={unit}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  plot: { justifyContent: 'flex-end' },
  // The gap is the "2px of surface between fills" rule, at a size that reads
  // on a phone.
  cols: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.sm, flex: 1 },
  col: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  // Rounded data-end, square baseline.
  // Capped width. Two bars stretched across a whole card read as colour
  // blocks rather than as a chart: the eye starts comparing areas instead of
  // heights, which is the exact distortion a bar chart exists to avoid.
  bar: {
    width: '100%',
    maxWidth: 56,
    alignSelf: 'center',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 3,
  },
  value: { marginBottom: SPACE.xs },
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
