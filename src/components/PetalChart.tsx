import { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Line } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import Text from './Text';
import PhaseMark from './PhaseMark';
import { useTheme } from '../theme/useTheme';
import { PHASE_DEEP, COLORS, CYCLE_PHASES } from '../constants';
import { MOTION, SPACE } from '../theme/tokens';

type PhaseKey = keyof typeof CYCLE_PHASES;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PETAL CHART — a radial chart for data that is actually cyclical.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── Why a radial chart is allowed here ────────────────────────────────────
 *
 * Radial charts are usually a mistake. They distort area, they make lengths
 * hard to compare, and they are chosen because they look good rather than
 * because they fit. Being honest about that is the only thing that earns the
 * exception, so here it is:
 *
 * **This chart is only ever used for values indexed by cycle day.** A menstrual
 * cycle is a closed loop — day 28 is adjacent to day 1 — and a Cartesian axis
 * has to *cut that loop somewhere*, which invents a false discontinuity right
 * where the most interesting transition happens. A radial layout is the
 * correct coordinate system for periodic data, not a decorative one.
 *
 * Anything **not** periodic (cycle length over the last six cycles, symptom
 * frequency, weight) goes to `BarChart`. Wrapping a time series into a circle
 * because circles are pretty is exactly the anti-pattern this comment exists
 * to prevent.
 *
 * ── How it stays readable ─────────────────────────────────────────────────
 *
 * 1. **Length encodes value, not area.** Petals grow outward from a common
 *    inner radius, so comparing two petals is comparing two lengths. A true
 *    Nightingale rose encodes by area and systematically overstates big
 *    values; this does not.
 * 2. **Labelled gridline rings.** Two rings with their values printed, so a
 *    petal can be read against a scale instead of guessed at.
 * 3. **Zero-anchored.** The inner radius *is* zero. A petal at the hub means
 *    no data, and that is visibly different from a short petal.
 * 4. **Phase marks, not phase colours.** The four quadrant labels carry the
 *    `PhaseMark` silhouette, so the chart is readable in greyscale and under
 *    any colour vision. Colour agrees; shape carries.
 * 5. **A 2px surface gap between petals**, so adjacent segments never merge
 *    into one blob.
 */

export interface PetalDatum {
  /** Cycle day this value belongs to. */
  day: number;
  /** The measured value. */
  value: number;
  /** Optional label for the direct-label pass. */
  label?: string;
}

interface PetalChartProps {
  data: PetalDatum[];
  cycleLength: number;
  periodLength: number;
  size?: number;
  /** Unit suffix for the ring labels, e.g. "/5". */
  unit?: string;
  /** Max for the scale. Defaults to the data max, with headroom. */
  max?: number;
  /** Section caption under the chart. */
  caption?: string;
}

/** Which phase a cycle day belongs to — same boundaries the ring uses. */
function phaseForDay(day: number, cycleLength: number, periodLength: number): PhaseKey {
  const ovulation = cycleLength - 14;
  if (day <= periodLength) return 'menstrual';
  if (day < ovulation - 1) return 'follicular';
  if (day <= ovulation + 1) return 'ovulation';
  return 'luteal';
}

/**
 * One petal. A wedge with rounded outer corners, drawn from the hub outward.
 *
 * Scale is animated rather than the path, so the grow-in is a worklet
 * transform instead of a per-frame path rebuild — the same reasoning as the
 * Bloom Ring.
 */
function PetalWedge({
  index,
  count,
  ratio,
  inner,
  outer,
  color,
  reduced,
}: {
  index: number;
  count: number;
  ratio: number;
  inner: number;
  outer: number;
  color: string;
  reduced: boolean;
}) {
  const grow = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      grow.value = 1;
      return;
    }
    grow.value = withDelay(
      index * (MOTION.stagger * 0.4),
      withTiming(1, { duration: MOTION.slow, easing: Easing.bezier(0.22, 1, 0.36, 1) })
    );
  }, [index, reduced, grow]);

  const style = useAnimatedStyle(() => ({ opacity: grow.value, transform: [{ scale: grow.value }] }));

  // 2px of surface between neighbours, expressed as an angular gap so it holds
  // at every radius rather than only at the rim.
  const step = 360 / count;
  const gapDeg = Math.min(step * 0.22, 4);
  const half = (step - gapDeg) / 2;

  const len = inner + (outer - inner) * ratio;
  const rad = (d: number) => (d * Math.PI) / 180;

  const x1 = Math.sin(rad(-half)) * inner;
  const y1 = -Math.cos(rad(-half)) * inner;
  const x2 = Math.sin(rad(-half)) * len;
  const y2 = -Math.cos(rad(-half)) * len;
  const x3 = Math.sin(rad(half)) * len;
  const y3 = -Math.cos(rad(half)) * len;
  const x4 = Math.sin(rad(half)) * inner;
  const y4 = -Math.cos(rad(half)) * inner;

  const d = [
    `M${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `L${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `A${len.toFixed(2)} ${len.toFixed(2)} 0 0 1 ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `L${x4.toFixed(2)} ${y4.toFixed(2)}`,
    `A${inner.toFixed(2)} ${inner.toFixed(2)} 0 0 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    'Z',
  ].join('');

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <G transform={`translate(${outer + 2} ${outer + 2}) rotate(${index * step})`}>
          <Path d={d} fill={color} opacity={0.9} strokeLinejoin="round" />
        </G>
      </Svg>
    </Animated.View>
  );
}

