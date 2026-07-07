import React, { useEffect, useId } from 'react';
import { StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { CONTENT_MAX_WIDTH } from '../utils/responsive';
import { useTheme } from '../theme/useTheme';

/* ---------------------------------------------------------------- Orb ---- */

interface OrbProps {
  size: number;
  color: string;
  top: number;
  left: number;
  delay: number;
  travel: number;
  duration: number;
}

const Orb: React.FC<OrbProps> = ({ size, color, top, left, delay, travel, duration }) => {
  const progress = useSharedValue(0);
  const gradId = `orbGrad-${useId()}`;

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, [progress, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * travel - travel / 2 },
      { translateX: progress.value * (travel * 0.6) - travel * 0.3 },
      { scale: 0.9 + progress.value * 0.25 },
    ],
    opacity: 0.7 + progress.value * 0.25,
  }));

  return (
    <Animated.View style={[styles.absolute, { top, left, width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={1} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradId})`} />
      </Svg>
    </Animated.View>
  );
};

/* --------------------------------------------------------------- Wave ---- */

interface WaveProps {
  width: number;
  color: string;
  bottom: number;
  height: number;
  duration: number;
  opacity: number;
  reverse?: boolean;
}

/** A seamless flowing wave: a 2×-width sine path translated by one width. */
const Wave: React.FC<WaveProps> = ({ width, color, bottom, height, duration, opacity, reverse }) => {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
  }, [t, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (reverse ? 1 : -1) * t.value * width }],
  }));

  const w = width;
  const h = height;
  // Repeating smooth wave across 2× width so the loop is seamless.
  const d =
    `M0 ${h * 0.5} ` +
    `Q ${w * 0.25} 0 ${w * 0.5} ${h * 0.5} T ${w} ${h * 0.5} ` +
    `T ${w * 1.5} ${h * 0.5} T ${w * 2} ${h * 0.5} ` +
    `V ${h} H 0 Z`;

  return (
    <Animated.View style={[styles.absolute, { bottom, left: 0, width: w * 2, height: h }, animatedStyle]}>
      <Svg width={w * 2} height={h}>
        <Path d={d} fill={color} opacity={opacity} />
      </Svg>
    </Animated.View>
  );
};

/* ------------------------------------------------------------ Droplet ---- */

interface DropletProps {
  x: number;
  size: number;
  delay: number;
  duration: number;
  rise: number;
}

/** A small bubble that rises and fades, looping. */
const Droplet: React.FC<DropletProps & { color: string; borderColor: string }> = ({
  x,
  size,
  delay,
  duration,
  rise,
  color,
  borderColor,
}) => {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false));
  }, [p, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -p.value * rise }, { scale: 0.6 + p.value * 0.6 }],
    opacity: p.value < 0.15 ? p.value / 0.15 * 0.5 : (1 - p.value) * 0.5,
  }));

  return (
    <Animated.View
      style={[
        styles.absolute,
        { bottom: 0, left: x, width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: color, borderWidth: 1, borderColor },
        animatedStyle,
      ]}
    />
  );
};

/* -------------------------------------------------------- Background ------ */

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  waves?: boolean;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({ children, style, waves = true }) => {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={colors.auroraBackdrop as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Depth: drifting glow orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Orb size={width * 0.95} color={colors.auroraOrbs[0]} top={-70} left={-90} delay={0} travel={44} duration={6000} />
        <Orb size={width * 0.85} color={colors.auroraOrbs[1]} top={height * 0.28} left={width * 0.45} delay={800} travel={58} duration={7500} />
        <Orb size={width * 0.75} color={colors.auroraOrbs[2]} top={height * 0.6} left={-50} delay={1600} travel={48} duration={6800} />

        {/* Rising droplets */}
        <Droplet x={width * 0.2} size={10} delay={0} duration={5200} rise={height * 0.5} color={colors.droplet} borderColor={colors.dropletBorder} />
        <Droplet x={width * 0.5} size={7} delay={1400} duration={6000} rise={height * 0.55} color={colors.droplet} borderColor={colors.dropletBorder} />
        <Droplet x={width * 0.75} size={12} delay={2600} duration={5600} rise={height * 0.5} color={colors.droplet} borderColor={colors.dropletBorder} />
        <Droplet x={width * 0.88} size={6} delay={800} duration={4800} rise={height * 0.45} color={colors.droplet} borderColor={colors.dropletBorder} />

        {/* Flowing water waves at the bottom */}
        {waves && (
          <>
            <Wave width={width} color={colors.waveA} bottom={0} height={120} duration={12000} opacity={1} />
            <Wave width={width} color={colors.waveB} bottom={0} height={90} duration={9000} opacity={1} reverse />
          </>
        )}
      </View>

      {/* Responsive centered content column */}
      <View style={styles.centerColumn}>
        <View style={styles.column}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  absolute: { position: 'absolute' },
  centerColumn: { flex: 1, alignItems: 'center' },
  // Reserve a slim top band for the floating back/forward controls.
  column: { flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, paddingTop: 44 },
});

export default GradientBackground;
