import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
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
 * Star Dust — drag a finger to scatter a little universe.
 *
 * Every stroke sheds glowing dust that drifts outward and dies like an ember;
 * every few grains, a four-point sparkle spins up instead. Behind it: nebulae,
 * a fixed starfield with a handful of twinkles, and a shooting star that
 * crosses on its own random schedule.
 */

const SPACE = ['#0B0E2A', '#141033', '#0A0716'] as const;
const DUST_COLORS = ['#F4EFE7', '#CDB6E4', '#E8A9BD', '#A9C6E8', '#FFE7A3'];
const MAX_DUST = 46;
const STEP_PX = 16;

interface Grain {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  sparkle: boolean;
  born: number;
}

/** One mote of dust: drift outward, twinkle, die like an ember. */
const Dust = memo(function Dust({ grain }: { grain: Grain }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) });
  }, [p]);

  const style = useAnimatedStyle(() => {
    const q = p.value;
    return {
      opacity: q < 0.08 ? q * 9 : 1 - q,
      transform: [
        { translateX: grain.vx * q },
        { translateY: grain.vy * q },
        { scale: 1 - q * 0.45 },
        ...(grain.sparkle ? [{ rotate: `${q * 180}deg` }] : []),
      ],
    };
  });

  if (grain.sparkle) {
    // Four-point sparkle: two crossed slivers.
    const s = grain.size * 3.2;
    return (
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: grain.x - s / 2, top: grain.y - s / 2, width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
        <View style={{ position: 'absolute', width: 2, height: s, borderRadius: 1, backgroundColor: grain.color }} />
        <View style={{ position: 'absolute', width: s, height: 2, borderRadius: 1, backgroundColor: grain.color }} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: grain.x - grain.size / 2,
          top: grain.y - grain.size / 2,
          width: grain.size,
          height: grain.size,
          borderRadius: grain.size / 2,
          backgroundColor: grain.color,
        },
        style,
      ]}
    />
  );
});

/** A star that breathes. */
const Twinkle = memo(function Twinkle({ x, y, seed }: { x: number; y: number; seed: number }) {
  const o = useSharedValue(0.2);

  useEffect(() => {
    o.value = withDelay(
      seed * 1800,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1200 + seed * 1400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.15, { duration: 1200 + seed * 1400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [o, seed]);

  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x, top: y, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#F4EFE7' }, style]}
    />
  );
});

/** A streak that crosses the sky, rests a random while, then goes again. */
const ShootingStar = memo(function ShootingStar({ W, H }: { W: number; H: number }) {
  const [cycle, setCycle] = useState(0);
  const params = useMemo(
    () => ({
      x: W * (0.1 + Math.random() * 0.5),
      y: H * (0.05 + Math.random() * 0.25),
      wait: 5000 + Math.random() * 8000,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycle, W, H]
  );
  const p = useSharedValue(0);
  const recycle = useCallback(() => setCycle((c) => c + 1), []);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(
      params.wait,
      withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) }, (f) => {
        if (f) runOnJS(recycle)();
      })
    );
  }, [params, p, recycle]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : Math.sin(p.value * Math.PI),
    transform: [
      { translateX: p.value * 300 },
      { translateY: p.value * 190 },
      { rotate: '32.4deg' },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: params.x, top: params.y }, style]}>
      <View style={styles.meteorTail} />
      <View style={styles.meteorHead} />
    </Animated.View>
  );
});

const StarDust = () => {
  const { width: W, height: H } = useWindowDimensions();
  const [dust, setDust] = useState<Grain[]>([]);
  const idRef = useRef(1);
  const tickRef = useRef(0);
  const last = useSharedValue({ x: 0, y: 0 });

  const scatter = useCallback((x: number, y: number) => {
    tickRef.current += 1;
    if (tickRef.current % 4 === 0) Haptics.selectionAsync().catch(() => {});
    setDust((prev) => {
      const now = Date.now();
      let next = prev.filter((g) => now - g.born < 2400);
      const fresh: Grain[] = Array.from({ length: 2 }, () => {
        const a = Math.random() * Math.PI * 2;
        const d = 40 + Math.random() * 90;
        return {
          id: idRef.current++,
          x: x + (Math.random() - 0.5) * 14,
          y: y + (Math.random() - 0.5) * 14,
          vx: Math.cos(a) * d,
          vy: Math.sin(a) * d - 18,
          size: 4 + Math.random() * 5,
          color: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)],
          sparkle: tickRef.current % 5 === 0 && Math.random() > 0.5,
          born: now,
        };
      });
      const merged = [...next, ...fresh];
      return merged.length > MAX_DUST ? merged.slice(merged.length - MAX_DUST) : merged;
    });
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          last.value = { x: e.x, y: e.y };
          runOnJS(scatter)(e.x, e.y);
        })
        .onUpdate((e) => {
          const dx = e.x - last.value.x;
          const dy = e.y - last.value.y;
          if (dx * dx + dy * dy > STEP_PX * STEP_PX) {
            last.value = { x: e.x, y: e.y };
            runOnJS(scatter)(e.x, e.y);
          }
        }),
    [scatter, last]
  );

  /** Fixed starfield, seeded once per layout. */
  const stars = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        x: ((i * 7919) % 997) / 997 * W,
        y: ((i * 104729) % 991) / 991 * H,
        r: 0.8 + ((i * 31) % 10) / 9,
        o: 0.25 + ((i * 17) % 10) / 22,
      })),
    [W, H]
  );
  const twinkles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        x: ((i * 3571 + 500) % 997) / 997 * W,
        y: ((i * 6959 + 200) % 991) / 991 * H,
        seed: (i + 0.6) / 8.4,
      })),
    [W, H]
  );

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.root}>
        <LinearGradient colors={SPACE} style={StyleSheet.absoluteFill} />

        {/* Nebulae */}
        <View style={[styles.nebula, { top: H * 0.1, left: -80, width: 340, height: 340, backgroundColor: 'rgba(184,154,216,0.10)' }]} />
        <View style={[styles.nebula, { top: H * 0.5, right: -100, width: 380, height: 380, backgroundColor: 'rgba(217,124,155,0.08)' }]} />
        <View style={[styles.nebula, { bottom: -120, left: W * 0.2, width: 300, height: 300, backgroundColor: 'rgba(124,187,215,0.07)' }]} />

        {/* Starfield */}
        {stars.map((s, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.r * 2,
              height: s.r * 2,
              borderRadius: s.r,
              backgroundColor: '#F4EFE7',
              opacity: s.o,
            }}
          />
        ))}
        {twinkles.map((t, i) => (
          <Twinkle key={i} x={t.x} y={t.y} seed={t.seed} />
        ))}

        <ShootingStar W={W} H={H} />

        {/* Your dust */}
        {dust.map((g) => (
          <Dust key={g.id} grain={g} />
        ))}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  nebula: { position: 'absolute', borderRadius: 999 },
  meteorHead: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF6E0' },
  meteorTail: {
    position: 'absolute',
    right: 2,
    top: 1,
    width: 90,
    height: 1.6,
    borderRadius: 1,
    backgroundColor: 'rgba(255,246,224,0.35)',
  },
});

export default StarDust;
