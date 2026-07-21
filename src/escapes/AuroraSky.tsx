import { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Polyline,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

/**
 * Aurora Sky — "Paint the night."
 *
 * An interactive meditation, not a game. There is nothing to complete: sweeping
 * a finger across the sky releases ribbons of light that keep dancing long after
 * you lift off, stars brighten as the sky fills, and constellations quietly
 * assemble themselves out of whatever the sky has become.
 *
 * ARCHITECTURE — the same discipline as BubbleTherapy and RainCatcher:
 *
 *  - **Fixed pools, zero spawn re-renders.** Ribbons, stars and shooting stars
 *    are all allocated once and recycled by writing shared values. A gesture
 *    never calls setState, so painting the sky costs no React work at all.
 *  - **One shared `energy` value** carries "how alive is the sky" (0→1). Every
 *    star, the moon, the haze and the horizon glow sample it inside their own
 *    worklets — a scene-wide response for one write, the same trick as the
 *    shimmer wave in Bubbles.
 *  - **Ribbons are transforms, not path data.** Each ribbon is a static curved
 *    SVG band; the dancing comes from animating translate/scale/rotate on three
 *    nested layers at unrelated frequencies. Animating `d` per frame would look
 *    marginally more liquid and cost an order of magnitude more.
 *  - **No Skia.** Asked for in the brief, but it is not a dependency, needs a
 *    native prebuild, and would break the web preview. Same conclusion the
 *    other scenes reached; layered translucent SVG + Reanimated gets there.
 *
 * The sky is procedurally seeded per session (horizon shape, star scatter, moon
 * phase, whether a rare event shows up), so no two visits open the same way.
 */

/* --------------------------------- Palette -------------------------------- */

const SKY = ['#070B1E', '#0C1230', '#131A3E', '#1B1B42'] as const;

/** Real northern-light hues — saturated but never neon. */
const RIBBON_COLORS = [
  { core: '#5FD3B4', edge: '#2E7F72' }, // emerald
  { core: '#59C8D8', edge: '#2A6E88' }, // turquoise
  { core: '#7FD8E8', edge: '#356F91' }, // soft cyan
  { core: '#9B8FE0', edge: '#4A3F86' }, // violet
  { core: '#C98FD8', edge: '#6B3F7E' }, // magenta highlight
];

const STAR_TINTS = ['#FFFFFF', '#FFF6E2', '#FFEFC9', '#EAF2FF'];

const RIBBON_COUNT = 7;
const STAR_COUNT = 68;

/** Deterministic PRNG — one seed makes a whole sky reproducible. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* --------------------------------- Ribbon --------------------------------- */

/**
 * One aurora ribbon. Three nested translucent bands drifting at unrelated
 * rates, which is what makes a flat vector shape read as volumetric light.
 */
function Ribbon({
  index,
  w,
  h,
  x,
  y,
  life,
  reduced,
}: {
  index: number;
  w: number;
  h: number;
  x: SharedValue<number>;
  y: SharedValue<number>;
  life: SharedValue<number>;
  reduced: boolean;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      t.value = 0.5;
      return;
    }
    const dur = 9000 + index * 1400;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: dur, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(t);
  }, [index, reduced, t]);

  const bandW = w * 1.5;
  const bandH = h * 0.46;

  // Outer haze — widest, faintest, slowest.
  const outer = useAnimatedStyle(() => ({
    opacity: life.value * 0.3,
    transform: [
      { translateX: x.value - bandW / 2 + Math.sin(t.value * Math.PI * 2) * 26 },
      { translateY: y.value - bandH / 2 - life.value * 30 },
      { scaleX: 1.15 + Math.sin(t.value * Math.PI * 2 + 1.1) * 0.09 },
      { scaleY: 1.1 + t.value * 0.14 },
      { rotate: `${-6 + Math.sin(t.value * Math.PI * 2) * 5}deg` },
    ],
  }));

  // Mid body — the ribbon you actually read.
  const mid = useAnimatedStyle(() => ({
    opacity: life.value * 0.62,
    transform: [
      { translateX: x.value - bandW / 2 + Math.sin(t.value * Math.PI * 2 + 2.2) * 16 },
      { translateY: y.value - bandH / 2 - life.value * 46 },
      { scaleX: 1 + Math.sin(t.value * Math.PI * 2 + 0.6) * 0.07 },
      { scaleY: 0.94 + t.value * 0.1 },
      { rotate: `${-3 + Math.sin(t.value * Math.PI * 2 + 0.9) * 4}deg` },
    ],
  }));

  // Bright core — narrow, most opaque, fastest, so the ribbon has a spine.
  const core = useAnimatedStyle(() => ({
    opacity: life.value * 0.85,
    transform: [
      { translateX: x.value - bandW / 2 + Math.sin(t.value * Math.PI * 2 + 3.6) * 9 },
      { translateY: y.value - bandH / 2 - life.value * 58 },
      { scaleX: 0.82 + Math.sin(t.value * Math.PI * 2 + 1.7) * 0.05 },
      { scaleY: 0.6 },
      { rotate: `${-2 + Math.sin(t.value * Math.PI * 2 + 2.4) * 3}deg` },
    ],
  }));

  const gid = `rb-${index}`;
  const c = RIBBON_COLORS[index % RIBBON_COLORS.length];

  /**
   * A curtain, not a blob.
   *
   * The first pass filled an S-curve with a flat gradient, which read as opaque
   * coloured paint covering the sky. Real aurora is a *curtain*: a wavy upper
   * edge from which near-vertical rays hang down and fade out, each ray a
   * slightly different length and brightness. That vertical striation is the
   * entire visual signature, and it is cheap — a set of tapered quads sharing
   * one gradient.
   *
   * `layer` scales ray count and width so the three stacked copies read as
   * depth rather than as the same shape three times.
   */
  const Curtain = ({ style, layer }: { style: any; layer: number }) => {
    // Many thin rays beat few wide ones: at this density the quads overlap into
    // a continuous sheet and stop reading as individual polygons.
    const rays = 64 - layer * 10;
    const topOf = (f: number) =>
      bandH * (0.16 + Math.sin(f * Math.PI * 2.4 + index) * 0.09 + Math.sin(f * Math.PI * 5.1) * 0.04);

    return (
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', width: bandW, height: bandH }, style]}
      >
        <Svg width={bandW} height={bandH}>
          <Defs>
            <SvgLinearGradient id={`${gid}-${layer}`} x1="0" y1="0" x2="0" y2="1">
              {/* Bright along the top edge, dissolving downward — the light
                  source is above, in the magnetosphere. */}
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
              <Stop offset="0.12" stopColor={c.core} stopOpacity={0.95} />
              <Stop offset="0.55" stopColor={c.core} stopOpacity={0.4} />
              <Stop offset="0.85" stopColor={c.edge} stopOpacity={0.12} />
              <Stop offset="1" stopColor={c.edge} stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>

          {Array.from({ length: rays }, (_, r) => {
            const f = r / rays;
            // Rays overlap by ~2.4x their slot, which is what dissolves the
            // individual quad silhouettes into a sheet.
            const rw = (bandW / rays) * 2.4;
            const x = f * bandW - rw * 0.3;
            // Each ray starts at its own height, so the upper edge feathers
            // instead of tracing one clean curve.
            const top = topOf(f) - ((r * 41) % 10) * bandH * 0.012;
            // Length varies so the lower edge is ragged, never a straight cut.
            const len = bandH * (0.46 + ((r * 53) % 10) / 16);
            return (
              <Path
                key={r}
                d={`M${x} ${top} L${x + rw} ${top + bandH * 0.015} L${x + rw * 0.62} ${top + len} L${x + rw * 0.3} ${top + len * 0.88} Z`}
                fill={`url(#${gid}-${layer})`}
                // Low per-ray alpha: brightness comes from accumulation, which
                // is how the real thing builds up too.
                opacity={0.16 + ((r * 29) % 10) / 42}
              />
            );
          })}
        </Svg>
      </Animated.View>
    );
  };

  return (
    <>
      <Curtain style={outer} layer={0} />
      <Curtain style={mid} layer={1} />
      <Curtain style={core} layer={2} />
    </>
  );
}

