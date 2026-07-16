import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../constants';
import { useTheme } from '../theme/useTheme';
import { MOTION } from '../theme/tokens';

export type ArtName = 'cycle' | 'profile' | 'rhythm' | 'moment' | 'privacy' | 'ready';

/**
 * Abstract onboarding illustrations.
 *
 * Deliberately geometric rather than figurative: no cartoon women, no flowers,
 * no mascots. Concentric arcs and orbits carry the idea of a cycle without
 * infantilising the subject, and being pure SVG they inherit the palette and
 * theme instead of shipping raster assets that would break in dark mode.
 */
const OnboardingArt = ({ name, size = 240 }: { name: ArtName; size?: number }) => {
  const { colors: c } = useTheme();
  const spin = useSharedValue(0);
  const breathe = useSharedValue(0);
  const rise = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 26000, easing: Easing.linear }), -1, false);
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: MOTION.ambient, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: MOTION.ambient, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    rise.value = withDelay(200, withTiming(1, { duration: MOTION.slow, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
  }, [spin, breathe, rise]);

  const orbit = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const pulse = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + breathe.value * 0.07 }],
    opacity: 0.35 + breathe.value * 0.3,
  }));

  const enter = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 14 }, { scale: 0.94 + rise.value * 0.06 }],
  }));

  const stroke = c.textTertiary;

  return (
    <Animated.View style={[{ width: size, height: size }, enter]}>
      {/* Soft bloom behind every composition. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: size * 0.1,
            top: size * 0.1,
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: size,
            backgroundColor: COLORS.primaryLight,
          },
          pulse,
        ]}
      />

      {name === 'cycle' && (
        <Animated.View style={[{ width: size, height: size }, orbit]}>
          <Svg width={size} height={size} viewBox="0 0 200 200">
            <Defs>
              <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={COLORS.primary} />
                <Stop offset="0.5" stopColor={COLORS.accent} />
                <Stop offset="1" stopColor={COLORS.success} />
              </LinearGradient>
            </Defs>
            <Circle cx="100" cy="100" r="72" stroke="url(#ring)" strokeWidth="2.5" fill="none" />
            <Circle cx="100" cy="100" r="54" stroke={stroke} strokeWidth="1" opacity="0.4" fill="none" />
            <Circle cx="100" cy="28" r="7" fill={COLORS.primary} />
            <Circle cx="172" cy="100" r="4.5" fill={COLORS.accent} />
            <Circle cx="100" cy="172" r="4.5" fill={COLORS.success} />
            <Circle cx="28" cy="100" r="4.5" fill={COLORS.warning} />
          </Svg>
        </Animated.View>
      )}

      {name === 'profile' && (
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Circle cx="100" cy="100" r="70" stroke={stroke} strokeWidth="1" opacity="0.35" fill="none" />
          <Circle cx="100" cy="82" r="24" stroke={COLORS.primary} strokeWidth="2.5" fill="none" />
          <Path
            d="M60 148c8-24 22-34 40-34s32 10 40 34"
            stroke={COLORS.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx="150" cy="58" r="5" fill={COLORS.accent} />
        </Svg>
      )}

      {name === 'rhythm' && (
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            <LinearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={COLORS.accent} />
              <Stop offset="1" stopColor={COLORS.primary} />
            </LinearGradient>
          </Defs>
          <Path
            d="M20 120 Q 50 60 80 120 T 140 120 T 200 120"
            stroke="url(#wave)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d="M20 140 Q 50 96 80 140 T 140 140 T 200 140"
            stroke={stroke}
            strokeWidth="1.5"
            opacity="0.4"
            fill="none"
          />
          {[40, 76, 112, 148].map((x, i) => (
            <Rect
              key={x}
              x={x}
              y={150 - (i % 2 === 0 ? 26 : 14)}
              width="7"
              height={i % 2 === 0 ? 26 : 14}
              rx="3.5"
              fill={i % 2 === 0 ? COLORS.primary : COLORS.accentLight}
            />
          ))}
        </Svg>
      )}

      {name === 'moment' && (
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Circle cx="100" cy="100" r="66" stroke={stroke} strokeWidth="1" opacity="0.35" fill="none" />
          <Path
            d="M100 52c18 21 30 38 30 53a30 30 0 1 1-60 0c0-15 12-32 30-53z"
            stroke={COLORS.primary}
            strokeWidth="2.5"
            fill={COLORS.primarySoft}
          />
          <Circle cx="100" cy="100" r="86" stroke={COLORS.primary} strokeWidth="0.75" opacity="0.25" fill="none" />
        </Svg>
      )}

      {name === 'privacy' && (
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <G>
            <Path
              d="M100 34l46 18v42c0 32-20 58-46 70-26-12-46-38-46-70V52z"
              stroke={COLORS.success}
              strokeWidth="2.5"
              fill="rgba(141,181,150,0.12)"
              strokeLinejoin="round"
            />
            <Path
              d="M86 100h28a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H86a4 4 0 0 1-4-4v-18a4 4 0 0 1 4-4z"
              stroke={COLORS.successDark}
              strokeWidth="2"
              fill="none"
            />
            <Path d="M90 100v-8a10 10 0 0 1 20 0v8" stroke={COLORS.successDark} strokeWidth="2" fill="none" />
          </G>
        </Svg>
      )}

      {name === 'ready' && (
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            <LinearGradient id="done" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={COLORS.primary} />
              <Stop offset="1" stopColor={COLORS.accent} />
            </LinearGradient>
          </Defs>
          <Circle cx="100" cy="100" r="62" stroke="url(#done)" strokeWidth="3" fill="none" />
          <Path
            d="M74 100l18 18 36-38"
            stroke="url(#done)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Circle cx="156" cy="52" r="4" fill={COLORS.warning} />
          <Circle cx="44" cy="148" r="3" fill={COLORS.success} />
        </Svg>
      )}
    </Animated.View>
  );
};

export default OnboardingArt;
