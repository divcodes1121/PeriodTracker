import { useEffect, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop, Path, G } from 'react-native-svg';
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
 * ═══════════════════════════════════════════════════════════════════════════
 * The live canvas. Behind every Screen, always.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Four strata, back to front:
 *   1. Canvas — 4-stop wash, graded by phase + hour in theme/atmosphere.ts.
 *   2. Blooms — three large soft-falloff orbs drifting on unrelated periods.
 *   3. Petals — three parallax layers of drifting petals (Bloomly's signature).
 *   4. Grain  — a static speckle that stops large flat washes banding.
 *
 * ── PERFORMANCE CONTRACT ──────────────────────────────────────────────────
 *
 * This is on screen 100% of the time, so it has a hard budget:
 *
 *   • at most **six** animated nodes regardless of particle count
 *   • **zero** React re-renders once mounted
 *   • **no** per-particle animation, ever
 *
 * That contract is what makes ambient beauty affordable. The moment a petal
 * gets its own `useSharedValue`, 33 petals means 33 nodes and the budget is
 * gone — which is how "just a few floating petals" ends up costing a frame
 * budget on a mid-range Android.
 *
 * The trick that buys it: each layer is ONE `Svg` whose petals are drawn twice,
 * at `y` and `y + h`. The layer translates upward by exactly one screen height
 * on loop, so the second copy slides into the first copy's place and the seam
 * is invisible. One transform per layer, not one per petal. Sway rides the same
 * shared value, so it is free.
 *
 * Soft falloff comes from an SVG `radialGradient`, not `expo-blur`: a real blur
 * pass over a full-screen view is expensive on Android, and the gradient is
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
  x: number;
  y: number;
  /** Radius for round kinds, half-length for petals. */
  r: number;
  o: number;
  /** Static rotation, degrees. Petals only — a petal facing "up" reads as a leaf. */
  rot: number;
  /** Petal aspect: 0.42–0.68. Variation here is what stops them reading as a stamp. */
  aspect: number;
}

/**
 * Per-kind particle character. Size and opacity only — colour belongs to the
 * phase.
 *
 * Radii sit well above 1px on purpose. A sub-pixel dot at 2× DPI antialiases
 * into a hard speck that reads as **dirt on the user's screen** rather than as
 * atmosphere inside the app. Anything mistakable for a dead pixel is a bug, so
 * motes are large and very faint instead of small and legible.
 *
 * Stars are the one exception: a crisp point of light is the literal subject,
 * and `atmosphere()` only ever selects them on a dark canvas.
 */
const MOTE_STYLE: Record<Exclude<MoteKind, 'none'>, { r: [number, number]; o: [number, number] }> = {
  petal: { r: [5.5, 12], o: [0.1, 0.26] },
  pollen: { r: [2.6, 6.0], o: [0.08, 0.2] },
  dust: { r: [2.2, 5.0], o: [0.06, 0.15] },
  star: { r: [1.0, 2.2], o: [0.18, 0.55] },
};

function buildMotes(kind: MoteKind, count: number, w: number, h: number, seed: number): MoteSpec[] {
  if (kind === 'none' || count === 0) return [];
  const rand = seeded(seed);
  const { r, o } = MOTE_STYLE[kind];
  return Array.from({ length: count }, () => ({
    x: rand() * w,
    y: rand() * h,
    r: r[0] + rand() * (r[1] - r[0]),
    o: o[0] + rand() * (o[1] - o[0]),
    rot: rand() * 360,
    aspect: 0.42 + rand() * 0.26,
  }));
}

/**
 * A petal, drawn around its own origin so a static `transform` can rotate it.
 *
 * Two mirrored cubics meeting at the tips — the minimum that reads as *petal*
 * rather than as *ellipse*. An ellipse at this size and opacity is just a
 * blurry dot; the two points at top and bottom are the entire difference
 * between "flower app" and "loading spinner".
 */
function petalPath(len: number, aspect: number): string {
  const hy = len;
  const hx = len * aspect;
  return `M0 ${-hy}C${hx} ${-hy * 0.42} ${hx} ${hy * 0.42} 0 ${hy}C${-hx} ${hy * 0.42} ${-hx} ${-hy * 0.42} 0 ${-hy}Z`;
}

/**
 * One parallax particle layer.
 *
 * `depth` scales speed, size and opacity together, so nearer layers move faster
 * and read heavier — which is the whole of what sells parallax. Sway rides the
 * same shared value as the fall, so horizontal drift costs nothing extra.
 */
