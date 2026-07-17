import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Bubbles — pop them as they rise. The ASMR escape.
 *
 * The water is a place now: god rays slant down from the surface, kelp sways
 * at the seafloor, plankton drifts up. Each bubble has an iridescent radial
 * skin (one of three tints), an arc highlight, and a fizz mote rising inside
 * it. Popping is a small event: squash, double shockwave ring, a mist puff,
 * eight droplets, haptic — then the bubble respawns below the screen. The
 * lifecycle machinery (recycled linear rise + uninterrupted sway) is
 * unchanged.
 */

const DEEP = ['#143241', '#0E1D26', '#0A141B'] as const;
const BUBBLE_COUNT = 9;
const DROP_ANGLES = [15, 60, 105, 150, 195, 240, 285, 330];

/** Iridescent skins — aqua, lilac, pearl. */
const TINTS = [
  { mid: '#96D2FF', rim: 'rgba(196,232,255,0.6)', glow: 'rgba(210,240,255,0.95)' },
  { mid: '#C4B4FF', rim: 'rgba(220,208,255,0.55)', glow: 'rgba(228,218,255,0.95)' },
  { mid: '#FFC4E0', rim: 'rgba(255,216,234,0.5)', glow: 'rgba(255,226,240,0.95)' },
];

const Bubble = memo(function Bubble({ index, W, H }: { index: number; W: number; H: number }) {
  const [cycle, setCycle] = useState(0);
  const popping = useRef(false);
  const tint = TINTS[index % TINTS.length];

  const params = useMemo(() => {
    const size = 44 + Math.random() * 46;
    return {
      size,
      x: 8 + Math.random() * Math.max(W - size - 16, 1),
      dur: 9000 + Math.random() * 8000,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, W]);

  const y = useSharedValue(H + 120);
  const sway = useSharedValue(0);
  const scaleV = useSharedValue(1);
  const burst = useSharedValue(1); // 1 = finished/hidden; 0→1 animates a pop
  const fizz = useSharedValue(0);

  const recycle = useCallback(() => setCycle((c) => c + 1), []);

  useEffect(() => {
    // First cycle staggers bubbles across the screen so it never starts empty.
    const from = cycle === 0 ? H - (index + 0.5) * (H / BUBBLE_COUNT) : H + params.size + 30;
    const to = -params.size - 40;
    y.value = from;
    const dur = params.dur * ((from - to) / (H + params.size + 70));
    y.value = withTiming(to, { duration: dur, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(recycle)();
    });
    return () => cancelAnimation(y);
  }, [cycle, params, H, index, y, recycle]);

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 1700 + index * 260, easing: Easing.inOut(Easing.quad) }),
        withTiming(-12, { duration: 1700 + index * 260, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    fizz.value = withDelay(
      index * 420,
      withRepeat(withTiming(1, { duration: 1500 + index * 180, easing: Easing.out(Easing.quad) }), -1)
    );
  }, [index, sway, fizz]);

  const pop = useCallback(() => {
    if (popping.current) return;
    popping.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    cancelAnimation(y);
    burst.value = 0;
    burst.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
    scaleV.value = withSequence(
      withTiming(1.18, { duration: 80 }),
      withTiming(0.001, { duration: 90 })
    );
    setTimeout(() => {
      scaleV.value = 1;
      popping.current = false;
      recycle();
    }, 470);
  }, [y, burst, scaleV, recycle]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: sway.value }],
  }));
  const skinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleV.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: burst.value >= 1 ? 0 : (1 - burst.value) * 0.55,
    transform: [{ scale: 0.4 + burst.value * 1.5 }],
  }));
  // Second ring trails the first — thinner, wider, later.
  const ring2Style = useAnimatedStyle(() => {
    const q = Math.min(Math.max((burst.value - 0.14) / 0.86, 0), 1);
    return {
      opacity: burst.value >= 1 ? 0 : (1 - q) * 0.35,
      transform: [{ scale: 0.3 + q * 2.1 }],
    };
  });
  const mistStyle = useAnimatedStyle(() => ({
    opacity: burst.value >= 1 ? 0 : (1 - burst.value) * 0.16,
    transform: [{ scale: 0.5 + burst.value * 1.4 }],
  }));
  const fizzStyle = useAnimatedStyle(() => {
    const p = fizz.value;
    return {
      opacity: p < 0.15 ? p * 4 : (1 - p) * 0.7,
      transform: [{ translateY: (0.35 - p * 0.55) * params.size }],
    };
  });

  const s = params.size;
  const r = s / 2 - 1.5;
  const circ = 2 * Math.PI * (r - 2);

  return (
    <Animated.View
      style={[{ position: 'absolute', left: params.x, top: 0, width: s, height: s }, wrapStyle]}
    >
      {/* Shockwave rings + mist */}
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { width: s, height: s, borderRadius: s / 2, borderColor: tint.glow }, ringStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ring2, { width: s, height: s, borderRadius: s / 2, borderColor: tint.rim }, ring2Style]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.mist, { width: s, height: s, borderRadius: s / 2 }, mistStyle]}
      />

      {/* Droplets */}
      {DROP_ANGLES.map((a, i) => (
        <Droplet key={a} angle={a} radius={s * 0.85} burst={burst} cx={s / 2} cy={s / 2} big={i % 2 === 0} color={tint.glow} />
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pop a bubble"
        onPress={pop}
        style={{ width: s, height: s }}
      >
        <Animated.View style={[{ width: s, height: s }, skinStyle]}>
          <Svg width={s} height={s}>
            <Defs>
              {/* Unique per bubble — on web, svg ids share one document. */}
              <RadialGradient id={`skin-${index}`} cx="35%" cy="30%" r="75%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.26" />
                <Stop offset="0.5" stopColor={tint.mid} stopOpacity="0.09" />
                <Stop offset="0.82" stopColor="#FFFFFF" stopOpacity="0.05" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.22" />
              </RadialGradient>
            </Defs>
            <Circle cx={s / 2} cy={s / 2} r={r} fill={`url(#skin-${index})`} />
            <Circle cx={s / 2} cy={s / 2} r={r} stroke={tint.rim} strokeWidth={1.25} fill="none" />
            {/* Arc highlight along the upper-left rim */}
            <Circle
              cx={s / 2}
              cy={s / 2}
              r={r - 2}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={1.4}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circ * 0.16} ${circ}`}
              transform={`rotate(-150 ${s / 2} ${s / 2})`}
            />
            {/* Gloss + glint */}
            <Ellipse
              cx={s * 0.34}
              cy={s * 0.26}
              rx={s * 0.15}
              ry={s * 0.09}
              fill="rgba(255,255,255,0.4)"
              transform={`rotate(-18 ${s * 0.34} ${s * 0.26})`}
            />
            <Circle cx={s * 0.72} cy={s * 0.74} r={2.4} fill="rgba(255,255,255,0.45)" />
          </Svg>
          {/* Fizz mote rising inside the bubble */}
          <Animated.View pointerEvents="none" style={[styles.fizz, { left: s * 0.56, top: s * 0.5 }, fizzStyle]} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

/** One pop droplet; the shared burst progress drives all eight. */
const Droplet = memo(function Droplet({
  angle,
  radius,
  burst,
  cx,
  cy,
  big,
  color,
}: {
  angle: number;
  radius: number;
  burst: SharedValue<number>;
  cx: number;
  cy: number;
  big: boolean;
  color: string;
}) {
  const rad = (angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    const p = burst.value;
    return {
      opacity: p >= 1 ? 0 : 1 - p,
      transform: [
        { translateX: Math.cos(rad) * radius * p },
        { translateY: Math.sin(rad) * radius * p + 26 * p * p },
        { scale: 1 - p * 0.4 },
      ],
    };
  });
  const d = big ? 5 : 3.5;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.droplet,
        { left: cx - d / 2, top: cy - d / 2, width: d, height: d, borderRadius: d / 2, backgroundColor: color },
        style,
      ]}
    />
  );
});

/** A slanted shaft of light from the surface; the middle one breathes. */
const GodRay = memo(function GodRay({
  left,
  width,
  height,
  tilt,
  alpha,
  breathe,
}: {
  left: number;
  width: number;
  height: number;
  tilt: string;
  alpha: number;
  breathe?: boolean;
}) {
  const o = useSharedValue(1);
  useEffect(() => {
    if (breathe) {
      o.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    }
  }, [o, breathe]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: -60, left, width, height, transform: [{ rotate: tilt }] }, style]}
    >
      <LinearGradient
        colors={[`rgba(190,230,250,${alpha})`, 'rgba(190,230,250,0)']}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
});

/** A kelp frond anchored at the seafloor, swaying from its base. */
const Kelp = memo(function Kelp({
  x,
  h,
  lean,
  fill,
  sway,
  dur = 4200,
}: {
  x: number;
  h: number;
  lean: number;
  fill: string;
  sway: number;
  dur?: number;
}) {
  const a = useSharedValue(0);
  useEffect(() => {
    if (sway > 0) {
      a.value = withRepeat(
        withSequence(
          withTiming(sway, { duration: dur, easing: Easing.inOut(Easing.quad) }),
          withTiming(-sway, { duration: dur, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    }
  }, [a, sway, dur]);
  // Pivot at the base: translate down, rotate, translate back.
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: h / 2 }, { rotate: `${a.value}deg` }, { translateY: -h / 2 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, bottom: 0, width: 40, height: h }, style]}>
      <Svg width={40} height={h} viewBox={`0 0 40 ${h}`}>
        <Path
          d={`M20 ${h} Q ${12 - lean} ${h * 0.62}, ${20 + lean} ${h * 0.3} Q ${24 + lean} ${h * 0.16}, ${18 + lean * 1.4} 4 Q ${22 + lean} ${h * 0.4}, ${26} ${h} Z`}
          fill={fill}
        />
      </Svg>
    </Animated.View>
  );
});

/** A speck of plankton drifting slowly to the surface. */
const Plankton = memo(function Plankton({ x, H, dur, delay }: { x: number; H: number; dur: number; delay: number }) {
  const y = useSharedValue(H + 10);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-12, { duration: dur, easing: Easing.linear }),
          withTiming(H + 10, { duration: 0 })
        ),
        -1
      )
    );
  }, [y, H, dur, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: 0 }, style]}>
      <View style={styles.plankton} />
    </Animated.View>
  );
});

const BubblePop = () => {
  const { width: W, height: H } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <LinearGradient colors={DEEP} style={StyleSheet.absoluteFill} />
      <View style={[styles.caustic, { top: -120, left: -100, width: 380, height: 380 }]} />
      <View style={[styles.caustic, { bottom: -160, right: -80, width: 440, height: 440 }]} />

      {/* Light from the surface */}
      <GodRay left={W * 0.08} width={90} height={H * 0.85} tilt="14deg" alpha={0.07} />
      <GodRay left={W * 0.34} width={130} height={H * 0.95} tilt="18deg" alpha={0.09} breathe />
      <GodRay left={W * 0.68} width={80} height={H * 0.7} tilt="22deg" alpha={0.05} />

      {/* Seafloor */}
      <Kelp x={W * 0.06} h={170} lean={6} fill="rgba(22,58,64,0.85)" sway={2.2} />
      <Kelp x={W * 0.14} h={120} lean={-5} fill="rgba(18,48,54,0.9)" sway={0} />
      <Kelp x={W * 0.84} h={150} lean={-7} fill="rgba(22,58,64,0.75)" sway={1.8} dur={5200} />

      {/* Plankton */}
      <Plankton x={W * 0.22} H={H} dur={26000} delay={0} />
      <Plankton x={W * 0.55} H={H} dur={32000} delay={9000} />
      <Plankton x={W * 0.8} H={H} dur={24000} delay={16000} />

      {Array.from({ length: BUBBLE_COUNT }).map((_, i) => (
        <Bubble key={i} index={i} W={W} H={H} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  caustic: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(124,187,215,0.05)' },
  ring: { position: 'absolute', borderWidth: 2 },
  ring2: { position: 'absolute', borderWidth: 1 },
  mist: { position: 'absolute', backgroundColor: 'rgba(220,242,255,0.8)' },
  fizz: {
    position: 'absolute',
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  droplet: { position: 'absolute' },
  plankton: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: 'rgba(200,230,245,0.35)',
  },
});

export default BubblePop;
