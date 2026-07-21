import { useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop, Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  useReducedMotion,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Atmosphere as Atmos, MoteKind } from '../theme/atmosphere';

/**
 * The live background. One layer, sitting behind every Screen, that makes the
 * app feel like it is breathing without asking any screen to participate.
 *
 * Four strata, back to front:
 *   1. Canvas    — 4-stop vertical wash, graded by phase + time of day.
 *   2. Orbs      — two large soft-falloff blooms drifting on long, unrelated
 *                  periods so they cross and separate rather than pulsing in
 *                  lockstep.
 *   3. Motes     — three parallax particle layers.
 *   4. Grain     — a static speckle that keeps large flat gradients from
 *                  banding on cheap panels.
 *
 * PERFORMANCE CONTRACT — this thing is on screen 100% of the time, so it has a
 * hard budget: at most **five** animated nodes regardless of particle count,
 * zero React re-renders once mounted, and no per-particle animations.
 *
 * The motes borrow the wrap trick from BubbleTherapy's BubbleField: each layer
 * is a single Svg whose circles are drawn twice, at `y` and `y + h`, and the
 * whole layer translates by one height on a loop. The seam is invisible and the
 * cost is one transform per layer instead of one per particle.
 *
 * Soft falloff comes from an SVG radialGradient rather than expo-blur: a real
 * blur pass over a full-screen view is expensive on Android and the gradient is
 * both cheaper and softer at this scale.
 */

/** Deterministic PRNG so particle layout is stable across re-renders. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface MoteSpec {
  cx: number;
  cy: number;
  r: number;
  o: number;
}

/**
 * Per-kind particle character. Size and opacity, not colour — colour is the
 * phase's.
 *
 * Radii are deliberately well above 1px: a sub-pixel dot at 2x DPI antialiases
 * into a hard speck that reads as dirt on the user's screen rather than
 * atmosphere inside the app. Anything that could be mistaken for a dead pixel
 * is a bug, so motes are large and very faint instead of small and legible.
 */
const MOTE_STYLE: Record<Exclude<MoteKind, 'none'>, { r: [number, number]; o: [number, number] }> = {
  dust: { r: [2.2, 5.0], o: [0.05, 0.13] },
  pollen: { r: [2.6, 6.0], o: [0.06, 0.16] },
  spark: { r: [2.0, 4.4], o: [0.09, 0.22] },
  // Stars are the one kind allowed to be crisp — a point of light is the
  // literal thing being depicted, and it only ever appears on a dark canvas.
  star: { r: [1.0, 2.2], o: [0.16, 0.5] },
};

function buildMotes(kind: MoteKind, count: number, w: number, h: number, seed: number): MoteSpec[] {
  if (kind === 'none' || count === 0) return [];
  const rand = seeded(seed);
  const { r, o } = MOTE_STYLE[kind];
  return Array.from({ length: count }, () => ({
    cx: rand() * w,
    cy: rand() * h,
    r: r[0] + rand() * (r[1] - r[0]),
    o: o[0] + rand() * (o[1] - o[0]),
  }));
}

/**
 * One parallax particle layer. Circles are drawn at y and y+h so the upward
 * translate wraps seamlessly; `depth` scales both speed and size so nearer
 * layers move faster, which is what sells the parallax.
 */
