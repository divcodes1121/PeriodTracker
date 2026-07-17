import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Bloom Garden — a dusk meadow where every touch grows a flower.
 *
 * The scene has a real horizon now: a low moon with a breathing halo, two
 * hill silhouettes, and grass along the bottom edge. Flowers no longer just
 * appear — they unfold (outer petals, then inner petals, then the heart, each
 * on its own spring) and shed a small burst of sparkles as they open. Old
 * blooms dim rather than vanish. Fireflies and drifting pollen keep the field
 * alive between touches. All pools are capped + age-pruned.
 */

const DUSK = ['#2E2440', '#221B33', '#151022'] as const;
/** Petal pairs: base hue + a lighter inner ring, so each flower reads layered. */
const PETALS = [
  { base: '#E8A9BD', light: '#F3CBD9' },
  { base: '#CDB6E4', light: '#E2D4F1' },
  { base: '#F2C9A2', light: '#F8DFC5' },
  { base: '#F4EFE7', light: '#FFFDF7' },
  { base: '#A9C6E8', light: '#CBDDF2' },
];
const CENTER = '#FFE9BE';
const STAMEN = '#C89A5B';
const FIREFLY = '#FFE7A3';

const MAX_FLOWERS = 18;
const FLOWER_LIFE_MS = 46000;
const STEP_PX = 26;
const SPARKS = [0, 60, 120, 180, 240, 300];

interface Bloom {
  id: number;
  x: number;
  y: number;
  size: number;
  palette: { base: string; light: string };
  seed: number;
  born: number;
}

/**
 * One flower. Three stacked layers (outer petals / inner petals / heart) each
 * spring open on their own delay — the stagger is what makes it feel like
 * growth instead of appearance. A single one-shot progress drives the sparkle
 * burst so six sparks cost one animation.
 */
