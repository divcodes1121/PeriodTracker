import { ReactNode, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, G } from 'react-native-svg';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
  cancelAnimation,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { getCyclePhase, getPhaseRanges } from '../utils/cycleCalculations';
import { PHASE_GRADIENTS, PHASE_DEEP, COLORS } from '../constants';
import { MOTION, SPACE } from '../theme/tokens';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE BLOOM RING — Bloomly's signature.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every period tracker on the store draws the same object: a circular progress
 * bar with a number in it. It is a perfectly good chart and it is nobody's
 * favourite thing about any app.
 *
 * Bloomly draws **a flower opening over a month** instead.
 *
 * Twelve petals sit around the ring. Each owns a slice of the cycle and takes
 * the colour of the phase that slice falls in — rose, then peach, then gold,
 * then lavender. Petals behind you are open and full-colour; petals ahead are
 * folded, small and pale; the petal you are standing in is caught mid-open.
 *
 * Three things fall out of that, and each one replaces a piece of UI:
 *
 *   • **Progress is legible without reading a number.** How much of the flower
 *     is open *is* how far through the cycle you are.
 *   • **Phase is legible without a legend.** The colour under the open petals
 *     is the phase, and the boundary between colours is where phases change.
 *   • **It rewards returning.** The flower is visibly different on day 4 and
 *     day 22. A progress ring is only ever "a bit more full".
 *
 * ── Why petals are Views and not SVG paths ────────────────────────────────
 *
 * Each petal is an absolutely-positioned `Animated.View` holding one tiny
 * `Svg`, rather than a path inside a single shared canvas. Animating an SVG
 * path's geometry means recomputing `d` on every frame, which either lands on
 * the JS thread or needs `useAnimatedProps` per node; animating a **View
 * transform** is worklet-native, rock solid, and behaves identically on
 * react-native-web — where this app's whole preview workflow lives.
 *
 * The cost is 12 animated nodes. That is affordable *here* precisely because
 * it is not affordable everywhere: `Atmosphere` runs on every screen and holds
 * a six-node budget, while this is one hero on one screen.
 *
 * ── Accessibility ─────────────────────────────────────────────────────────
 *
 * Phase is never carried by colour alone: the open/closed *count* encodes
 * progress, each petal keeps a deeper rim stroke so boundaries survive
 * protanopia, and the ring is always accompanied by the phase name in text.
 * Under reduced motion the flower renders in its final state — no stagger, no
 * breathing, still a flower.
 */

/** Twelve reads as a flower. Eight reads as a compass; twenty reads as a doily. */
const PETALS = 12;

interface BloomRingProps {
  dayOfCycle: number;
  cycleLength: number;
  periodLength: number;
  /** Capitalized phase name, e.g. "Luteal" — keys PHASE_GRADIENTS. */
  phaseName: string;
  size?: number;
  /**
   * Ambient glow colour, normally `atmosphere.glow`. The halo adopts the app's
   * current atmosphere so the hero agrees with the canvas behind it at every
   * hour rather than lighting itself independently.
   */
  glow?: string;
  /**
   * Where light comes from, in degrees (`atmosphere.lightAngle`). Rotates the
   * gradient sweep so the ring is lit from the same direction as every other
   * surface in the app.
   */
  lightAngle?: number;
  children?: ReactNode;
}

interface PetalSpec {
  /** Index around the ring. */
  i: number;
  /** Angle in degrees, 0 = up, clockwise. */
  deg: number;
  /** Cycle day at the centre of this petal's slice. */
  day: number;
  fill: string;
  rim: string;
  /** 0..1 — how far this petal is from being fully open, at rest. */
  target: number;
}

/**
 * One petal. A teardrop with a soft inner vein — the vein is what stops a flat
 * fill reading as a guitar pick.
 *
 * `openness` drives four things at once (length, width, push-out, opacity)
 * because a real petal does not just fade in: it unfurls, lengthens and leans
 * away from the centre. Changing one of those alone looks like a bug.
 */
