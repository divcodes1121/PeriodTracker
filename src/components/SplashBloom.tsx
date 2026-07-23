import { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, G } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  useReducedMotion,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { APP_NAME, BLOOM, GRADIENT, TAGLINE } from '../constants';
import { MOTION, SPACE } from '../theme/tokens';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SPLASH — the logo grows like a flower.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Shown while the persisted store rehydrates from disk. That wait is real but
 * short (typically 200–600ms), which sets the whole design constraint:
 *
 * **A splash screen is a wait, and the only honest thing to do with a wait is
 * make it feel like an arrival.**
 *
 * So the bloom opens over ~900ms and holds for a beat. If hydration finishes
 * sooner, the animation still completes — a splash that vanishes mid-bloom is
 * worse than one that lasts 300ms longer, because a half-finished animation
 * reads as a glitch while a complete one reads as an intro. If hydration takes
 * *longer*, the bloom simply rests open until the app is ready.
 *
 * ── Construction ──────────────────────────────────────────────────────────
 *
 * Three petal rings on one shared clock, each opening at its own delay and
 * final rotation, so the flower unfurls outside-in with a slight twist. Two
 * animated nodes total — one for the whole flower, one for the wordmark —
 * because this thing renders before anything else is warm and must not be the
 * reason the first frame is slow.
 *
 * Reduced motion renders the open flower immediately, still with the fade.
 */

const RINGS = [
  { count: 8, ry: 0.42, rx: 0.15, tilt: 0, delay: 0, hue: BLOOM.blossom.pastel, op: 0.75 },
  { count: 6, ry: 0.33, rx: 0.13, tilt: 24, delay: 120, hue: BLOOM.rose.pastel, op: 0.9 },
  { count: 5, ry: 0.22, rx: 0.1, tilt: 50, delay: 240, hue: BLOOM.rose.deep, op: 0.85 },
];

interface SplashBloomProps {
  /** Fired once the intro has finished. The caller may already be ready. */
  onDone?: () => void;
  /** Hide the wordmark and tagline — for use as a decorative mark. */
  markOnly?: boolean;
  size?: number;
}

const SplashBloom = ({ onDone, markOnly = false, size = 190 }: SplashBloomProps) => {
  const { colors: c, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const open = useSharedValue(reduced ? 1 : 0);
  const word = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    const finish = () => onDone?.();
    if (reduced) {
      open.value = 1;
      word.value = 1;
      const t = setTimeout(finish, 400);
      return () => clearTimeout(t);
    }
    open.value = withTiming(
      1,
      { duration: MOTION.bloom, easing: Easing.bezier(0.16, 1, 0.3, 1) },
      (done) => {
        'worklet';
        // Only signal on a real completion, never on an interruption — a
        // cancelled animation firing onDone is how a splash ends up dismissing
        // itself half-open on a slow device.
        if (done && onDone) runOnJS(finish)();
      }
    );
    word.value = withDelay(420, withTiming(1, { duration: MOTION.slow }));
  }, [reduced, open, word, onDone]);

  const flower = useAnimatedStyle(() => ({
    opacity: interpolate(open.value, [0, 0.2, 1], [0, 1, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(open.value, [0, 1], [0.55, 1], Extrapolation.CLAMP) },
      { rotate: `${interpolate(open.value, [0, 1], [-28, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: interpolate(word.value, [0, 1], [10, 0], Extrapolation.CLAMP) }],
  }));

  const S = 100;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <LinearGradient
        colors={
          isDark
            ? ['#150F18', '#1A121D', '#1E1522', '#221828']
            : ['#FFFBF8', '#FEF4F3', '#FBEDF1', '#F7E7F0']
        }
        locations={[0, 0.4, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* A soft bloom of light behind the mark, so the flower is lit rather
          than pasted on. */}
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            width: width * 1.1,
            height: width * 1.1,
            borderRadius: width,
            top: height * 0.5 - width * 0.62,
            left: -width * 0.05,
            backgroundColor: isDark ? 'rgba(242,145,177,0.10)' : 'rgba(242,145,177,0.16)',
          },
        ]}
      />

      <Animated.View style={flower}>
        <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
          {RINGS.map((ring, ri) => (
            <G key={ri} transform={`translate(50 50) rotate(${ring.tilt})`}>
              {Array.from({ length: ring.count }, (_, i) => (
                <Ellipse
                  key={i}
                  cx={0}
                  cy={-ring.ry * S}
                  rx={ring.rx * S}
                  ry={ring.ry * S}
                  fill={ring.hue}
                  opacity={ring.op}
                  transform={`rotate(${(i / ring.count) * 360})`}
                />
              ))}
            </G>
          ))}
          <Circle cx={50} cy={50} r={7} fill={BLOOM.gold.pastel} />
          <Circle cx={50} cy={50} r={3} fill={BLOOM.gold.deep} />
        </Svg>
      </Animated.View>

      {!markOnly && (
        <Animated.View style={[styles.words, wordStyle]}>
          <Text variant="title1">{APP_NAME}</Text>
          <Text variant="callout" tone="secondary" style={styles.tagline}>
            {TAGLINE}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  words: { alignItems: 'center', marginTop: SPACE.h1 },
  tagline: { marginTop: SPACE.xs },
});

export default SplashBloom;
