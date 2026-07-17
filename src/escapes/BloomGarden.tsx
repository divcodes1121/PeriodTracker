import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse } from 'react-native-svg';
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
 * Bloom Garden — a dusk field where every touch grows a flower.
 *
 * Flowers spring open where the finger lands and linger, so a few minutes of
 * idle touching literally fills a garden. Old blooms dim rather than vanish;
 * a cap + age prune keeps the node count bounded. Fireflies wander on
 * independent loops to keep the field alive between touches.
 */

const DUSK = ['#2A2138', '#1D192D', '#131120'] as const;
const PETAL_COLORS = ['#E8A9BD', '#CDB6E4', '#F2C9A2', '#F4EFE7', '#A9C6E8'];
const CENTER = '#FFE9BE';
const FIREFLY = '#FFE7A3';

const MAX_FLOWERS = 22;
const FLOWER_LIFE_MS = 46000;
const STEP_PX = 26;

interface Bloom {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  seed: number;
  born: number;
}

const Flower = memo(function Flower({ size, color, seed }: { size: number; color: string; seed: number }) {
  const scale = useSharedValue(0);
  const rot = useSharedValue(seed * 360);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 150, mass: 0.8 });
    rot.value = withRepeat(
      withSequence(
        withTiming(seed * 360 + 6, { duration: 2800 + seed * 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(seed * 360 - 6, { duration: 2800 + seed * 1400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    // The garden remembers, but softly — old blooms recede instead of popping out.
    opacity.value = withDelay(26000, withTiming(0.35, { duration: 16000 }));
  }, [scale, rot, opacity, seed]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <Ellipse
            key={a}
            cx="50"
            cy="29"
            rx="15"
            ry="23"
            transform={`rotate(${a} 50 50)`}
            fill={color}
            opacity={0.88}
          />
        ))}
        <Circle cx="50" cy="50" r="10" fill={CENTER} />
      </Svg>
    </Animated.View>
  );
});

const Firefly = memo(function Firefly({ w, h, seed }: { w: number; h: number; seed: number }) {
  const cfg = useMemo(() => {
    const sx = 20 + seed * (w - 40);
    const sy = 30 + ((seed * 7919) % 1) * (h - 80);
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
        withTiming(0.85, { duration: cfg.pulse, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.15, { duration: cfg.pulse, easing: Easing.inOut(Easing.quad) })
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
      <View style={styles.fireflyHalo}>
        <View style={styles.fireflyCore} />
      </View>
    </Animated.View>
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
          size: 38 + seed * 30,
          color: PETAL_COLORS[Math.floor(seed * PETAL_COLORS.length)],
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

  const fireflySeeds = useMemo(() => Array.from({ length: 9 }, (_, i) => (i + 0.5) / 9.3), []);

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

        {blooms.map((b) => (
          <View
            key={b.id}
            pointerEvents="none"
            style={{ position: 'absolute', left: b.x - b.size / 2, top: b.y - b.size / 2 }}
          >
            <Flower size={b.size} color={b.color} seed={b.seed} />
          </View>
        ))}

        {size.h > 0 && fireflySeeds.map((s, i) => <Firefly key={i} w={size.w} h={size.h} seed={s} />)}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  mist: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(226,170,204,0.06)' },
  fireflyHalo: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,231,163,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireflyCore: { width: 4.5, height: 4.5, borderRadius: 3, backgroundColor: FIREFLY },
});

export default BloomGarden;
