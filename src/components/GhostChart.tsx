import { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { SPACE } from '../theme/tokens';

/**
 * A chart that has no data yet, drawn as a *promise* rather than an apology.
 *
 * Analytics previously answered an empty account with one grey box reading
 * "Not enough data yet", which made the screen look broken rather than new.
 * The screen should never feel unfinished — so every panel that is waiting for
 * data renders its own shape in ghost form: the curve it will eventually draw,
 * at low opacity, breathing slowly, with the reason it is empty stated once and
 * quietly underneath.
 *
 * The ghost curve is deliberately smooth and plausible rather than random —
 * it reads as "this is what will live here", not as fake data. It carries no
 * axis labels or numbers for exactly that reason: nothing here can be mistaken
 * for a real measurement.
 */

interface GhostChartProps {
  /** What will eventually be shown here. One short sentence. */
  label: string;
  /** Why it is empty. One short sentence, no blame. */
  hint?: string;
  height?: number;
  /** Tints the ghost to the panel's accent. */
  accent: string;
  /** 'wave' for trends, 'bars' for counts. */
  shape?: 'wave' | 'bars';
}

const GhostChart = ({ label, hint, height = 92, accent, shape = 'wave' }: GhostChartProps) => {
  const { colors: c } = useTheme();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      pulse.value = 0.5;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: 0.3 + pulse.value * 0.28 }));

  // A fixed, gentle curve. Not random: a shape that repeats identically every
  // render reads as a placeholder, where noise reads as broken data.
  const bars = useMemo(() => [0.42, 0.66, 0.5, 0.78, 0.58, 0.7], []);

  return (
    <View>
      <Animated.View style={style} pointerEvents="none">
        <Svg width="100%" height={height} viewBox="0 0 300 92" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="ghost-fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity={0.32} />
              <Stop offset="1" stopColor={accent} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {shape === 'wave' ? (
            <>
              <Path
                d="M0 62 C 40 34, 70 70, 110 48 S 180 22, 220 44 S 270 66, 300 38 L300 92 L0 92 Z"
                fill="url(#ghost-fill)"
              />
              <Path
                d="M0 62 C 40 34, 70 70, 110 48 S 180 22, 220 44 S 270 66, 300 38"
                stroke={accent}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeDasharray="5 7"
              />
            </>
          ) : (
            bars.map((b, i) => {
              const bw = 300 / bars.length;
              return (
                <Path
                  key={i}
                  d={`M${i * bw + bw * 0.22} 92 L${i * bw + bw * 0.22} ${92 - b * 74} L${
                    i * bw + bw * 0.78
                  } ${92 - b * 74} L${i * bw + bw * 0.78} 92 Z`}
                  fill="url(#ghost-fill)"
                  stroke={accent}
                  strokeWidth={1.4}
                  strokeDasharray="4 5"
                />
              );
            })
          )}
        </Svg>
      </Animated.View>

      <View style={styles.caption}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
          {label}
        </Text>
      </View>
      {hint ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  caption: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

export default GhostChart;