const Flower = memo(function Flower({
  size,
  palette,
  seed,
}: {
  size: number;
  palette: { base: string; light: string };
  seed: number;
}) {
  const outer = useSharedValue(0);
  const inner = useSharedValue(0);
  const heart = useSharedValue(0);
  const spark = useSharedValue(0);
  const rot = useSharedValue(seed * 360);
  const fade = useSharedValue(1);

  useEffect(() => {
    outer.value = withSpring(1, { damping: 12, stiffness: 150, mass: 0.8 });
    inner.value = withDelay(110, withSpring(1, { damping: 11, stiffness: 170, mass: 0.7 }));
    heart.value = withDelay(200, withSpring(1, { damping: 9, stiffness: 210, mass: 0.6 }));
    spark.value = withDelay(90, withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }));
    rot.value = withRepeat(
      withSequence(
        withTiming(seed * 360 + 6, { duration: 2800 + seed * 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(seed * 360 - 6, { duration: 2800 + seed * 1400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    // The garden remembers, but softly — old blooms recede instead of popping out.
    fade.value = withDelay(26000, withTiming(0.32, { duration: 16000 }));
  }, [outer, inner, heart, spark, rot, fade, seed]);

  const wrap = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ rotate: `${rot.value}deg` }],
  }));
  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outer.value }, { rotate: `${(1 - outer.value) * -24}deg` }],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inner.value }, { rotate: `${(1 - inner.value) * 30}deg` }],
  }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, wrap]}>
      {/* Sparkle burst — one-shot on open */}
      {SPARKS.map((a) => (
        <SparkDot key={a} angle={a} dist={size * 0.62} spark={spark} color={palette.light} cx={size / 2} cy={size / 2} />
      ))}

      <Animated.View style={[StyleSheet.absoluteFill, outerStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {SPARKS.map((a) => (
            <Ellipse
              key={a}
              cx="50"
              cy="28"
              rx="15"
              ry="23"
              transform={`rotate(${a} 50 50)`}
              fill={palette.base}
              opacity={0.9}
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, innerStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {[36, 108, 180, 252, 324].map((a) => (
            <Ellipse
              key={a}
              cx="50"
              cy="35"
              rx="10"
              ry="16"
              transform={`rotate(${a} 50 50)`}
              fill={palette.light}
              opacity={0.95}
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, heartStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="10" fill={CENTER} />
          {[0, 72, 144, 216, 288].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <Circle
                key={a}
                cx={50 + Math.cos(rad) * 6.5}
                cy={50 + Math.sin(rad) * 6.5}
                r="1.7"
                fill={STAMEN}
              />
            );
          })}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
});

/** One sparkle flying out as the flower opens; shared progress drives all six. */
const SparkDot = memo(function SparkDot({
  angle,
  dist,
  spark,
  color,
  cx,
  cy,
}: {
  angle: number;
  dist: number;
  spark: { value: number };
  color: string;
  cx: number;
  cy: number;
}) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    const p = spark.value;
    return {
      opacity: p >= 1 ? 0 : (1 - p) * 0.9,
      transform: [
        { translateX: Math.cos(rad) * dist * p },
        { translateY: Math.sin(rad) * dist * p },
        { scale: 1 - p * 0.5 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sparkDot, { left: cx - 2, top: cy - 2, backgroundColor: color }, style]}
    />
  );
});

/** Firefly with a layered halo, wandering on independent loops. */
const Firefly = memo(function Firefly({ w, h, seed }: { w: number; h: number; seed: number }) {
  const cfg = useMemo(() => {
    const sx = 20 + seed * (w - 40);
    const sy = 30 + ((seed * 7919) % 1) * (h - 120);
    return {
      sx,
      sy,
      dx: 30 + seed * 60,
      dy: 24 + ((seed * 104729) % 1) * 50,
      dur: 3600 + seed * 3200,
      pulse: 1400 + seed * 1600,
    };
  }, [w, h, seed]);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const glow = useSharedValue(0.2);

  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(cfg.dx, { duration: cfg.dur, easing: Easing.inOut(Easing.quad) }),
        withTiming(-cfg.dx * 0.6, { duration: cfg.dur * 1.2, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    y.value = withRepeat(
      withSequence(
        withTiming(-cfg.dy, { duration: cfg.dur * 1.15, easing: Easing.inOut(Easing.quad) }),
        withTiming(cfg.dy * 0.7, { duration: cfg.dur, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: cfg.pulse, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.12, { duration: cfg.pulse, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [cfg, x, y, glow]);

  const style = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: cfg.sx, top: cfg.sy }, style]}
    >
      <View style={styles.fireflyOuter}>
        <View style={styles.fireflyHalo}>
          <View style={styles.fireflyCore} />
        </View>
      </View>
    </Animated.View>
  );
});

/** A mote of pollen drifting slowly upward through the dusk. */
const Pollen = memo(function Pollen({ w, h, seed }: { w: number; h: number; seed: number }) {
  const cfg = useMemo(
    () => ({
      x: 10 + seed * (w - 20),
      dur: 16000 + ((seed * 9301) % 1) * 14000,
      delay: seed * 9000,
      sway: 12 + seed * 18,
    }),
    [w, seed]
  );
  const y = useSharedValue(h + 10);
  const x = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      cfg.delay,
      withRepeat(
        withSequence(
          withTiming(-16, { duration: cfg.dur, easing: Easing.linear }),
          withTiming(h + 10, { duration: 0 })
        ),
        -1
      )
    );
    x.value = withRepeat(
      withSequence(
        withTiming(cfg.sway, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-cfg.sway, { duration: 3000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [cfg, h, x, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: x.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: cfg.x, top: 0 }, style]}>
      <View style={styles.pollen} />
    </Animated.View>
  );
});

/** Low moon with a halo that breathes on the ambient rhythm. */
const Moon = memo(function Moon({ x, y }: { x: number; y: number }) {
  const halo = useSharedValue(0);
  useEffect(() => {
    halo.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 4200, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [halo]);
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + halo.value * 0.1,
    transform: [{ scale: 0.94 + halo.value * 0.12 }],
  }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 44, top: y - 44 }}>
      <Animated.View style={[styles.moonHalo, haloStyle]} />
      <Svg width={88} height={88} viewBox="0 0 88 88">
        <Circle cx={44} cy={44} r={20} fill="#F4E8CE" opacity={0.95} />
        <Circle cx={38} cy={39} r={3.6} fill="rgba(0,0,0,0.05)" />
        <Circle cx={49} cy={49} r={2.6} fill="rgba(0,0,0,0.045)" />
        <Circle cx={47} cy={37} r={1.8} fill="rgba(0,0,0,0.04)" />
      </Svg>
    </View>
  );
});

const BloomGarden = () => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [blooms, setBlooms] = useState<Bloom[]>([]);
  const idRef = useRef(1);
  const lastHaptic = useRef(0);
  const last = useSharedValue({ x: 0, y: 0 });

  const spawn = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastHaptic.current > 110) {
      lastHaptic.current = now;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setBlooms((prev) => {
      let next = prev.filter((b) => now - b.born < FLOWER_LIFE_MS);
      if (next.length >= MAX_FLOWERS) next = next.slice(next.length - MAX_FLOWERS + 1);
      const seed = Math.random();
      return [
        ...next,
        {
          id: idRef.current++,
          x,
          y,
          size: 40 + seed * 32,
          palette: PETALS[Math.floor(seed * PETALS.length)],
          seed,
          born: now,
        },
      ];
    });
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          last.value = { x: e.x, y: e.y };
          runOnJS(spawn)(e.x, e.y);
        })
        .onUpdate((e) => {
          const dx = e.x - last.value.x;
          const dy = e.y - last.value.y;
          if (dx * dx + dy * dy > STEP_PX * STEP_PX) {
            last.value = { x: e.x, y: e.y };
            runOnJS(spawn)(e.x, e.y);
          }
        }),
    [spawn, last]
  );

  const fireflySeeds = useMemo(() => Array.from({ length: 6 }, (_, i) => (i + 0.5) / 6.3), []);
  const pollenSeeds = useMemo(() => Array.from({ length: 5 }, (_, i) => (i + 0.35) / 5.2), []);

  /** Static grass blades along the bottom edge, seeded once per layout. */
  const grass = useMemo(() => {
    if (size.w === 0) return [];
    return Array.from({ length: 18 }, (_, i) => {
      const x = (i + 0.5) * (size.w / 18) + (((i * 37) % 11) - 5);
      const len = 16 + ((i * 53) % 22);
      const lean = (((i * 29) % 13) - 6) * 0.9;
      return { x, len, lean };
    });
  }, [size]);

  const { w, h } = size;

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.root}
        onLayout={(e) =>
          setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        <LinearGradient colors={DUSK} style={StyleSheet.absoluteFill} />
        <View style={[styles.mist, { bottom: -140, left: -60, width: 380, height: 380 }]} />
        <View style={[styles.mist, { top: -100, right: -80, width: 320, height: 320 }]} />

        {w > 0 && <Moon x={w * 0.82} y={h * 0.16} />}

        {/* Horizon — hills, then near ground, then grass */}
        {w > 0 && (
          <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Path
              d={`M0 ${h} L0 ${h * 0.82} Q ${w * 0.3} ${h * 0.7}, ${w * 0.6} ${h * 0.83} T ${w} ${h * 0.78} L${w} ${h} Z`}
              fill="rgba(18,12,30,0.75)"
            />
            <Path
              d={`M0 ${h} L0 ${h * 0.92} Q ${w * 0.45} ${h * 0.82}, ${w} ${h * 0.93} L${w} ${h} Z`}
              fill="#0E0A1A"
            />
            {grass.map((g, i) => (
              <Path
                key={i}
                d={`M${g.x} ${h} Q ${g.x + g.lean * 0.4} ${h - g.len * 0.55}, ${g.x + g.lean} ${h - g.len}`}
                stroke={i % 3 ? '#1C1430' : '#241B3A'}
                strokeWidth={i % 4 ? 1.6 : 2.2}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </Svg>
        )}

        {/* Your garden */}
        {blooms.map((b) => (
          <View
            key={b.id}
            pointerEvents="none"
            style={{ position: 'absolute', left: b.x - b.size / 2, top: b.y - b.size / 2 }}
          >
            <Flower size={b.size} palette={b.palette} seed={b.seed} />
          </View>
        ))}

        {/* Ambient life */}
        {h > 0 && pollenSeeds.map((s, i) => <Pollen key={i} w={w} h={h} seed={s} />)}
        {h > 0 && fireflySeeds.map((s, i) => <Firefly key={i} w={w} h={h} seed={s} />)}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  mist: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(226,170,204,0.06)' },
  sparkDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  moonHalo: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F4E8CE',
  },
  fireflyOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,231,163,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireflyHalo: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: 'rgba(255,231,163,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireflyCore: { width: 4.5, height: 4.5, borderRadius: 3, backgroundColor: FIREFLY },
  pollen: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,244,214,0.5)',
  },
});

export default BloomGarden;
