import { ReactNode, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { getPhaseRanges } from '../utils/cycleCalculations';
import { PHASE_GRADIENTS } from '../constants';
import { MOTION } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CycleTimelineProps {
  dayOfCycle: number;
  cycleLength: number;
  periodLength: number;
  /** Capitalized phase name, e.g. "Luteal" — keys PHASE_GRADIENTS. */
  phaseName: string;
  size?: number;
  /**
   * Ambient glow colour, normally atmosphere.glow. When given, the breathing
   * halo adopts the app's current atmosphere instead of the phase ramp, so the
   * hero agrees with the canvas behind it at every hour of the day.
   */
  glow?: string;
  /**
   * Where the light is coming from, in degrees (atmosphere.lightAngle). Rotates
   * the gradient sweep so the ring is lit from the same direction as every
   * other surface in the app rather than picking its own angle.
   */
  lightAngle?: number;
  children?: ReactNode;
}

/**
 * The circular cycle timeline — the hero of the Home screen.
 *
 * Three layers, back to front:
 *  1. A neutral track.
 *  2. Faint phase arcs drawn from getPhaseRanges(), so the ring is a *timeline*
 *     of the whole cycle rather than a bare progress bar. These come straight
 *     from the cycle math, so they can't drift from the numbers on screen.
 *  3. An animated gradient progress arc that sweeps to today, with a marker dot
 *     and a slow breathing halo.
 *
 * Motion: the sweep animates from 0 on mount and eases to the current day;
 * the halo breathes on a long ambient loop. Both respect the spring/timing
 * tokens rather than inventing local durations.
 */
const CycleTimeline = ({
  dayOfCycle,
  cycleLength,
  periodLength,
  phaseName,
  size = 260,
  glow,
  lightAngle = 15,
  children,
}: CycleTimelineProps) => {
  const { colors: c } = useTheme();

  const strokeWidth = size * 0.042;
  const arcWidth = size * 0.018;
  const radius = (size - strokeWidth) / 2 - size * 0.06;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const progress = useSharedValue(0);
  const halo = useSharedValue(0);

  const target = Math.max(0, Math.min(1, dayOfCycle / cycleLength));
  const ramp = PHASE_GRADIENTS[phaseName] ?? PHASE_GRADIENTS.Menstrual;

  useEffect(() => {
    progress.value = withTiming(target, {
      duration: MOTION.slow * 1.6,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [target, progress]);

  useEffect(() => {
    halo.value = withRepeat(
      withSequence(
        withTiming(1, { duration: MOTION.ambient, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: MOTION.ambient, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [halo]);

  const phaseArcs = useMemo(() => {
    const ranges = getPhaseRanges(cycleLength, periodLength);
    return ranges.map((r) => {
      // Arc spans the inclusive day range, expressed as a fraction of the ring.
      const startFrac = (r.startDay - 1) / cycleLength;
      const lengthFrac = (r.endDay - r.startDay + 1) / cycleLength;
      // Small visual gap between segments so they read as distinct.
      const gap = circumference * 0.006;
      const dash = Math.max(circumference * lengthFrac - gap, 1);
      return {
        key: r.key,
        color: r.color,
        dasharray: [dash, circumference - dash] as [number, number],
        // Rotate each arc to its start position (SVG 0° is at 3 o'clock).
        rotation: startFrac * 360,
      };
    });
  }, [cycleLength, periodLength, circumference]);

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const markerStyle = useAnimatedStyle(() => {
    const angle = progress.value * 2 * Math.PI - Math.PI / 2;
    return {
      transform: [
        { translateX: Math.cos(angle) * radius },
        { translateY: Math.sin(angle) * radius },
        { scale: 1 + halo.value * 0.12 },
      ],
    };
  });

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.10 + halo.value * 0.10,
    transform: [{ scale: 0.92 + halo.value * 0.06 }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Breathing halo behind the ring — the only ambient motion at rest. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            backgroundColor: glow ?? ramp[1],
          },
          haloStyle,
        ]}
      />

      <Svg width={size} height={size}>
        <Defs>
          {/* Sweep aligned to the app's light direction (0° = from the top). */}
          <LinearGradient
            id="sweep"
            x1={0.5 - Math.sin((lightAngle * Math.PI) / 180) * 0.5}
            y1={0.5 - Math.cos((lightAngle * Math.PI) / 180) * 0.5}
            x2={0.5 + Math.sin((lightAngle * Math.PI) / 180) * 0.5}
            y2={0.5 + Math.cos((lightAngle * Math.PI) / 180) * 0.5}
          >
            <Stop offset="0" stopColor={ramp[0]} />
            <Stop offset="0.6" stopColor={ramp[1]} />
            <Stop offset="1" stopColor={ramp[2]} />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={c.trackNeutral}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Phase timeline arcs */}
        <G rotation={-90} origin={`${center}, ${center}`}>
          {phaseArcs.map((a) => (
            <Circle
              key={a.key}
              cx={center}
              cy={center}
              r={radius + strokeWidth * 0.86}
              stroke={a.color}
              strokeWidth={arcWidth}
              strokeLinecap="round"
              strokeDasharray={a.dasharray}
              rotation={a.rotation}
              origin={`${center}, ${center}`}
              opacity={0.34}
              fill="none"
            />
          ))}
        </G>

        {/* Progress sweep */}
        <G rotation={-90} origin={`${center}, ${center}`}>
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#sweep)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={progressProps}
            fill="none"
          />
        </G>
      </Svg>

      {/* Marker dot riding the sweep */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.marker,
          {
            width: strokeWidth * 0.62,
            height: strokeWidth * 0.62,
            borderRadius: strokeWidth,
            backgroundColor: c.card,
            borderColor: ramp[2],
            borderWidth: 2.5,
          },
          markerStyle,
        ]}
      />

      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  marker: { position: 'absolute' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});

export default CycleTimeline;
