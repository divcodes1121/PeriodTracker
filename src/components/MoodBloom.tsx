import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  useReducedMotion,
  cancelAnimation,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { BLOOM, BloomHue, MoodKey, MOODS } from '../constants';
import { MOTION, MIN_TAP_COMFORT, SPACE } from '../theme/tokens';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOOD BLOOM — a feeling, drawn as a flower with a face.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Emoji were the obvious answer and the wrong one. They can't inherit the
 * palette, they render as a different drawing on every platform (🙂 is a
 * genuinely different face on iOS, Android and Windows), and they make the
 * most emotionally loaded screen in the app look like a keyboard.
 *
 * So each mood is a small bloom: five petals in the feeling's own hue, and a
 * face drawn from four parts — eyes, brows, mouth, and one accent (cheeks, a
 * tear, sparkles, steam). Nine feelings, nine drawings, one construction.
 *
 * ── The thing that makes it work ──────────────────────────────────────────
 *
 * **The petals change shape with the feeling, not just colour.** Happy petals
 * are round and open; anxious petals are narrow and tilted; tired petals
 * droop. That is the difference between nine coloured circles and nine
 * feelings — and it is also the colour-blind story, since the silhouette alone
 * distinguishes every mood before hue is considered.
 *
 * Selecting one springs it open on `MOTION.springBloom`, the one spring in the
 * app allowed to overshoot. A mood face is exactly the place a small bounce is
 * earned.
 */

interface Expression {
  /** Eye style. */
  eyes: 'open' | 'happy' | 'closed' | 'wide' | 'soft' | 'droop';
  /** Mouth style. */
  mouth: 'smile' | 'grin' | 'flat' | 'frown' | 'wobble' | 'small' | 'open';
  /** Brow angle in degrees; positive is worried, negative is cross. */
  brow?: number;
  /** Rosy cheeks. */
  cheeks?: boolean;
  /** Petal character — the silhouette that carries the mood without colour. */
  petal: { rx: number; ry: number; tilt: number; count: number; droop?: boolean };
  accent?: 'sparkle' | 'tear' | 'steam' | 'hearts';
}

/**
 * The nine faces. Kept as data rather than nine components so a designer can
 * retune a feeling without touching render code — and so it is obvious at a
 * glance that no two moods share a silhouette.
 */
const FACES: Record<MoodKey, Expression> = {
  happy: {
    eyes: 'happy',
    mouth: 'smile',
    cheeks: true,
    petal: { rx: 0.4, ry: 0.62, tilt: 0, count: 6 },
  },
  loved: {
    eyes: 'happy',
    mouth: 'small',
    cheeks: true,
    petal: { rx: 0.44, ry: 0.6, tilt: 0, count: 5 },
    accent: 'hearts',
  },
  excited: {
    eyes: 'wide',
    mouth: 'grin',
    cheeks: true,
    petal: { rx: 0.34, ry: 0.72, tilt: 8, count: 8 },
    accent: 'sparkle',
  },
  calm: {
    eyes: 'closed',
    mouth: 'small',
    petal: { rx: 0.46, ry: 0.56, tilt: 0, count: 5 },
  },
  relaxed: {
    eyes: 'soft',
    mouth: 'smile',
    petal: { rx: 0.5, ry: 0.5, tilt: 0, count: 5 },
    accent: 'steam',
  },
  tired: {
    eyes: 'droop',
    mouth: 'flat',
    brow: 6,
    petal: { rx: 0.36, ry: 0.58, tilt: 0, count: 5, droop: true },
  },
  anxious: {
    eyes: 'wide',
    mouth: 'wobble',
    brow: 14,
    petal: { rx: 0.24, ry: 0.68, tilt: 12, count: 7 },
  },
  sad: {
    eyes: 'soft',
    mouth: 'frown',
    brow: 10,
    petal: { rx: 0.32, ry: 0.6, tilt: 0, count: 5, droop: true },
    accent: 'tear',
  },
  angry: {
    eyes: 'open',
    mouth: 'flat',
    brow: -16,
    petal: { rx: 0.28, ry: 0.66, tilt: -10, count: 6 },
  },
};

/** Mouth geometry on the 100-grid, keyed by style. */
const MOUTHS: Record<Expression['mouth'], string> = {
  smile: 'M40 60c3.5 4.5 16.5 4.5 20 0',
  grin: 'M38 57c4 8 20 8 24 0z',
  flat: 'M41 61h18',
  frown: 'M40 63c3.5-5 16.5-5 20 0',
  wobble: 'M39 61c2.5-3 5 3 7.5 0s5 3 7.5 0 5 3 6 1',
  small: 'M45 60c1.6 2.6 8.4 2.6 10 0',
  open: 'M44 58a6 6 0 0 0 12 0z',
};