function Petal({
  spec,
  bloom,
  rBase,
  pw,
  ph,
  reduced,
}: {
  spec: PetalSpec;
  bloom: SharedValue<number>;
  rBase: number;
  pw: number;
  ph: number;
  reduced: boolean;
}) {
  const style = useAnimatedStyle(() => {
    // `bloom` runs 0 → 1 on mount; each petal's own openness is its target
    // scaled by that, so the flower opens outward-in-order rather than all at
    // once. The stagger is geometric, not a chain of delays.
    const o = spec.target * bloom.value;
    const grow = interpolate(o, [0, 1], [0.8, 1], Extrapolation.CLAMP);
    const rad = ((spec.deg - 90) * Math.PI) / 180;
    const r = rBase * grow;
    return {
      opacity: interpolate(o, [0, 1], [0.16, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: Math.cos(rad) * r },
        { translateY: Math.sin(rad) * r },
        { rotate: `${spec.deg}deg` },
        // Width closes in faster than length — a folded petal is a *sliver*,
        // not a small petal. This is the single detail that makes the closed
        // half read as "not yet" rather than "faded out".
        { scaleX: interpolate(o, [0, 1], [0.34, 1], Extrapolation.CLAMP) },
        { scaleY: interpolate(o, [0, 1], [0.62, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.petal,
        { width: pw, height: ph, marginLeft: -pw / 2, marginTop: -ph / 2 },
        reduced ? { opacity: spec.target < 0.02 ? 0.16 : 1 } : null,
        style,
      ]}
    >
      <Svg width={pw} height={ph} viewBox={`0 0 ${pw} ${ph}`}>
        <Path
          d={`M${pw / 2} 1C${pw * 0.99} ${ph * 0.3} ${pw * 0.99} ${ph * 0.72} ${pw / 2} ${ph - 1}C${pw * 0.01} ${ph * 0.72} ${pw * 0.01} ${ph * 0.3} ${pw / 2} 1Z`}
          fill={spec.fill}
          stroke={spec.rim}
          strokeWidth={1.1}
          strokeOpacity={0.5}
        />
        {/* Vein. Barely visible, entirely load-bearing. */}
        <Path
          d={`M${pw / 2} ${ph * 0.16}L${pw / 2} ${ph * 0.82}`}
          stroke={spec.rim}
          strokeWidth={1}
          strokeOpacity={0.22}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

const BloomRing = ({
  dayOfCycle,
  cycleLength,
  periodLength,
  phaseName,
  size = 300,
  glow,
  lightAngle = 15,
  children,
}: BloomRingProps) => {
  const { colors: c, isDark } = useTheme();
  const reduced = useReducedMotion();

  const bloom = useSharedValue(reduced ? 1 : 0);
  const breath = useSharedValue(0);

  const progress = Math.max(0, Math.min(1, dayOfCycle / cycleLength));
  const ramp = PHASE_GRADIENTS[phaseName] ?? PHASE_GRADIENTS.Menstrual;

  // Geometry. The petals form the body; a hairline track and the phase arcs sit
  // outside them, so the ring still functions as an honest timeline for anyone
  // who wants to read it as one.
  const center = size / 2;
  const ph = size * 0.3;
  const pw = size * 0.135;
  const rBase = size * 0.32;
  const rTrack = size * 0.47;

  /**
   * Petal specs. Colour comes from the *cycle maths*, not from a hand-written
   * table, so the flower can never disagree with the phase label printed
   * underneath it — the same reason the arcs are derived rather than drawn.
   */
  const petals = useMemo<PetalSpec[]>(() => {
    return Array.from({ length: PETALS }, (_, i) => {
      // Day at the middle of this petal's slice.
      const day = Math.round(((i + 0.5) / PETALS) * cycleLength) || 1;
      const key = getCyclePhase(day, cycleLength, periodLength)?.name ?? 'menstrual';
      const fill = (COLORS as Record<string, string>)[key] ?? COLORS.menstrual;
      // Openness: fully open behind you, folded ahead, and the petal you are
      // standing in caught partway. `* PETALS` turns the whole-cycle fraction
      // into a per-petal one.
      const edge = i / PETALS;
      const target = Math.max(0, Math.min(1, (progress - edge) * PETALS));
      return {
        i,
        deg: (i / PETALS) * 360,
        day,
        fill,
        rim: PHASE_DEEP[key] ?? COLORS.primaryDeep,
        target,
      };
    });
  }, [cycleLength, periodLength, progress]);

  useEffect(() => {
    if (reduced) {
      bloom.value = 1;
      return;
    }
    // Opens once on mount and on any cycle change. Slow enough to be watched,
    // short enough that it never blocks the first tap.
    bloom.value = 0;
    bloom.value = withDelay(
      MOTION.stagger * 2,
      withTiming(1, { duration: MOTION.bloom, easing: Easing.bezier(0.16, 1, 0.3, 1) })
    );
  }, [progress, reduced, bloom]);

  useEffect(() => {
    if (reduced) {
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: MOTION.ambient, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: MOTION.ambient, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(breath);
  }, [reduced, breath]);

  /** The phase arcs, straight from the cycle maths. */
  const arcs = useMemo(() => {
    const circumference = 2 * Math.PI * rTrack;
    return getPhaseRanges(cycleLength, periodLength).map((r) => {
      const lengthFrac = (r.endDay - r.startDay + 1) / cycleLength;
      const gap = circumference * 0.008;
      const dash = Math.max(circumference * lengthFrac - gap, 1);
      return {
        key: r.key,
        color: isDark ? r.color : (PHASE_DEEP[r.key] ?? r.color),
        dasharray: [dash, circumference - dash] as [number, number],
        rotation: ((r.startDay - 1) / cycleLength) * 360,
      };
    });
  }, [cycleLength, periodLength, rTrack, isDark]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + breath.value * 0.5,
    transform: [{ scale: 0.9 + breath.value * 0.08 }],
  }));

  /** Marker riding the rim, so "today" has a position as well as a number. */
  const markerStyle = useAnimatedStyle(() => {
    const angle = progress * bloom.value * 2 * Math.PI - Math.PI / 2;
    return {
      transform: [
        { translateX: Math.cos(angle) * rTrack },
        { translateY: Math.sin(angle) * rTrack },
        { scale: 1 + breath.value * 0.14 },
      ],
    };
  });

  /** The centre lifts very slightly as the flower opens — a settling, not a pop. */
  const coreStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bloom.value, [0, 0.5, 1], [0, 0.4, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(bloom.value, [0, 1], [0.9, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="image"
      accessibilityLabel={`Day ${dayOfCycle} of ${cycleLength}, ${phaseName} phase`}
    >
      {/* Ambient halo. The only motion at rest, and it breathes on the app's
          shared rhythm rather than a rate this component invented. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: size / 2, backgroundColor: glow ?? ramp[0] },
          haloStyle,
        ]}
      />

      {/* Track + phase arcs. Hairline: this is the reference grid the flower
          sits on, not a competing element. */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient
            id="bloom-sweep"
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

        <Circle
          cx={center}
          cy={center}
          r={rTrack}
          stroke={c.trackNeutral}
          strokeWidth={2}
          fill="none"
        />

        <G rotation={-90} origin={`${center}, ${center}`}>
          {arcs.map((a) => (
            <Circle
              key={a.key}
              cx={center}
              cy={center}
              r={rTrack}
              stroke={a.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={a.dasharray}
              rotation={a.rotation}
              origin={`${center}, ${center}`}
              opacity={0.55}
              fill="none"
            />
          ))}
        </G>
      </Svg>

      {/* The flower. */}
      {petals.map((spec) => (
        <Petal
          key={spec.i}
          spec={spec}
          bloom={bloom}
          rBase={rBase}
          pw={pw}
          ph={ph}
          reduced={reduced}
        />
      ))}

      {/* Marker dot on the rim. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.marker,
          {
            width: size * 0.042,
            height: size * 0.042,
            borderRadius: size,
            backgroundColor: c.card,
            borderColor: ramp[2],
            borderWidth: 3,
          },
          markerStyle,
        ]}
      />

      {/* The core — a soft disc so the day number always has something legible
          behind it regardless of which petals are open under it. */}
      <Animated.View style={[styles.core, coreStyle]} pointerEvents="none">
        <View
          style={[
            styles.coreDisc,
            {
              width: size * 0.44,
              height: size * 0.44,
              borderRadius: size,
              backgroundColor: isDark ? 'rgba(28,22,31,0.72)' : 'rgba(255,253,251,0.82)',
            },
          ]}
        />
        <View style={styles.coreContent}>{children}</View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  petal: { position: 'absolute', left: '50%', top: '50%' },
  marker: { position: 'absolute' },
  core: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  coreDisc: { position: 'absolute' },
  coreContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACE.sm },
});

export default BloomRing;