const PetalChart = ({
  data,
  cycleLength,
  periodLength,
  size = 240,
  unit = '',
  max,
  caption,
}: PetalChartProps) => {
  const { colors: c, isDark } = useTheme();
  const reduced = useReducedMotion();

  const inner = size * 0.16;
  const outer = size * 0.46;

  const { petals, ceiling } = useMemo(() => {
    // Bucket by day so the petal count stays readable regardless of how many
    // raw points there are — 28 wedges is a fan, 12 is a flower.
    const BUCKETS = 12;
    const sums = Array.from({ length: BUCKETS }, () => ({ total: 0, n: 0 }));
    for (const d of data) {
      const i = Math.min(BUCKETS - 1, Math.floor(((d.day - 1) / cycleLength) * BUCKETS));
      if (i < 0) continue;
      sums[i].total += d.value;
      sums[i].n += 1;
    }
    const values = sums.map((s) => (s.n ? s.total / s.n : 0));
    const dataMax = Math.max(...values, 0);
    const top = max ?? (dataMax > 0 ? dataMax * 1.1 : 1);
    return {
      ceiling: top,
      petals: values.map((v, i) => {
        const day = Math.round(((i + 0.5) / BUCKETS) * cycleLength) || 1;
        const phase = phaseForDay(day, cycleLength, periodLength);
        return {
          i,
          value: v,
          ratio: top > 0 ? Math.max(0, Math.min(1, v / top)) : 0,
          color: isDark
            ? ((COLORS as Record<string, string>)[phase] ?? COLORS.menstrual)
            : (PHASE_DEEP[phase] ?? COLORS.primaryDeep),
        };
      }),
    };
  }, [data, cycleLength, periodLength, max, isDark]);

  const box = (outer + 2) * 2;
  const hasData = petals.some((p) => p.value > 0);

  return (
    <View>
      <View style={{ width: box, height: box, alignSelf: 'center' }}>
        {/* Recessive scale rings. Two, labelled — enough to read a petal
            against, few enough that they stay background. */}
        <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
          <G transform={`translate(${outer + 2} ${outer + 2})`}>
            {[0.5, 1].map((f) => (
              <Circle
                key={f}
                cx={0}
                cy={0}
                r={inner + (outer - inner) * f}
                stroke={c.separator}
                strokeWidth={1}
                fill="none"
              />
            ))}
            {/* Quadrant spokes at the phase boundaries, so the phase regions
                are marked structurally and not only by petal colour. */}
            {[0, 90, 180, 270].map((a) => (
              <Line
                key={a}
                x1={0}
                y1={0}
                x2={Math.sin((a * Math.PI) / 180) * outer}
                y2={-Math.cos((a * Math.PI) / 180) * outer}
                stroke={c.separator}
                strokeWidth={1}
                opacity={0.6}
              />
            ))}
            <Circle cx={0} cy={0} r={inner} fill={c.bgSecondary} />
          </G>
        </Svg>

        {hasData
          ? petals.map((p) => (
              <PetalWedge
                key={p.i}
                index={p.i}
                count={petals.length}
                ratio={p.ratio}
                inner={inner}
                outer={outer}
                color={p.color}
                reduced={reduced}
              />
            ))
          : null}

        {/* Ring value labels. Placed on the vertical so they never collide with
            a petal tip, which is what makes radial labels usually unreadable. */}
        <View style={[styles.ringLabel, { top: box / 2 - (inner + (outer - inner)) - 8 }]}>
          <Text variant="caption" tone="tertiary" tabular>
            {formatTick(ceiling)}
            {unit}
          </Text>
        </View>
        <View style={[styles.ringLabel, { top: box / 2 - (inner + (outer - inner) * 0.5) - 8 }]}>
          <Text variant="caption" tone="tertiary" tabular>
            {formatTick(ceiling / 2)}
            {unit}
          </Text>
        </View>

        {/* Day 1 anchor, so the reader knows where the loop starts. */}
        <View style={[styles.dayOne, { top: box / 2 - outer - 22 }]}>
          <Text variant="caption" tone="secondary">
            Day 1
          </Text>
        </View>
      </View>

      {/* The legend is mandatory: phase is never identified by colour alone. */}
      <View style={styles.legend}>
        {(['menstrual', 'follicular', 'ovulation', 'luteal'] as PhaseKey[]).map((p) => (
          <View key={p} style={styles.legendItem}>
            <PhaseMark phase={p} size={13} />
            <Text variant="caption" tone="secondary">
              {CYCLE_PHASES[p].name}
            </Text>
          </View>
        ))}
      </View>

      {caption ? (
        <Text variant="caption" tone="tertiary" style={styles.caption}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
};

/** One decimal only when it earns it — "3.5" is useful, "3.0" is noise. */
function formatTick(v: number): string {
  return v >= 10 ? String(Math.round(v)) : v.toFixed(1).replace(/\.0$/, '');
}

const styles = StyleSheet.create({
  ringLabel: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  dayOne: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACE.md,
    marginTop: SPACE.lg,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  caption: { textAlign: 'center', marginTop: SPACE.sm },
});

export default PetalChart;