interface MoodBloomProps {
  mood: MoodKey;
  size?: number;
  selected?: boolean;
  onPress?: () => void;
  /** Render the label beneath. Off for decorative uses. */
  showLabel?: boolean;
}

/**
 * One mood. Tappable when `onPress` is given, decorative otherwise.
 */
const MoodBloom = ({
  mood,
  size = 76,
  selected = false,
  onPress,
  showLabel = true,
}: MoodBloomProps) => {
  const { colors: c, isDark } = useTheme();
  const reduced = useReducedMotion();
  const meta = MOODS.find((m) => m.key === mood) ?? MOODS[0];
  const face = FACES[mood];
  const hue = BLOOM[meta.hue as BloomHue];

  const pick = useSharedValue(selected ? 1 : 0);
  const idle = useSharedValue(0);

  useEffect(() => {
    pick.value = withSpring(selected ? 1 : 0, MOTION.springBloom);
  }, [selected, pick]);

  useEffect(() => {
    // Only the selected face breathes. A grid of nine breathing faces is a
    // hallucination, not an interface.
    if (reduced || !selected) {
      idle.value = withTiming(0, { duration: MOTION.base });
      return;
    }
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: MOTION.ambient * 0.55, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: MOTION.ambient * 0.55, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(idle);
  }, [selected, reduced, idle]);

  const bloomStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + pick.value * 0.1 + idle.value * 0.03 },
      { rotate: `${(idle.value - 0.5) * 2.5}deg` },
    ],
  }));

  /** The aura. Grows behind the selected face — this is the "palette-shifting
      aura" the brief asked for, and it costs one node. */
  const auraStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pick.value, [0, 1], [0, isDark ? 0.34 : 0.28], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(pick.value, [0, 1], [0.7, 1.22], Extrapolation.CLAMP) }],
  }));

  const S = 100;
  const petalFill = hue.pastel;
  const petalRim = hue.deep;
  // Ink for the face. On a pastel petal the features need real contrast or the
  // expression reads as a smudge at 76px.
  const faceInk = hue.ink;

  const body = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size, backgroundColor: hue.pastel },
          auraStyle,
        ]}
      />
      <Animated.View style={bloomStyle}>
        <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
          {/* Petals. Shape carries the feeling; colour merely agrees with it. */}
          <G transform="translate(50 50)">
            {Array.from({ length: face.petal.count }, (_, i) => {
              const a = (i / face.petal.count) * 360 + face.petal.tilt;
              // Drooping moods let the lower petals hang further and narrow.
              const down = face.petal.droop && a > 60 && a < 300;
              return (
                <Ellipse
                  key={i}
                  cx={0}
                  cy={-34 * (down ? 1.12 : 1)}
                  rx={30 * face.petal.rx * (down ? 0.8 : 1)}
                  ry={30 * face.petal.ry}
                  fill={petalFill}
                  opacity={0.92}
                  transform={`rotate(${a})`}
                />
              );
            })}
          </G>

          {/* Face disc — lighter than the petals so features stay legible. */}
          <Circle cx={50} cy={50} r={26} fill={isDark ? '#2A2230' : '#FFF9F6'} />
          <Circle cx={50} cy={50} r={26} fill={petalFill} opacity={isDark ? 0.22 : 0.34} />

          {/* Cheeks sit under the eyes so a blink never covers them. */}
          {face.cheeks && (
            <>
              <Ellipse cx={36} cy={55} rx={5} ry={3.2} fill={petalRim} opacity={0.28} />
              <Ellipse cx={64} cy={55} rx={5} ry={3.2} fill={petalRim} opacity={0.28} />
            </>
          )}

          {/* Brows. Present only when the mood needs them — a neutral face with
              brows always looks like it is judging you. */}
          {face.brow !== undefined && (
            <>
              <Path
                d="M35 38h9"
                stroke={faceInk}
                strokeWidth={2.4}
                strokeLinecap="round"
                transform={`rotate(${-face.brow} 39.5 38)`}
              />
              <Path
                d="M56 38h9"
                stroke={faceInk}
                strokeWidth={2.4}
                strokeLinecap="round"
                transform={`rotate(${face.brow} 60.5 38)`}
              />
            </>
          )}

          {/* Eyes */}
          {face.eyes === 'open' && (
            <>
              <Circle cx={40} cy={48} r={3.4} fill={faceInk} />
              <Circle cx={60} cy={48} r={3.4} fill={faceInk} />
            </>
          )}
          {face.eyes === 'wide' && (
            <>
              <Circle cx={40} cy={48} r={4.6} fill={faceInk} />
              <Circle cx={60} cy={48} r={4.6} fill={faceInk} />
              <Circle cx={41.4} cy={46.4} r={1.5} fill="#FFFFFF" />
              <Circle cx={61.4} cy={46.4} r={1.5} fill="#FFFFFF" />
            </>
          )}
          {face.eyes === 'happy' && (
            <>
              <Path d="M35.5 49c2-4 7-4 9 0" stroke={faceInk} strokeWidth={2.8} strokeLinecap="round" fill="none" />
              <Path d="M55.5 49c2-4 7-4 9 0" stroke={faceInk} strokeWidth={2.8} strokeLinecap="round" fill="none" />
            </>
          )}
          {face.eyes === 'closed' && (
            <>
              <Path d="M35.5 47c2 3.5 7 3.5 9 0" stroke={faceInk} strokeWidth={2.6} strokeLinecap="round" fill="none" />
              <Path d="M55.5 47c2 3.5 7 3.5 9 0" stroke={faceInk} strokeWidth={2.6} strokeLinecap="round" fill="none" />
            </>
          )}
          {face.eyes === 'soft' && (
            <>
              <Ellipse cx={40} cy={48} rx={3} ry={3.8} fill={faceInk} />
              <Ellipse cx={60} cy={48} rx={3} ry={3.8} fill={faceInk} />
            </>
          )}
          {face.eyes === 'droop' && (
            <>
              <Path d="M35.5 48h9" stroke={faceInk} strokeWidth={2.8} strokeLinecap="round" />
              <Path d="M55.5 48h9" stroke={faceInk} strokeWidth={2.8} strokeLinecap="round" />
              <Path d="M36 52.5l2 2M64 52.5l-2 2" stroke={faceInk} strokeWidth={1.8} strokeLinecap="round" opacity={0.6} />
            </>
          )}

          {/* Mouth */}
          <Path
            d={MOUTHS[face.mouth]}
            stroke={faceInk}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={face.mouth === 'grin' || face.mouth === 'open' ? faceInk : 'none'}
          />

          {/* Accents */}
          {face.accent === 'sparkle' && (
            <>
              <Path d="M84 24l1.6 4.2L90 30l-4.4 1.8L84 36l-1.6-4.2L78 30l4.4-1.8z" fill={hue.deep} />
              <Circle cx={16} cy={34} r={2.2} fill={hue.deep} opacity={0.75} />
            </>
          )}
          {face.accent === 'tear' && (
            <Path d="M64 55c2.6 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1.4-4 4-8z" fill={BLOOM.sky.pastel} />
          )}
          {face.accent === 'steam' && (
            <Path
              d="M42 20c3-4 3-6 0-9M50 19c3-4 3-6 0-9M58 20c3-4 3-6 0-9"
              stroke={hue.deep}
              strokeWidth={2.2}
              strokeLinecap="round"
              fill="none"
              opacity={0.6}
            />
          )}
          {face.accent === 'hearts' && (
            <>
              <Path d="M82 26c0-3 4-4 5-1.6C88 22 92 23 92 26c0 3.4-5 6-5 6s-5-2.6-5-6z" fill={hue.deep} />
              <Path d="M12 40c0-2 2.6-2.6 3.4-1C16 37 19 37.6 19 40c0 2.4-3.6 4.4-3.6 4.4S12 42.4 12 40z" fill={hue.deep} opacity={0.7} />
            </>
          )}
        </Svg>
      </Animated.View>
    </View>
  );

  const label = showLabel ? (
    <Text
      variant="caption"
      tone={selected ? 'primary' : 'secondary'}
      style={{ marginTop: SPACE.xs, fontWeight: selected ? '600' : '400' }}
    >
      {meta.label}
    </Text>
  ) : null;

  if (!onPress) {
    return (
      <View
        style={styles.wrap}
        accessibilityRole="image"
        accessibilityLabel={`${meta.label} mood`}
      >
        {body}
        {label}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={meta.label}
      style={styles.wrap}
      hitSlop={6}
    >
      {body}
      {label}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    minWidth: MIN_TAP_COMFORT,
    paddingVertical: SPACE.xs,
  },
});

export default MoodBloom;
