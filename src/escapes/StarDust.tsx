import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeOut,
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
 * Star Dust — drag a finger to scatter a little universe.
 *
 * Every stroke sheds glowing dust that drifts outward and dies like an ember;
 * every few grains a four-point sparkle spins up, and under the fingertip a
 * soft glow head makes the stroke read as a comet. Once in a while a grain
 * *stays*: it settles into the sky as a small permanent star, so a few
 * minutes of wandering leaves your own constellation behind (capped and
 * pruned oldest-first).
 *
 * Behind it: a tilted milky-way band, nebulae, a ringed planet, a fixed
 * starfield with twinkles, and a shooting star on its own random schedule.
 */

const SPACE_BG = ['#0B0E2A', '#141033', '#0A0716'] as const;
const DUST_COLORS = ['#F4EFE7', '#CDB6E4', '#E8A9BD', '#A9C6E8', '#FFE7A3'];
const MAX_DUST = 46;
const MAX_PINNED = 18;
const STEP_PX = 16;

type GrainKind = 'dust' | 'sparkle' | 'glow';

interface Grain {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  kind: GrainKind;
  dur: number;
  born: number;
}

interface Pinned {
  id: number;
  x: number;
  y: number;
  seed: number;
}

/** One mote of dust: drift outward, twinkle, die like an ember. */
const Dust = memo(function Dust({ grain }: { grain: Grain }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: grain.dur, easing: Easing.out(Easing.quad) });
  }, [p, grain.dur]);

  const style = useAnimatedStyle(() => {
    const q = p.value;
    const peak = grain.kind === 'glow' ? 0.3 : 1;
    return {
      opacity: (q < 0.08 ? q * 9 : 1 - q) * peak,
      transform: [
        { translateX: grain.vx * q },
        { translateY: grain.vy * q },
        { scale: 1 - q * 0.45 },
        ...(grain.kind === 'sparkle' ? [{ rotate: `${q * 180}deg` }] : []),
      ],
    };
  });

  if (grain.kind === 'sparkle') {
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

/** A star you left behind — settles in with a spring, then twinkles forever. */
const PinnedStar = memo(function PinnedStar({ seed }: { seed: number }) {
  const scale = useSharedValue(0);
  const tw = useSharedValue(0.55);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 160, mass: 0.7 });
    tw.value = withDelay(
      seed * 1400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900 + seed * 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.4, { duration: 900 + seed * 1100, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [scale, tw, seed]);

  const style = useAnimatedStyle(() => ({
    opacity: tw.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.pinned, style]}>
      <View style={styles.pinnedBarV} />
      <View style={styles.pinnedBarH} />
      <View style={styles.pinnedCore} />
    </Animated.View>
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
      <LinearGradient
        colors={['rgba(255,246,224,0)', 'rgba(255,246,224,0.55)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.meteorTail}
      />
      <View style={styles.meteorHalo}>
        <View style={styles.meteorHead} />
      </View>
    </Animated.View>
  );
});

/** A small ringed planet, hanging low. Its halo breathes. */
const Planet = memo(function Planet({ x, y }: { x: number; y: number }) {
  const halo = useSharedValue(0);
  useEffect(() => {
    halo.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 5200, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [halo]);
  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.06 + halo.value * 0.08 }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 48, top: y - 34 }}>
      <Animated.View style={[styles.planetHalo, haloStyle]} />
      <Svg width={96} height={68} viewBox="0 0 96 68">
        <Defs>
          <RadialGradient id="pg" cx="38%" cy="32%" r="80%">
            <Stop offset="0" stopColor="#8B79C9" />
            <Stop offset="1" stopColor="#463A6E" />
          </RadialGradient>
        </Defs>
        {/* Ring behind */}
        <Ellipse cx={48} cy={34} rx={40} ry={11} stroke="rgba(214,196,255,0.35)" strokeWidth={2.4} fill="none" transform="rotate(-16 48 34)" />
        <Circle cx={48} cy={34} r={17} fill="url(#pg)" />
        {/* Soft terminator + highlight */}
        <Ellipse cx={42} cy={28} rx={8} ry={5.5} fill="rgba(255,255,255,0.14)" />
        {/* Ring front arc */}
        <Ellipse
          cx={48}
          cy={34}
          rx={40}
          ry={11}
          stroke="rgba(226,212,255,0.6)"
          strokeWidth={2.4}
          fill="none"
          strokeDasharray="52 200"
          strokeLinecap="round"
          transform="rotate(-16 48 34)"
        />
      </Svg>
    </View>
  );
});

