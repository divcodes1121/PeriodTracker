import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Ellipse, G, Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * Zen Garden — a full composition, not an empty canvas:
 *
 *  - raked base pattern + sand grain, so the garden reads as tended even
 *    before the first touch;
 *  - a koi pond (two koi on opposing elliptical swims, lily pads, ambient
 *    ripples) — touching the WATER makes a ripple instead of a rake mark;
 *  - a blossom branch reaching in from the corner, feeding the petal fall;
 *  - rake furrows (4 tines) along the stroke that slowly settle away.
 *
 * Scene palette is fixed, not theme-bound. All pools are capped + age-pruned.
 */

const SAND = '#EFE7D8';
const SAND_SHADE = 'rgba(203,186,155,0.35)';
const INK = 'rgba(97,83,64,0.6)';
const ROCK = '#6E665B';
const ROCK_LIGHT = '#8A8175';
const RING = 'rgba(97,83,64,0.14)';
const PETAL_PINK = 'rgba(219,148,173,0.65)';
const WATER = '#84ABA9';
const WATER_DEEP = '#6C9694';
const WATER_EDGE = '#C6B593';
const LILY = '#7FA36B';
const BRANCH = '#8A7360';
const BLOSSOM = '#E9B7C8';
const BLOSSOM_LIGHT = '#F2D3DD';

const STAMP_LIFE_MS = 18500;
const MAX_STAMPS = 120;
const MAX_TOUCH_RIPPLES = 10;
const STEP_PX = 13;

interface Stamp {
  id: number;
  x: number;
  y: number;
  deg: number;
  born: number;
}
interface TouchRipple {
  id: number;
  x: number;
  y: number;
  born: number;
}
interface Pond {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** Four short parallel furrows — one rake stamp along the stroke. */
const RakeStamp = memo(function RakeStamp({ deg }: { deg: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.6, { duration: 150 }),
      withDelay(8000, withTiming(0, { duration: 10000, easing: Easing.in(Easing.quad) }))
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.stamp, style, { transform: [{ rotate: `${deg}deg` }] }]}>
      <View style={styles.tine} />
      <View style={styles.tine} />
      <View style={styles.tine} />
      <View style={styles.tine} />
    </Animated.View>
  );
});

/** One-shot ring where a finger touched the pond. */
const WaterRipple = memo(function WaterRipple({ size }: { size: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [p]);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * 0.55,
    transform: [{ scale: 0.25 + p.value * 1.1 }],
  }));

  return (
    <Animated.View
      style={[
        styles.waterRing,
        { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2 },
        style,
      ]}
    />
  );
});

/** Ambient ripple that breathes at a fixed spot on the pond. */
const AmbientRipple = memo(function AmbientRipple({ delay, size }: { delay: number; size: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3200, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1
      )
    );
  }, [p, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * 0.35,
    transform: [{ scale: 0.3 + p.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.waterRing,
        { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2 },
        style,
      ]}
    />
  );
});

/** A koi on an endless elliptical swim; heading follows the path tangent. */
const Koi = memo(function Koi({
  pond,
  scale: swim,
  dur,
  phase,
  reverse,
  body,
  patch,
}: {
  pond: Pond;
  scale: number;
  dur: number;
  phase: number;
  reverse: boolean;
  body: string;
  patch: string;
}) {
  const t = useSharedValue(0);
  const wag = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1);
    wag.value = withRepeat(
      withSequence(withTiming(5, { duration: 420 }), withTiming(-5, { duration: 420 })),
      -1,
      true
    );
  }, [t, wag, dur]);

  const rx = pond.rx * swim;
  const ry = pond.ry * swim;

  const style = useAnimatedStyle(() => {
    const dir = reverse ? -1 : 1;
    const a = dir * t.value * 2 * Math.PI + phase;
    const x = pond.cx + Math.cos(a) * rx;
    const y = pond.cy + Math.sin(a) * ry;
    // Tangent of the ellipse — the koi points where it is going.
    const heading = Math.atan2(dir * Math.cos(a) * ry, dir * -Math.sin(a) * rx);
    return {
      transform: [
        { translateX: x - 22 },
        { translateY: y - 10 },
        { rotate: `${(heading * 180) / Math.PI + wag.value}rad`.replace('rad', 'deg') },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.koi, style]}>
      <Svg width={44} height={20} viewBox="0 0 44 20">
        <Path d="M12 10 L2 4 L5.5 10 L2 16 Z" fill={body} opacity={0.9} />
        <Ellipse cx="24" cy="10" rx="14" ry="6.5" fill={body} />
        <Ellipse cx="27" cy="8" rx="5" ry="3.4" fill={patch} />
        <Ellipse cx="18" cy="12" rx="3.6" ry="2.6" fill={patch} opacity={0.85} />
        <Circle cx="33.5" cy="8.6" r="1" fill="#3C352B" />
      </Svg>
    </Animated.View>
  );
});

