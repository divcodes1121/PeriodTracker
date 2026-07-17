import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Ellipse, G } from 'react-native-svg';
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
 * Zen Garden — rake lines in the sand.
 *
 * Scene palettes are fixed rather than theme-bound: this is a place, not a
 * document surface, so it keeps one atmosphere in both app themes.
 *
 * The stroke leaves "rake stamps": three short parallel furrows oriented along
 * the drag direction, sampled every ~13px. Each stamp fades in fast, rests,
 * then settles away over ~10s — the sand slowly forgets, which is the point.
 * Stamps are capped and age-pruned so a long session can't grow the tree
 * unboundedly.
 */

const SAND = '#EFE7D8';
const SAND_SHADE = 'rgba(203,186,155,0.35)';
const INK = 'rgba(97,83,64,0.6)';
const ROCK = '#6E665B';
const ROCK_LIGHT = '#8A8175';
const RING = 'rgba(97,83,64,0.14)';
const PETAL_PINK = 'rgba(219,148,173,0.6)';

const STAMP_LIFE_MS = 18500;
const MAX_STAMPS = 120;
const STEP_PX = 13;

interface Stamp {
  id: number;
  x: number;
  y: number;
  deg: number;
  born: number;
}

const RakeStamp = memo(function RakeStamp({ deg }: { deg: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.55, { duration: 150 }),
      withDelay(8000, withTiming(0, { duration: 10000, easing: Easing.in(Easing.quad) }))
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.stamp, style, { transform: [{ rotate: `${deg}deg` }] }]}>
      <View style={styles.tine} />
      <View style={styles.tine} />
      <View style={styles.tine} />
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
    transform: [
      { translateY: y.value },
      { translateX: x.value },
      { rotate: `${rot.value}deg` },
    ],
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
  const idRef = useRef(1);
  const tickRef = useRef(0);
  const last = useSharedValue({ x: 0, y: 0 });

  const spawn = useCallback((x: number, y: number, deg: number) => {
    tickRef.current += 1;
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
            { cx: size.w * 0.26, cy: size.h * 0.3, rx: 34, ry: 22 },
            { cx: size.w * 0.72, cy: size.h * 0.58, rx: 44, ry: 28 },
            { cx: size.w * 0.38, cy: size.h * 0.8, rx: 22, ry: 14 },
          ]
        : [],
    [size]
  );

  const petalSeeds = useMemo(() => Array.from({ length: 7 }, (_, i) => (i + 0.7) / 7.4), []);

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.root}
        onLayout={(e) =>
          setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {/* Soft dune shading */}
        <View style={[styles.blob, { top: -120, left: -80, width: 340, height: 340 }]} />
        <View style={[styles.blob, { bottom: -140, right: -60, width: 420, height: 420 }]} />

        {/* Rocks with permanently raked rings */}
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
            {rocks.map((r, i) => (
              <G key={i}>
                <Ellipse cx={r.cx} cy={r.cy} rx={r.rx + 18} ry={(r.rx + 18) * 0.62} stroke={RING} strokeWidth={2} fill="none" />
                <Ellipse cx={r.cx} cy={r.cy} rx={r.rx + 34} ry={(r.rx + 34) * 0.62} stroke={RING} strokeWidth={2} fill="none" />
                <Ellipse cx={r.cx} cy={r.cy + 4} rx={r.rx} ry={r.ry} fill="rgba(60,52,42,0.18)" />
                <Ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill={ROCK} />
                <Ellipse cx={r.cx - r.rx * 0.22} cy={r.cy - r.ry * 0.28} rx={r.rx * 0.62} ry={r.ry * 0.52} fill={ROCK_LIGHT} opacity={0.8} />
              </G>
            ))}
          </Svg>
        )}

        {/* Rake trails */}
        {stamps.map((s) => (
          <View key={s.id} pointerEvents="none" style={{ position: 'absolute', left: s.x - 17, top: s.y - 9 }}>
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
  stamp: { width: 34 },
  tine: { width: 34, height: 1.4, borderRadius: 1, backgroundColor: INK, marginVertical: 2.1 },
});

export default ZenGarden;
