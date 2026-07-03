import React, { useEffect, useId } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CycleRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  colors?: [string, string];
  trackColor?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
}

/**
 * Circular progress ring with an animated gradient sweep. Drives the
 * strokeDashoffset via Reanimated so the fill animates on mount and whenever
 * `progress` changes. Works on iOS, Android, and web.
 */
const CycleRing: React.FC<CycleRingProps> = ({
  size = 220,
  strokeWidth = 16,
  progress,
  colors = ['#FFB3D9', '#FF6B9D'],
  trackColor = 'rgba(255,255,255,0.45)',
  children,
  style,
  delay = 300,
}) => {
  const gradId = `ringGrad-${useId()}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withDelay(
      delay,
      withTiming(clamped, { duration: 1400, easing: Easing.out(Easing.cubic) })
    );
  }, [anim, clamped, delay]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - anim.value),
  }));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors[0]} />
            <Stop offset="100%" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress arc, rotated so it starts at 12 o'clock */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Center content */}
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CycleRing;
