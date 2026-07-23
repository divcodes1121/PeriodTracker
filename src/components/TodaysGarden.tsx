import { useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { BLOOM } from '../constants';
import { MOTION, RADIUS, SPACE } from '../theme/tokens';
import { Plant, gardenFor, stageForLogs, stageProgress } from '../utils/garden';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TODAY'S GARDEN — what you get for showing up.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A strip of soil that fills in as you log. The mechanic and its reasoning
 * live in `utils/garden.ts` (short version: a garden only ever accumulates,
 * where a streak can go to zero on the one week you were too unwell to open a
 * period tracker). This file only draws it.
 *
 * ── The two things that make it feel alive ────────────────────────────────
 *
 * **A single shared wind.** One animated value drives every plant's sway, with
 * each plant reading it at its own phase and amplitude derived from its own
 * height. Fourteen plants, one node. Tall flowers move more than grass,
 * because they do.
 *
 * **New plants arrive rather than appear.** The most recently added plant
 * springs up on mount with a delay proportional to its index, so opening Home
 * after logging shows the garden *growing*, not a garden that is already
 * different. That two-second difference is the entire reward.
 *
 * ── Restraint ─────────────────────────────────────────────────────────────
 *
 * No score, no counter, no percentage on the face of it. There is one thin
 * progress line under the soil and a warm sentence, and that is the whole of
 * the gamification. The moment this shows "12/20" it becomes a chore.
 */

interface TodaysGardenProps {
  /** Total qualifying logs. See `countGardenLogs`. */
  logs: number;
  height?: number;
  /** Hide the caption and progress line — for compact placements. */
  bare?: boolean;
}

/** The garden's four hues, warm to cool. Indexed by `Plant.hue`. */
const HUES = [BLOOM.rose, BLOOM.blossom, BLOOM.gold, BLOOM.lavender];

/**
 * One plant, swaying on the shared wind.
 *
 * Everything is drawn from a common baseline at y=0 pointing up, so a plant is
 * positioned purely by `left` and rotated about its base — which is what makes
 * the sway look hinged at the soil instead of sliding.
 */
function PlantView({
  plant,
  index,
  wind,
  h,
  reduced,
  isDark,
}: {
  plant: Plant;
  index: number;
  wind: SharedValue<number>;
  h: number;
  reduced: boolean;
  isDark: boolean;
}) {
  const grow = useSharedValue(reduced ? 1 : 0);
  const hue = HUES[plant.hue % HUES.length];
  const stem = isDark ? BLOOM.sage.pastel : BLOOM.sage.deep;

  useEffect(() => {
    if (reduced) {
      grow.value = 1;
      return;
    }
    grow.value = withDelay(
      index * 70,
      withTiming(1, { duration: MOTION.bloom, easing: Easing.bezier(0.16, 1, 0.3, 1) })
    );
  }, [index, reduced, grow]);

  const style = useAnimatedStyle(() => {
    // Each plant reads the shared wind at its own phase, so the row ripples
    // instead of swinging as one board. Amplitude scales with height because a
    // blade of grass and a flower do not move the same amount.
    const sway = Math.sin(wind.value * Math.PI * 2 + index * 0.9) * (2 + plant.height * 5);
    return {
      transform: [
        { translateY: h * (1 - grow.value) * 0.5 },
        { scaleY: grow.value },
        { rotate: `${plant.lean + sway}deg` },
      ],
      opacity: grow.value,
    };
  });

  const ph = h * plant.height;
  const pw = Math.max(14, ph * 0.6);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.plant,
        { left: `${plant.x * 100}%`, width: pw, height: ph, marginLeft: -pw / 2 },
        style,
      ]}
    >
      <Svg width={pw} height={ph} viewBox={`0 0 ${pw} ${ph}`}>
        {plant.kind === 'grass' && (
          <>
            <Path
              d={`M${pw / 2} ${ph}C${pw * 0.42} ${ph * 0.5} ${pw * 0.3} ${ph * 0.3} ${pw * 0.18} 0`}
              stroke={stem}
              strokeWidth={2.2}
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d={`M${pw / 2} ${ph}C${pw * 0.58} ${ph * 0.5} ${pw * 0.7} ${ph * 0.32} ${pw * 0.84} ${ph * 0.1}`}
              stroke={stem}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              opacity={0.75}
            />
          </>
        )}

        {plant.kind === 'sprout' && (
          <>
            <Path
              d={`M${pw / 2} ${ph}V${ph * 0.3}`}
              stroke={stem}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
            <Path
              d={`M${pw / 2} ${ph * 0.62}C${pw * 0.2} ${ph * 0.62} ${pw * 0.08} ${ph * 0.44} ${pw * 0.06} ${ph * 0.28}c${pw * 0.24} 0 ${pw * 0.42} ${ph * 0.14} ${pw * 0.44} ${ph * 0.34}Z`}
              fill={BLOOM.sage.pastel}
            />
            <Path
              d={`M${pw / 2} ${ph * 0.48}c${pw * 0.28} 0 ${pw * 0.44} -${ph * 0.16} ${pw * 0.46} -${ph * 0.32}c-${pw * 0.26} 0 -${pw * 0.44} ${ph * 0.12} -${pw * 0.46} ${ph * 0.32}Z`}
              fill={isDark ? BLOOM.sage.pastel : BLOOM.sage.deep}
              opacity={0.8}
            />
          </>
        )}

        {plant.kind === 'bud' && (
          <>
            <Path
              d={`M${pw / 2} ${ph}V${ph * 0.34}`}
              stroke={stem}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
            <Path
              d={`M${pw / 2} ${ph * 0.66}c-${pw * 0.26} 0 -${pw * 0.38} -${ph * 0.12} -${pw * 0.4} -${ph * 0.26}c${pw * 0.24} 0 ${pw * 0.38} ${ph * 0.08} ${pw * 0.4} ${ph * 0.26}Z`}
              fill={BLOOM.sage.pastel}
            />
            <Ellipse
              cx={pw / 2}
              cy={ph * 0.24}
              rx={pw * 0.19}
              ry={ph * 0.22}
              fill={hue.pastel}
            />
            <Ellipse
              cx={pw / 2}
              cy={ph * 0.3}
              rx={pw * 0.19}
              ry={ph * 0.14}
              fill={BLOOM.sage.pastel}
              opacity={0.85}
            />
          </>
        )}

        {plant.kind === 'flower' && (
          <>
            <Path
              d={`M${pw / 2} ${ph}V${ph * 0.4}`}
              stroke={stem}
              strokeWidth={2.4}
              strokeLinecap="round"
            />
            <Path
              d={`M${pw / 2} ${ph * 0.7}c-${pw * 0.28} 0 -${pw * 0.4} -${ph * 0.12} -${pw * 0.42} -${ph * 0.26}c${pw * 0.26} 0 ${pw * 0.4} ${ph * 0.08} ${pw * 0.42} ${ph * 0.26}Z`}
              fill={BLOOM.sage.pastel}
            />
            <G transform={`translate(${pw / 2} ${ph * 0.24})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <Ellipse
                  key={a}
                  cx={0}
                  cy={-ph * 0.11}
                  rx={pw * 0.13}
                  ry={ph * 0.13}
                  fill={hue.pastel}
                  transform={`rotate(${a})`}
                />
              ))}
              <Circle cx={0} cy={0} r={pw * 0.09} fill={BLOOM.gold.pastel} />
            </G>
          </>
        )}
      </Svg>
    </Animated.View>
  );
}

const TodaysGarden = ({ logs, height = 116, bare = false }: TodaysGardenProps) => {
  const { colors: c, isDark } = useTheme();
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const wind = useSharedValue(0);

  const plants = useMemo(() => gardenFor(logs), [logs]);
  const stage = stageForLogs(logs);
  const progress = stageProgress(logs);

  useEffect(() => {
    if (reduced) {
      wind.value = 0;
      return;
    }
    wind.value = withRepeat(
      withSequence(
        withTiming(1, { duration: MOTION.ambient * 1.6, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: MOTION.ambient * 1.6, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(wind);
  }, [reduced, wind]);

  const soil = isDark ? 'rgba(111,196,148,0.16)' : 'rgba(58,138,94,0.13)';
  const plantArea = height - 26;

  return (
    <View accessibilityRole="image" accessibilityLabel={`Your garden: ${stage.label}`}>
      <View style={[styles.strip, { height }]}>
        {/* The soil. A soft mound rather than a rectangle — a straight edge
            reads as a progress bar, which is exactly the framing to avoid. */}
        <Svg width={width} height={34} style={styles.soil}>
          <Path
            d={`M0 34C${width * 0.18} 12 ${width * 0.42} 6 ${width * 0.5} 6S${width * 0.82} 12 ${width} 34Z`}
            fill={soil}
          />
        </Svg>

        <View style={[styles.row, { height: plantArea }]}>
          {plants.map((p, i) => (
            <PlantView
              key={`${p.kind}-${i}`}
              plant={p}
              index={i}
              wind={wind}
              h={plantArea}
              reduced={reduced}
              isDark={isDark}
            />
          ))}
        </View>

        {plants.length === 0 ? (
          <View style={styles.emptyHint}>
            <Text variant="caption" tone="tertiary">
              Log anything to plant the first one
            </Text>
          </View>
        ) : null}
      </View>

      {!bare && (
        <View style={styles.footer}>
          <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
            {stage.label}
          </Text>
          {/* The entire gamification surface: one hairline. No number, no
              fraction, no badge. */}
          <View style={[styles.track, { backgroundColor: c.trackNeutral }]}>
            <View
              style={[
                styles.fill,
                { width: `${Math.round(progress * 100)}%`, backgroundColor: BLOOM.sage.deep },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: { justifyContent: 'flex-end', overflow: 'hidden' },
  soil: { position: 'absolute', bottom: -8, left: -SPACE.xl },
  row: { position: 'relative', width: '100%' },
  plant: { position: 'absolute', bottom: 0 },
  emptyHint: { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginTop: SPACE.sm,
  },
  track: {
    width: 64,
    height: 4,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: RADIUS.pill },
});

export default TodaysGarden;
