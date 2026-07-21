import { useEffect } from 'react';
import { View, StyleSheet, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  useReducedMotion,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { TYPE, MOTION } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Glow box. Wider than the longest phase name ("Follicular") so it never clips. */
const GLOW_W = 300;
const GLOW_H = 130;

/**
 * The phase name, alive.
 *
 * Home's hero previously printed "Luteal" as static text, which made the most
 * important word on the screen the deadest thing on it. It now breathes:
 *
 *  - Each letter bobs on a slow sine, phase-offset by its index, so the word
 *    undulates rather than pulsing as a block. The amplitude is deliberately
 *    sub-pixel-ish (~1px) — you should feel that it is alive without being able
 *    to point at what is moving.
 *  - A soft glow behind the word swells on a longer, unrelated period, so the
 *    two rhythms drift in and out of phase instead of locking.
 *  - Changing phase re-runs a staggered entrance, so the word arrives letter by
 *    letter rather than swapping.
 *
 * Cost is one animated node per letter (≤10 for the real phase names) plus one
 * for the glow, all worklet-driven with zero re-renders. Honours Reduced Motion
 * by rendering the still frame — the type is unchanged, only the motion stops.
 */

interface LivePhaseTitleProps {
  /** Capitalised phase name, e.g. "Luteal". */
  name: string;
  /** Ambient glow colour, normally atmosphere.glow. */
  glow?: string;
  style?: TextStyle;
}

/** Per-letter bob. Index drives both the loop's phase offset and its delay. */
function Letter({
  char,
  index,
  total,
  reduced,
  style,
}: {
  char: string;
  index: number;
  total: number;
  reduced: boolean;
  style?: TextStyle;
}) {
  const bob = useSharedValue(0);
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      bob.value = 0;
      enter.value = 1;
      return;
    }
    // Stagger the start rather than the frequency: same period everywhere means
    // the wave travels along the word instead of the letters fighting.
    const period = 2600;
    bob.value = withDelay(
      (index / Math.max(total, 1)) * period,
      withRepeat(
        withSequence(
          withTiming(1, { duration: period / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: period / 2, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    enter.value = withDelay(index * 44, withTiming(1, { duration: MOTION.slow, easing: Easing.out(Easing.cubic) }));
    return () => {
      cancelAnimation(bob);
      cancelAnimation(enter);
    };
  }, [index, total, reduced, bob, enter]);

  const animated = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * 14 - bob.value * 1.1 },
      { scale: 0.96 + enter.value * 0.04 },
    ],
  }));

  // A space has no glyph to animate but must still hold its width.
  if (char === ' ') return <View style={{ width: (style?.fontSize ?? 40) * 0.26 }} />;

  return <Animated.Text style={[style, animated]}>{char}</Animated.Text>;
}

const LivePhaseTitle = ({ name, glow, style }: LivePhaseTitleProps) => {
  const { colors: c } = useTheme();
  const reduced = useReducedMotion();
  const swell = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      swell.value = 0.5;
      return;
    }
    swell.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 5200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(swell);
  }, [reduced, swell]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.28 + swell.value * 0.34,
    transform: [{ scale: 0.86 + swell.value * 0.16 }],
  }));

  const letterStyle: TextStyle = {
    ...(TYPE.display as TextStyle),
    color: c.text,
    ...style,
  };

  const chars = Array.from(name);

  return (
    <View style={styles.root}>
      {/* Radial falloff, not a rounded rect: a solid pill behind the word reads
          as a chip you could tap. Light has no edges. */}
      {glow ? (
        <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
          <Svg width={GLOW_W} height={GLOW_H}>
            <Defs>
              <RadialGradient id="phase-glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={glow} stopOpacity={1} />
                <Stop offset="0.5" stopColor={glow} stopOpacity={0.42} />
                <Stop offset="1" stopColor={glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx={GLOW_W / 2}
              cy={GLOW_H / 2}
              rx={GLOW_W / 2}
              ry={GLOW_H / 2}
              fill="url(#phase-glow)"
            />
          </Svg>
        </Animated.View>
      ) : null}
      {/* The word is split for motion only — it is announced as one label. */}
      <View style={styles.row} accessible accessibilityLabel={name}>
        {chars.map((ch, i) => (
          <Letter
            key={`${name}-${i}`}
            char={ch}
            index={i}
            total={chars.length}
            reduced={reduced}
            style={letterStyle}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  glow: { position: 'absolute', width: GLOW_W, height: GLOW_H },
});

export default LivePhaseTitle;