const StarDust = () => {
  const { width: W, height: H } = useWindowDimensions();
  const [dust, setDust] = useState<Grain[]>([]);
  const [pinned, setPinned] = useState<Pinned[]>([]);
  const idRef = useRef(1);
  const tickRef = useRef(0);
  const last = useSharedValue({ x: 0, y: 0 });

  const scatter = useCallback((x: number, y: number) => {
    tickRef.current += 1;
    const tick = tickRef.current;
    if (tick % 4 === 0) Haptics.selectionAsync().catch(() => {});

    setDust((prev) => {
      const now = Date.now();
      const next = prev.filter((g) => now - g.born < 2400);
      const fresh: Grain[] = Array.from({ length: 2 }, () => {
        const a = Math.random() * Math.PI * 2;
        const d = 40 + Math.random() * 90;
        const sparkle = tick % 5 === 0 && Math.random() > 0.5;
        return {
          id: idRef.current++,
          x: x + (Math.random() - 0.5) * 14,
          y: y + (Math.random() - 0.5) * 14,
          vx: Math.cos(a) * d,
          vy: Math.sin(a) * d - 18,
          size: 4 + Math.random() * 5,
          color: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)],
          kind: sparkle ? 'sparkle' : 'dust',
          dur: 2200,
          born: now,
        };
      });
      // The comet head: a soft, larger glow right under the finger.
      if (tick % 3 === 0) {
        fresh.push({
          id: idRef.current++,
          x,
          y,
          vx: (Math.random() - 0.5) * 16,
          vy: -14,
          size: 22,
          color: '#EEE8FF',
          kind: 'glow',
          dur: 1400,
          born: now,
        });
      }
      const merged = [...next, ...fresh];
      return merged.length > MAX_DUST ? merged.slice(merged.length - MAX_DUST) : merged;
    });

    // Once in a while, a grain settles into the sky for good.
    if (tick % 6 === 0) {
      setPinned((prev) => {
        const next = prev.length >= MAX_PINNED ? prev.slice(prev.length - MAX_PINNED + 1) : prev;
        return [
          ...next,
          {
            id: idRef.current++,
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            seed: Math.random(),
          },
        ];
      });
    }
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

  /** Fixed starfield, seeded once per layout; a few stars run warm. */
  const stars = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        x: ((i * 7919) % 997) / 997 * W,
        y: ((i * 104729) % 991) / 991 * H,
        r: 0.8 + ((i * 31) % 10) / 9,
        o: 0.25 + ((i * 17) % 10) / 22,
        c: i % 4 === 0 ? '#FFEFD6' : '#F4EFE7',
      })),
    [W, H]
  );
  /** Denser micro-stars along the milky-way band (band-local coordinates). */
  const bandStars = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        x: ((i * 4271) % 983) / 983,
        y: 0.18 + (((i * 6089) % 613) / 613) * 0.64,
        r: 0.7 + ((i * 29) % 8) / 9,
        o: 0.2 + ((i * 23) % 10) / 26,
      })),
    []
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

  const bandW = W * 1.7;
  const bandH = 170;

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.root}>
        <LinearGradient colors={SPACE_BG} style={StyleSheet.absoluteFill} />

        {/* Milky-way band, tilted across the sky */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -W * 0.35,
            top: H * 0.26,
            width: bandW,
            height: bandH,
            transform: [{ rotate: '-24deg' }],
          }}
        >
          <LinearGradient
            colors={['rgba(226,222,255,0)', 'rgba(226,222,255,0.07)', 'rgba(226,222,255,0)']}
            style={StyleSheet.absoluteFill}
          />
          {bandStars.map((s, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: s.x * bandW,
                top: s.y * bandH,
                width: s.r * 2,
                height: s.r * 2,
                borderRadius: s.r,
                backgroundColor: '#EDE9FF',
                opacity: s.o,
              }}
            />
          ))}
        </View>

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
              backgroundColor: s.c,
              opacity: s.o,
            }}
          />
        ))}
        {twinkles.map((t, i) => (
          <Twinkle key={i} x={t.x} y={t.y} seed={t.seed} />
        ))}

        <Planet x={W * 0.16} y={H * 0.78} />
        <ShootingStar W={W} H={H} />

        {/* The constellation you leave behind */}
        {pinned.map((p) => (
          <Animated.View
            key={p.id}
            pointerEvents="none"
            exiting={FadeOut.duration(700)}
            style={{ position: 'absolute', left: p.x - 5, top: p.y - 5 }}
          >
            <PinnedStar seed={p.seed} />
          </Animated.View>
        ))}

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
  meteorHalo: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,246,224,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meteorHead: { width: 4.5, height: 4.5, borderRadius: 2.5, backgroundColor: '#FFF6E0' },
  meteorTail: {
    position: 'absolute',
    right: 6,
    top: 5,
    width: 104,
    height: 2,
    borderRadius: 1,
  },
  planetHalo: {
    position: 'absolute',
    left: 14,
    top: 0,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#8B79C9',
  },
  pinned: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedBarV: { position: 'absolute', width: 1.5, height: 10, borderRadius: 1, backgroundColor: '#EFEAFF' },
  pinnedBarH: { position: 'absolute', width: 10, height: 1.5, borderRadius: 1, backgroundColor: '#EFEAFF' },
  pinnedCore: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFFFFF' },
});

export default StarDust;