function MoteLayer({
  motes,
  color,
  w,
  h,
  depth,
  driftSec,
  index,
}: {
  motes: MoteSpec[];
  color: string;
  w: number;
  h: number;
  depth: number;
  driftSec: number;
  index: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (!Number.isFinite(driftSec)) {
      t.value = 0;
      return;
    }
    // Each layer gets a slightly different period so the three never align.
    const dur = driftSec * 1000 * (1.6 - depth * 0.5) * (1 + index * 0.17);
    t.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [driftSec, depth, index, t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -t.value * h }],
  }));

  if (motes.length === 0) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={w} height={h * 2}>
        {motes.map((m, i) => (
          <Circle
            key={`a${i}`}
            cx={m.cx}
            cy={m.cy}
            r={m.r * depth}
            fill={color}
            opacity={m.o * depth}
          />
        ))}
        {motes.map((m, i) => (
          <Circle
            key={`b${i}`}
            cx={m.cx}
            cy={m.cy + h}
            r={m.r * depth}
            fill={color}
            opacity={m.o * depth}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** A large soft bloom. Drifts on an elliptical path over tens of seconds. */
function Orb({
  color,
  size,
  x,
  y,
  driftSec,
  phase,
  id,
}: {
  color: string;
  size: number;
  x: number;
  y: number;
  driftSec: number;
  phase: number;
  id: string;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (!Number.isFinite(driftSec)) {
      t.value = 0;
      return;
    }
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: driftSec * 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: driftSec * 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(t);
  }, [driftSec, t]);

  // Two unrelated frequencies on x and y trace an open loop rather than a line.
  const style = useAnimatedStyle(() => {
    const a = (t.value + phase) * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.sin(a) * size * 0.12 },
        { translateY: Math.cos(a * 0.73) * size * 0.09 },
        { scale: 1 + Math.sin(a * 0.5) * 0.06 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x, top: y, width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.55" stopColor={color} stopOpacity={0.45} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Static speckle over the gradient. Large smooth washes band badly on 6-bit
 * panels; a faint irregular texture hides it and reads as paper grain.
 */
function Grain({ w, h, tone }: { w: number; h: number; tone: string }) {
  const d = useMemo(() => {
    const rand = seeded(7331);
    let path = '';
    for (let i = 0; i < 140; i++) {
      const x = rand() * w;
      const y = rand() * h;
      path += `M${x.toFixed(1)} ${y.toFixed(1)}h.6`;
    }
    return path;
  }, [w, h]);

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={d} stroke={tone} strokeWidth={0.8} opacity={0.5} strokeLinecap="round" />
    </Svg>
  );
}

interface AtmosphereProps {
  atmos: Atmos;
  /** Dark canvases need a lighter grain or it reads as dirt. */
  isDark: boolean;
}

/**
 * Renders an Atmosphere record. Pure presentation — all grading decisions were
 * made in theme/atmosphere.ts, which is where they can be tested.
 */
const Atmosphere = ({ atmos, isDark }: AtmosphereProps) => {
  const { width: w, height: h } = useWindowDimensions();
  const systemReduced = useReducedMotion();

  // Respect the system flag even if the caller forgot to thread it through.
  const driftSec = systemReduced ? Infinity : atmos.driftSec;
  const motes = useMemo(
    () => buildMotes(atmos.mote, systemReduced ? 0 : atmos.moteCount, w, h, 20260721),
    [atmos.mote, atmos.moteCount, systemReduced, w, h]
  );

  // Split the particle set across three depths for parallax.
  const layers = useMemo(() => {
    const third = Math.ceil(motes.length / 3);
    return [motes.slice(0, third), motes.slice(third, third * 2), motes.slice(third * 2)];
  }, [motes]);

  // Light-mode motes are warm and barely-there; a neutral grey speck on warm
  // paper reads as a smudge rather than as floating pollen.
  const moteColor = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(186,148,158,0.75)';
  const grainTone = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(60,40,50,0.045)';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={atmos.canvas}
        locations={[0, 0.38, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Orb
        id="atmos-orb-a"
        color={atmos.orbs[0]}
        size={w * 1.05}
        x={-w * 0.28}
        y={-h * 0.06}
        driftSec={driftSec}
        phase={0}
      />
      <Orb
        id="atmos-orb-b"
        color={atmos.orbs[1]}
        size={w * 0.9}
        x={w * 0.36}
        y={h * 0.42}
        driftSec={driftSec * 1.31}
        phase={0.41}
      />

      {layers.map((layer, i) => (
        <MoteLayer
          key={i}
          motes={layer}
          color={moteColor}
          w={w}
          h={h}
          depth={0.55 + i * 0.28}
          driftSec={driftSec}
          index={i}
        />
      ))}

      <Grain w={w} h={h} tone={grainTone} />
    </View>
  );
};

export default Atmosphere;
