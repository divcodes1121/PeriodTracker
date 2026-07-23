import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  useReducedMotion,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BLOOM } from '../constants';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PETAL BURST — the celebration.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Fires when something is completed: a period logged, a mood saved, a reset
 * finished. Petals, not confetti rectangles — confetti belongs to a party, and
 * Bloomly is not throwing you one. It is noticing.
 *
 * ── The rules that keep it from being annoying ────────────────────────────
 *
 *   • **It never blocks.** `pointerEvents="none"`, absolutely positioned, and
 *     the screen underneath stays fully interactive throughout. A celebration
 *     you have to wait out is a penalty for succeeding.
 *   • **It is short.** ~1.5s including the fade. Long enough to register,
 *     short enough that the fifth time is not tedious — and it *will* be seen
 *     hundreds of times.
 *   • **It falls.** Petals arc outward and then drop under gravity, tumbling
 *     as they go. Radial-only bursts read as a firework; falling reads as a
 *     flower coming apart, which is the brand.
 *   • **Reduced motion silences it entirely** — no fade-in substitute. The
 *     haptic still fires, so the completion is still acknowledged through a
 *     channel that doesn't move.
 *
 * Cost is one animated node per petal for ~1.5s, then the whole thing
 * unmounts. That is affordable exactly because it is transient; nothing here
 * would be acceptable as an idle state.
 */

const PETAL_COUNT = 16;

/** Petals take the brand's warm half — a lavender confetti reads as cold. */
const HUES = [
  BLOOM.blossom.pastel,
  BLOOM.rose.pastel,
  BLOOM.peach.pastel,
  BLOOM.gold.pastel,
  BLOOM.lilac.pastel,
];

interface Spec {
  hue: string;
  /** Launch angle in radians, biased upward. */
  angle: number;
  speed: number;
  size: number;
  spin: number;
  delay: number;
  drift: number;
}

/** Deterministic per-burst layout, so a burst is stable across re-renders. */
function build(seed: number): Spec[] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return Array.from({ length: PETAL_COUNT }, () => ({
    hue: HUES[Math.floor(rand() * HUES.length)],
    // Biased to the upper half: petals are thrown up and then fall, which is
    // what gives the burst an arc instead of a starburst.
    angle: -Math.PI * 0.9 + rand() * Math.PI * 0.8,
    speed: 120 + rand() * 190,
    size: 9 + rand() * 9,
    spin: (rand() - 0.5) * 900,
    delay: rand() * 130,
    drift: (rand() - 0.5) * 90,
  }));
}

function Petal({ spec, t }: { spec: Spec; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    // Each petal starts a beat late, so the burst reads as a scatter rather
    // than as sixteen things leaving on the same frame. Re-normalised to 0..1
    // so every petal still finishes inside the same window.
    const k = Math.max(0, Math.min(1, (t.value - spec.delay / 1500) / (1 - spec.delay / 1500)));
    // Ballistic: constant horizontal velocity, gravity on the vertical. The
    // quadratic term is the entire difference between "falling" and "sliding".
    const x = Math.cos(spec.angle) * spec.speed * k + spec.drift * k * k;
    const y = Math.sin(spec.angle) * spec.speed * k + 620 * k * k;
    return {
      opacity: interpolate(k, [0, 0.12, 0.72, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${spec.spin * k}deg` },
        { scale: interpolate(k, [0, 0.2, 1], [0.4, 1, 0.86], Extrapolation.CLAMP) },
      ],
    };
  });

  const w = spec.size * 0.62;
  const h = spec.size;

  return (
    <Animated.View style={[styles.petal, { width: w, height: h }, style]}>
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <Path
          d={`M${w / 2} 0C${w} ${h * 0.3} ${w} ${h * 0.72} ${w / 2} ${h}C0 ${h * 0.72} 0 ${h * 0.3} ${w / 2} 0Z`}
          fill={spec.hue}
        />
      </Svg>
    </Animated.View>
  );
}

interface PetalBurstProps {
  /**
   * Increment to fire. A counter rather than a boolean, so two completions in
   * a row both play — a boolean would need a reset tick between them and that
   * is exactly the sort of state bug that ships.
   */
  trigger: number;
  /** Origin as a fraction of the screen. Defaults to just above centre. */
  originX?: number;
  originY?: number;
  /** Fire a success haptic alongside. */
  haptic?: boolean;
}

const PetalBurst = ({
  trigger,
  originX = 0.5,
  originY = 0.42,
  haptic = true,
}: PetalBurstProps) => {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  const specs = useMemo(() => build(trigger * 7919 + 13), [trigger]);

  useEffect(() => {
    if (trigger === 0) return;
    if (haptic) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    if (reduced) return;
    t.value = 0;
    t.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) });
  }, [trigger, reduced, haptic, t]);

  if (reduced || trigger === 0) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { left: width * originX, top: height * originY }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {specs.map((spec, i) => (
        <Petal key={`${trigger}-${i}`} spec={spec} t={t} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { position: 'absolute', width: 0, height: 0, zIndex: 90 },
  petal: { position: 'absolute' },
});

export default PetalBurst;