/* ---------------------------------- Star ---------------------------------- */

/**
 * A star. Brightness is a function of the shared sky energy plus its own
 * twinkle, so the whole field responds to painting without a single re-render.
 */
function Star({
  cx,
  cy,
  r,
  tint,
  threshold,
  delay,
  energy,
  reduced,
}: {
  cx: number;
  cy: number;
  r: number;
  tint: string;
  /** Energy at which this star begins to appear. 0 = always visible. */
  threshold: number;
  delay: number;
  energy: SharedValue<number>;
  reduced: boolean;
}) {
  const tw = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      tw.value = 0.5;
      return;
    }
    tw.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1700 + delay, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1700 + delay, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(tw);
  }, [delay, reduced, tw]);

  const style = useAnimatedStyle(() => {
    // Stars never pop in: they ramp over a band of energy above their threshold.
    const born = Math.max(0, Math.min(1, (energy.value - threshold) / 0.22));
    const twinkle = 0.55 + tw.value * 0.45;
    return {
      opacity: born * twinkle,
      transform: [{ scale: 0.7 + born * 0.3 + tw.value * 0.12 }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: cx - r * 3, top: cy - r * 3, width: r * 6, height: r * 6 }, style]}
    >
      <Svg width={r * 6} height={r * 6}>
        <Defs>
          <RadialGradient id={`sg-${cx.toFixed(0)}-${cy.toFixed(0)}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tint} stopOpacity={1} />
            <Stop offset="0.4" stopColor={tint} stopOpacity={0.5} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r * 3} cy={r * 3} r={r * 3} fill={`url(#sg-${cx.toFixed(0)}-${cy.toFixed(0)})`} />
        <Circle cx={r * 3} cy={r * 3} r={r} fill={tint} />
      </Svg>
    </Animated.View>
  );
}

/* ------------------------------- Shooting star ---------------------------- */

function ShootingStar({ w, h, seed, reduced }: { w: number; h: number; seed: number; reduced: boolean }) {
  const p = useSharedValue(0);
  const rand = useMemo(() => seeded(seed), [seed]);
  const start = useMemo(() => ({ x: rand() * w * 0.7, y: rand() * h * 0.35 + 30, a: 22 + rand() * 16 }), [rand, w, h]);

  useEffect(() => {
    if (reduced) return;
    // Long silences, brief events — a shooting star that is frequent is decor.
    const run = () => {
      p.value = 0;
      p.value = withDelay(
        6000 + Math.random() * 14000,
        withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }, (done) => {
          if (done) runOnJS(run)();
        })
      );
    };
    run();
    return () => cancelAnimation(p);
  }, [p, reduced]);

  const style = useAnimatedStyle(() => {
    const travel = p.value;
    // Fade in fast, out slow, invisible at both ends.
    const o = travel < 0.15 ? travel / 0.15 : 1 - (travel - 0.15) / 0.85;
    return {
      opacity: Math.max(0, o) * 0.9,
      transform: [{ translateX: travel * w * 0.6 }, { translateY: travel * h * 0.22 }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: start.x, top: start.y }, style]}
    >
      <Svg width={90} height={40}>
        <Defs>
          <SvgLinearGradient id={`ss-${seed}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFF6E0" stopOpacity={0} />
            <Stop offset="1" stopColor="#FFF6E0" stopOpacity={0.85} />
          </SvgLinearGradient>
        </Defs>
        <G rotation={start.a} origin="0, 0">
          <Path d="M0 0 L74 0" stroke={`url(#ss-${seed})`} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx={74} cy={0} r={2.4} fill="#FFF6E0" />
        </G>
      </Svg>
    </Animated.View>
  );
}

/* ------------------------------ Constellation ----------------------------- */

/**
 * Constellations are *found*, not drawn. Each is a fixed polyline over stars
 * that already exist; it fades in once the sky is alive enough to have grown
 * them, holds, then dissolves so a different one can emerge.
 */
function Constellation({
  points,
  threshold,
  energy,
  reduced,
  w,
  h,
}: {
  points: string;
  threshold: number;
  energy: SharedValue<number>;
  reduced: boolean;
  w: number;
  h: number;
}) {
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      breathe.value = 0.6;
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.25, { duration: 11000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(breathe);
  }, [breathe, reduced]);

  const style = useAnimatedStyle(() => {
    const born = Math.max(0, Math.min(1, (energy.value - threshold) / 0.18));
    return { opacity: born * breathe.value * 0.5 };
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Polyline
          points={points}
          fill="none"
          stroke="#DCE8FF"
          strokeWidth={0.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

/* ---------------------------------- Scene --------------------------------- */

const AuroraSky = () => {
  const { width: w, height: h } = useWindowDimensions();
  const reduced = useReducedMotion();

  /** One seed per mount — the whole sky's character. */
  const seed = useRef(Math.floor(Math.random() * 1e9)).current;
  const rand = useMemo(() => seeded(seed), [seed]);

  /** How alive the sky is, 0→1. Every ambient element samples this. */
  const energy = useSharedValue(0);
  const lastHaptic = useRef(0);

  /**
   * Ribbon pool. Painting rotates through it and the oldest is reused.
   *
   * The cursor is a SharedValue, not a ref: the gesture handler is a worklet
   * and refs do not cross the JS/UI thread boundary — reading `.current` there
   * sees a stale copy, so every stroke would have driven ribbon 0.
   *
   * Hooks in an Array.from callback are safe here only because RIBBON_COUNT is
   * a module constant, so call order never changes between renders.
   */
  const nextRibbon = useSharedValue(0);
  const rx = Array.from({ length: RIBBON_COUNT }, () => useSharedValue(0));
  const ry = Array.from({ length: RIBBON_COUNT }, () => useSharedValue(0));
  const rLife = Array.from({ length: RIBBON_COUNT }, () => useSharedValue(0));

  /** Procedural sky: horizon silhouette, star scatter, moon phase. */
  const sky = useMemo(() => {
    const peaks = 5 + Math.floor(rand() * 3);
    const ridge: number[] = [];
    for (let i = 0; i <= peaks; i++) ridge.push(0.62 + rand() * 0.26);

    const stars = Array.from({ length: STAR_COUNT }, (_, i) => ({
      cx: rand() * w,
      cy: rand() * h * 0.72,
      r: 0.6 + rand() * 1.5,
      tint: STAR_TINTS[Math.floor(rand() * STAR_TINTS.length)],
      // A third are always there; the rest are earned by painting.
      threshold: i < STAR_COUNT / 3 ? 0 : rand() * 0.85,
      delay: rand() * 2200,
    }));

    // Moon phase as a horizontal offset of the shadow disc: -1 new → 0 full.
    const moonPhase = -0.85 + rand() * 0.75;
    const moonX = w * (0.6 + rand() * 0.28);
    const moonY = h * (0.1 + rand() * 0.12);

    return { ridge, stars, moonPhase, moonX, moonY };
  }, [rand, w, h]);

  /** Mountain silhouette path from the seeded ridge. */
  const ridgePath = useMemo(() => {
    const n = sky.ridge.length;
    let d = `M0 ${h} L0 ${h * sky.ridge[0]}`;
    for (let i = 1; i < n; i++) {
      const x = (i / (n - 1)) * w;
      const px = ((i - 0.5) / (n - 1)) * w;
      d += ` Q ${px} ${h * (sky.ridge[i - 1] - 0.06)}, ${x} ${h * sky.ridge[i]}`;
    }
    return d + ` L${w} ${h} Z`;
  }, [sky.ridge, w, h]);

  /**
   * A ragged conifer treeline on the near shore. Uneven heights and spacing —
   * evenly spaced triangles read instantly as a pattern rather than a forest.
   */
  const treeline = useMemo(() => {
    const r = seeded(seed ^ 0x5eed);
    const n = Math.round(w / 26);
    return Array.from({ length: n }, (_, i) => {
      const jitter = (r() - 0.5) * 22;
      return {
        x: (i / n) * (w + 40) - 20 + jitter,
        base: h * (0.935 + r() * 0.03),
        hgt: 18 + r() * 42,
        w: 5 + r() * 6,
      };
    });
  }, [seed, w, h]);

  /**
   * Constellations, found rather than drawn.
   *
   * The first pass joined stars by array index, which produced huge triangles
   * spanning the whole sky — the one thing a constellation never looks like.
   * This walks a nearest-neighbour chain from a seed star instead, so the
   * figure stays local and compact, the way a real asterism reads.
   */
  const constellations = useMemo(() => {
    const used = new Set<number>();

    const chain = (startIdx: number, n: number) => {
      const pts: string[] = [];
      let cur = startIdx;
      for (let k = 0; k < n; k++) {
        used.add(cur);
        const s = sky.stars[cur];
        pts.push(`${s.cx.toFixed(1)},${s.cy.toFixed(1)}`);

        let best = -1;
        let bestD = Infinity;
        sky.stars.forEach((o, i) => {
          if (used.has(i)) return;
          const d = Math.hypot(o.cx - s.cx, o.cy - s.cy);
          // Near, but not touching — adjacent dots make a smudge, not a figure.
          if (d > 26 && d < bestD) {
            bestD = d;
            best = i;
          }
        });
        if (best < 0) break;
        cur = best;
      }
      return pts.join(' ');
    };

    return [
      { points: chain(6, 5), threshold: 0.3 },
      { points: chain(21, 6), threshold: 0.55 },
      { points: chain(38, 4), threshold: 0.78 },
    ];
  }, [sky.stars]);

  /** Haptic on ribbon birth, throttled hard — this is a calm scene. */
  const tick = (now: number) => {
    if (now - lastHaptic.current < 260) return;
    lastHaptic.current = now;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  /**
   * Painting. The whole handler is a worklet: it writes shared values only, so
   * a full-screen sweep produces zero React renders.
   */
  const paint = Gesture.Pan()
    .onBegin((e) => {
      'worklet';
      const i = nextRibbon.value % RIBBON_COUNT;
      nextRibbon.value = (i + 1) % RIBBON_COUNT;
      rx[i].value = e.x;
      ry[i].value = e.y;
      // Reusing a live ribbon: fade the old one out under the new birth rather
      // than snapping, so a fast painter never sees a ribbon teleport.
      rLife[i].value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
      energy.value = Math.min(1, energy.value + 0.06);
      runOnJS(tick)(Date.now());
    })
    .onUpdate((e) => {
      'worklet';
      const i = (nextRibbon.value - 1 + RIBBON_COUNT) % RIBBON_COUNT;
      // The ribbon follows the finger, softly — guiding light, not drawing.
      rx[i].value += (e.x - rx[i].value) * 0.12;
      ry[i].value += (e.y - ry[i].value) * 0.12;
      energy.value = Math.min(1, energy.value + 0.0016);
    });

  /** Horizon glow and haze respond to how painted the sky is. */
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.18 + energy.value * 0.42 }));
  const hazeStyle = useAnimatedStyle(() => ({ opacity: 0.1 + energy.value * 0.2 }));
  const moonStyle = useAnimatedStyle(() => ({ opacity: 0.55 + energy.value * 0.4 }));

  const moonR = 26;

  return (
    <GestureDetector gesture={paint}>
      <View style={styles.root}>
        <LinearGradient colors={SKY} locations={[0, 0.42, 0.72, 1]} style={StyleSheet.absoluteFill} />

        {/* Milky way — a faint diagonal band, always present, never the subject */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -w * 0.25,
            top: h * 0.1,
            width: w * 1.6,
            height: h * 0.42,
            transform: [{ rotate: '-18deg' }],
          }}
        >
          <LinearGradient
            colors={['rgba(206,214,255,0)', 'rgba(206,214,255,0.07)', 'rgba(206,214,255,0)']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Stars sit behind the aurora so ribbons pass in front of them */}
        {sky.stars.map((s, i) => (
          <Star key={i} {...s} energy={energy} reduced={reduced} />
        ))}

        {constellations.map((c, i) => (
          <Constellation key={i} points={c.points} threshold={c.threshold} energy={energy} reduced={reduced} w={w} h={h} />
        ))}

        {/* Moon — a lit disc with an offset shadow disc for the phase */}
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', left: sky.moonX - moonR * 2, top: sky.moonY - moonR * 2 }, moonStyle]}
        >
          <Svg width={moonR * 4} height={moonR * 4}>
            <Defs>
              <RadialGradient id="moon-halo" cx="50%" cy="50%" r="50%">
                <Stop offset="0.4" stopColor="#F4EFE2" stopOpacity={0.34} />
                <Stop offset="1" stopColor="#F4EFE2" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={moonR * 2} cy={moonR * 2} r={moonR * 2} fill="url(#moon-halo)" />
            <Circle cx={moonR * 2} cy={moonR * 2} r={moonR} fill="#F6F1E4" />
            {/* Shadow disc, offset by the seeded phase */}
            <Circle
              cx={moonR * 2 + moonR * sky.moonPhase * 1.5}
              cy={moonR * 2}
              r={moonR}
              fill={SKY[1]}
              opacity={0.97}
            />
          </Svg>
        </Animated.View>

        <ShootingStar w={w} h={h} seed={seed} reduced={reduced} />

        {/* The aurora itself */}
        {Array.from({ length: RIBBON_COUNT }).map((_, i) => (
          <Ribbon
            key={i}
            index={i}
            w={w}
            h={h}
            x={rx[i]}
            y={ry[i]}
            life={rLife[i]}
            reduced={reduced}
          />
        ))}

        {/* Atmospheric haze over everything — unifies the layers */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, hazeStyle]}>
          <LinearGradient
            colors={['rgba(90,140,190,0)', 'rgba(90,140,190,0.08)', 'rgba(40,60,110,0.22)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Horizon: glow, then the mountains that occlude it */}
        <Animated.View pointerEvents="none" style={[styles.horizonGlow, { height: h * 0.34 }, glowStyle]}>
          <LinearGradient
            colors={['rgba(95,211,180,0)', 'rgba(95,211,180,0.16)', 'rgba(120,150,220,0.3)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <SvgLinearGradient id="ridge-far" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#141A38" />
              <Stop offset="1" stopColor="#0A0E22" />
            </SvgLinearGradient>
            {/* Snowline: light only clings to the top few percent of the ridge. */}
            <SvgLinearGradient id="ridge-snow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#9FC4D8" stopOpacity={0.6} />
              <Stop offset="0.08" stopColor="#6E8CB0" stopOpacity={0.18} />
              <Stop offset="0.2" stopColor="#6E8CB0" stopOpacity={0} />
            </SvgLinearGradient>
            <SvgLinearGradient id="lake-sheen" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#5FD3B4" stopOpacity={0.3} />
              <Stop offset="0.5" stopColor="#9B8FE0" stopOpacity={0.16} />
              <Stop offset="1" stopColor="#59C8D8" stopOpacity={0.05} />
            </SvgLinearGradient>
          </Defs>
          <Path d={ridgePath} fill="url(#ridge-far)" />

          {/* Snow catching the aurora on the high ridge — the detail that makes
              the mountains read as mountains rather than a dark shape. */}
          <Path d={ridgePath} fill="url(#ridge-snow)" opacity={0.5} />

          {/* Still water between the ridges. The reflection is the cheapest way
              to double the amount of aurora on screen, and it is what the eye
              expects from every real photograph of this. */}
          <Path d={`M0 ${h * 0.855} L${w} ${h * 0.835} L${w} ${h * 0.93} L0 ${h * 0.95} Z`} fill="#080C22" />
          <Path
            d={`M0 ${h * 0.855} L${w} ${h * 0.835} L${w} ${h * 0.93} L0 ${h * 0.95} Z`}
            fill="url(#lake-sheen)"
            opacity={0.55}
          />

          {/* Near shore, and a treeline that gives the scene a human vantage */}
          <Path
            d={`M0 ${h} L0 ${h * 0.93} Q ${w * 0.34} ${h * 0.9}, ${w * 0.6} ${h * 0.94} T ${w} ${h * 0.92} L${w} ${h} Z`}
            fill="#03050C"
          />
          {treeline.map((t, i) => (
            <Path
              key={i}
              d={`M${t.x} ${t.base} L${t.x - t.w} ${t.base} L${t.x} ${t.base - t.hgt} L${t.x + t.w} ${t.base} Z`}
              fill="#03050C"
            />
          ))}
        </Svg>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SKY[0], overflow: 'hidden' },
  horizonGlow: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});

export default AuroraSky;