/** One drifting cherry petal on an endless diagonal loop. */
const Petal = memo(function Petal({ w, h, seed }: { w: number; h: number; seed: number }) {
  const cfg = useMemo(
    () => ({
      x: 20 + seed * (w - 60),
      delay: seed * 6000,
      dur: 11000 + ((seed * 9301) % 1) * 8000,
      sway: 16 + seed * 22,
      size: 8 + seed * 6,
      tilt: seed * 360,
    }),
    [w, seed]
  );
  const y = useSharedValue(-40);
  const x = useSharedValue(0);
  const rot = useSharedValue(cfg.tilt);

  useEffect(() => {
    y.value = withDelay(
      cfg.delay,
      withRepeat(
        withSequence(
          withTiming(h + 50, { duration: cfg.dur, easing: Easing.linear }),
          withTiming(-40, { duration: 0 })
        ),
        -1
      )
    );
    x.value = withRepeat(
      withSequence(
        withTiming(cfg.sway, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-cfg.sway, { duration: 2400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    rot.value = withRepeat(
      withSequence(
        withTiming(cfg.tilt + 50, { duration: 3200 }),
        withTiming(cfg.tilt - 50, { duration: 3200 })
      ),
      -1,
      true
    );
  }, [cfg, h, x, y, rot]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: x.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: cfg.x, top: 0 }, style]}>
      <View
        style={{
          width: cfg.size,
          height: cfg.size * 1.5,
          borderRadius: cfg.size,
          backgroundColor: PETAL_PINK,
        }}
      />
    </Animated.View>
  );
});

const ZenGarden = () => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [touchRipples, setTouchRipples] = useState<TouchRipple[]>([]);
  const idRef = useRef(1);
  const tickRef = useRef(0);
  const last = useSharedValue({ x: 0, y: 0 });

  const pond = useMemo<Pond | null>(() => {
    if (size.w === 0) return null;
    const rx = Math.min(92, size.w * 0.24);
    return { cx: size.w * 0.74, cy: size.h * 0.2, rx, ry: rx * 0.62 };
  }, [size]);
  const pondRef = useRef<Pond | null>(null);
  pondRef.current = pond;

  const inPond = (x: number, y: number) => {
    const p = pondRef.current;
    if (!p) return false;
    const nx = (x - p.cx) / p.rx;
    const ny = (y - p.cy) / p.ry;
    return nx * nx + ny * ny <= 1;
  };

  const spawn = useCallback((x: number, y: number, deg: number) => {
    tickRef.current += 1;
    if (inPond(x, y)) {
      // Water answers differently than sand.
      if (tickRef.current % 3 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      setTouchRipples((prev) => {
        const now = Date.now();
        let next = prev.filter((r) => now - r.born < 1200);
        if (next.length >= MAX_TOUCH_RIPPLES) next = next.slice(next.length - MAX_TOUCH_RIPPLES + 1);
        return [...next, { id: idRef.current++, x, y, born: now }];
      });
      return;
    }
    if (tickRef.current % 5 === 0) Haptics.selectionAsync().catch(() => {});
    setStamps((prev) => {
      const now = Date.now();
      let next = prev.filter((s) => now - s.born < STAMP_LIFE_MS);
      if (next.length >= MAX_STAMPS) next = next.slice(next.length - MAX_STAMPS + 1);
      return [...next, { id: idRef.current++, x, y, deg, born: now }];
    });
  }, []);

  const begin = useCallback(
    (x: number, y: number) => spawn(x, y, (Math.random() - 0.5) * 30),
    [spawn]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          last.value = { x: e.x, y: e.y };
          runOnJS(begin)(e.x, e.y);
        })
        .onUpdate((e) => {
          const dx = e.x - last.value.x;
          const dy = e.y - last.value.y;
          if (dx * dx + dy * dy > STEP_PX * STEP_PX) {
            const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
            last.value = { x: e.x, y: e.y };
            runOnJS(spawn)(e.x, e.y, deg);
          }
        }),
    [begin, spawn, last]
  );

  const rocks = useMemo(
    () =>
      size.w > 0
        ? [
            { cx: size.w * 0.22, cy: size.h * 0.42, rx: 34, ry: 22 },
            { cx: size.w * 0.64, cy: size.h * 0.64, rx: 42, ry: 27 },
            { cx: size.w * 0.34, cy: size.h * 0.82, rx: 20, ry: 13 },
          ]
        : [],
    [size]
  );

  /** Faint pre-raked waves — the garden was tended before you arrived. */
  const baseWaves = useMemo(() => {
    if (size.w === 0) return [];
    const { w, h } = size;
    return [0.5, 0.58, 0.9].map((f) => {
      const y = h * f;
      const q = w / 8;
      return `M0 ${y} Q ${q} ${y - 9}, ${q * 2} ${y} T ${q * 4} ${y} T ${q * 6} ${y} T ${q * 8} ${y}`;
    });
  }, [size]);

  /** Static sand grain, seeded once per layout. */
  const grains = useMemo(() => {
    if (size.w === 0) return [];
    return Array.from({ length: 70 }, (_, i) => ({
      x: ((i * 7919) % 997) / 997 * size.w,
      y: ((i * 104729) % 991) / 991 * size.h,
      r: 0.7 + ((i * 31) % 10) / 12,
    }));
  }, [size]);

  const petalSeeds = useMemo(() => Array.from({ length: 9 }, (_, i) => (i + 0.7) / 9.4), []);

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.root}
        onLayout={(e) =>
          setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {/* Dune shading */}
        <View style={[styles.blob, { top: -120, left: -80, width: 340, height: 340 }]} />
        <View style={[styles.blob, { bottom: -140, right: -60, width: 420, height: 420 }]} />

        {/* Static garden: grain, base waves, pond, rocks, branch */}
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
            {grains.map((g, i) => (
              <Circle key={i} cx={g.x} cy={g.y} r={g.r} fill="rgba(97,83,64,0.09)" />
            ))}
            {baseWaves.map((d, i) => (
              <Path key={i} d={d} stroke={INK} strokeWidth={1.1} opacity={0.12} fill="none" />
            ))}

            {pond && (
              <G>
                {/* Wet sand rim, then water with a deeper heart */}
                <Ellipse cx={pond.cx} cy={pond.cy} rx={pond.rx + 7} ry={pond.ry + 7} fill={WATER_EDGE} />
                <Ellipse cx={pond.cx} cy={pond.cy} rx={pond.rx} ry={pond.ry} fill={WATER} />
                <Ellipse cx={pond.cx + pond.rx * 0.12} cy={pond.cy + pond.ry * 0.16} rx={pond.rx * 0.66} ry={pond.ry * 0.62} fill={WATER_DEEP} />
                {/* Lily pads */}
                <Circle cx={pond.cx - pond.rx * 0.52} cy={pond.cy - pond.ry * 0.34} r={11} fill={LILY} />
                <Path
                  d={`M ${pond.cx - pond.rx * 0.52} ${pond.cy - pond.ry * 0.34} L ${pond.cx - pond.rx * 0.52 + 12} ${pond.cy - pond.ry * 0.34 - 5} L ${pond.cx - pond.rx * 0.52 + 12} ${pond.cy - pond.ry * 0.34 + 3} Z`}
                  fill={WATER}
                />
                <Circle cx={pond.cx + pond.rx * 0.55} cy={pond.cy + pond.ry * 0.42} r={8} fill={LILY} opacity={0.9} />
                {/* Blossom resting on a pad */}
                <Circle cx={pond.cx - pond.rx * 0.52} cy={pond.cy - pond.ry * 0.34} r={3.4} fill={BLOSSOM_LIGHT} />
              </G>
            )}

            {rocks.map((r, i) => (
              <G key={i}>
                <Ellipse cx={r.cx} cy={r.cy} rx={r.rx + 18} ry={(r.rx + 18) * 0.62} stroke={RING} strokeWidth={2} fill="none" />
                <Ellipse cx={r.cx} cy={r.cy} rx={r.rx + 34} ry={(r.rx + 34) * 0.62} stroke={RING} strokeWidth={2} fill="none" />
                <Ellipse cx={r.cx} cy={r.cy + 4} rx={r.rx} ry={r.ry} fill="rgba(60,52,42,0.18)" />
                <Ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill={ROCK} />
                <Ellipse cx={r.cx - r.rx * 0.22} cy={r.cy - r.ry * 0.28} rx={r.rx * 0.62} ry={r.ry * 0.52} fill={ROCK_LIGHT} opacity={0.8} />
              </G>
            ))}

            {/* Blossom branch reaching in from the top-left corner */}
            <G>
              <Path d="M-8 26 C 46 34, 82 58, 138 84" stroke={BRANCH} strokeWidth={5} strokeLinecap="round" fill="none" />
              <Path d="M52 40 C 74 44, 88 54, 104 60" stroke={BRANCH} strokeWidth={3} strokeLinecap="round" fill="none" />
              <Path d="M96 66 C 112 68, 124 76, 132 82" stroke={BRANCH} strokeWidth={2.4} strokeLinecap="round" fill="none" />
              {[
                { x: 104, y: 58, r: 8 },
                { x: 122, y: 74, r: 9 },
                { x: 140, y: 88, r: 7.5 },
                { x: 92, y: 70, r: 6.5 },
                { x: 132, y: 62, r: 6 },
                { x: 152, y: 78, r: 5.5 },
              ].map((b, i) => (
                <G key={i}>
                  <Circle cx={b.x} cy={b.y} r={b.r} fill={i % 2 ? BLOSSOM : BLOSSOM_LIGHT} />
                  <Circle cx={b.x} cy={b.y} r={1.6} fill="#C98FA5" />
                </G>
              ))}
            </G>
          </Svg>
        )}

        {/* Koi — above the static water, below trails */}
        {pond && (
          <>
            <Koi pond={pond} scale={0.55} dur={14000} phase={0} reverse={false} body="#F6F3EC" patch="#E8894A" />
            <Koi pond={pond} scale={0.42} dur={19000} phase={2.6} reverse body="#E8894A" patch="#F6F3EC" />
            <View pointerEvents="none" style={{ position: 'absolute', left: pond.cx - pond.rx * 0.3, top: pond.cy - pond.ry * 0.2 }}>
              <AmbientRipple delay={0} size={46} />
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', left: pond.cx + pond.rx * 0.4, top: pond.cy + pond.ry * 0.35 }}>
              <AmbientRipple delay={1700} size={34} />
            </View>
          </>
        )}

        {/* Touch ripples in the water */}
        {touchRipples.map((r) => (
          <View key={r.id} pointerEvents="none" style={{ position: 'absolute', left: r.x, top: r.y }}>
            <WaterRipple size={54} />
          </View>
        ))}

        {/* Rake trails */}
        {stamps.map((s) => (
          <View key={s.id} pointerEvents="none" style={{ position: 'absolute', left: s.x - 20, top: s.y - 11 }}>
            <RakeStamp deg={s.deg} />
          </View>
        ))}

        {/* Drifting petals */}
        {size.h > 0 && petalSeeds.map((s, i) => <Petal key={i} w={size.w} h={size.h} seed={s} />)}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SAND, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: SAND_SHADE },
  stamp: { width: 40 },
  tine: { width: 40, height: 1.5, borderRadius: 1, backgroundColor: INK, marginVertical: 2 },
  koi: { position: 'absolute', left: 0, top: 0 },
  waterRing: {
    position: 'absolute',
    borderWidth: 1.6,
    borderColor: 'rgba(240,248,246,0.9)',
  },
});

export default ZenGarden;