function MoteLayer({
  motes,
  kind,
  color,
  w,
  h,
  depth,
  driftSec,
  index,
}: {
  motes: MoteSpec[];
  kind: MoteKind;
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
    // Each layer gets a slightly different period so the three never align and
    // the field never visibly repeats.
    const dur = driftSec * 1000 * (1.6 - depth * 0.5) * (1 + index * 0.17);
    t.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [driftSec, depth, index, t]);

  const style = useAnimatedStyle(() => {
    // Petals fall (canvas moves down); pollen and dust rise. Both wrap by
    // exactly one screen height, so the direction is just a sign flip.
    const dir = kind === 'petal' ? 1 : -1;
    const fall = dir * t.value * h;
    // Sway: a slow lateral wander, wider on nearer layers. Two full periods per
    // fall so a petal crosses the screen twice on its way down.
    const sway = Math.sin(t.value * Math.PI * 2 + index) * 14 * depth;
    return { transform: [{ translateY: fall }, { translateX: sway }] };
  });

  if (motes.length === 0) return null;

  const isPetal = kind === 'petal';

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { top: isPetal ? -h : 0 }, style]}
      pointerEvents="none"
    >
      <Svg width={w} height={h * 2}>
        {/* Drawn twice — at y and y+h — so the wrap has no seam. */}
        {[0, h].map((offset) =>
          motes.map((m, i) =>
            isPetal ? (
              <G
                key={`${offset}-${i}`}
                transform={`translate(${m.x} ${m.y + offset}) rotate(${m.rot})`}
              >
                <Path d={petalPath(m.r * depth, m.aspect)} fill={color} opacity={m.o * depth} />
              </G>
            ) : (
              <Circle
                key={`${offset}-${i}`}
                cx={m.x}
                cy={m.y + offset}
                r={m.r * depth}
                fill={color}
                opacity={m.o * depth}
              />
            )
          )
        )}
      </Svg>
    </Animated.View>
  );
}

/** A large soft bloom. Drifts on an open elliptical path over tens of seconds. */
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

  // Two unrelated frequencies on x and y trace an open loop rather than a line,
  // so the bloom never appears to retrace its own path.
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
 * panels; a faint irregular texture hides the stepping and reads as paper
 * grain, which suits a stationery-adjacent brand anyway.
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
  /** Dark canvases need a lighter grain, or it reads as dirt. */
  isDark: boolean;
}

/**
 * Renders an Atmosphere record. Pure presentation — every grading decision was
 * made in `theme/atmosphere.ts`, which is where it can be tested.
 */
const Atmosphere = ({ atmos, isDark }: AtmosphereProps) => {
  const { width: w, height: h } = useWindowDimensions();
  const systemReduced = useReducedMotion();

  // Respect the system flag even if the caller forgot to thread it through.
  const driftSec = systemReduced ? Infinity : atmos.driftSec;
  const motes = useMemo(
    () => buildMotes(atmos.mote, systemReduced ? 0 : atmos.moteCount, w, h, 20260723),
    [atmos.mote, atmos.moteCount, systemReduced, w, h]
  );

  // Split the particle set across three depths for parallax.
  const layers = useMemo(() => {
    const third = Math.ceil(motes.length / 3);
    return [motes.slice(0, third), motes.slice(third, third * 2), motes.slice(third * 2)];
  }, [motes]);

  /**
   * Petals take the phase's own hue; everything else takes a neutral.
   *
   * A grey speck on warm paper reads as a smudge — the particle has to belong
   * to the same light as the canvas or the eye files it as damage. In dark mode
   * the petal lightens instead, because a rose petal on plum ink at 15% is
   * invisible.
   */
  const moteColor =
    atmos.mote === 'petal'
      ? isDark
        ? 'rgba(255,236,243,0.85)'
        : atmos.hue
      : isDark
        ? 'rgba(255,255,255,0.9)'
        : 'rgba(186,148,158,0.75)';

  const grainTone = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(90,50,66,0.04)';

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
      {/* Third bloom, low and slow. Three periods with no common factor keep
          the field from ever visibly repeating. */}
      <Orb
        id="atmos-orb-c"
        color={atmos.orbs[2]}
        size={w * 1.2}
        x={-w * 0.1}
        y={h * 0.66}
        driftSec={driftSec * 1.73}
        phase={0.77}
      />

      {layers.map((layer, i) => (
        <MoteLayer
          key={i}
          motes={layer}
          kind={atmos.mote}
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
