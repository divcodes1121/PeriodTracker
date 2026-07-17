import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Bubbles — pop them as they rise. The ASMR escape.
 *
 * Each bubble owns its whole lifecycle: rise on a linear timing (recycled with
 * fresh randomness via a cycle counter, so the pattern never repeats exactly),
 * a sway loop that is never interrupted, and a pop state machine — squash,
 * ring shockwave, six droplets, haptic — that pauses the rise, then respawns
 * the bubble below the screen.
 */

const DEEP = ['#12242E', '#0E1D26', '#0A141B'] as const;
const BUBBLE_COUNT = 9;
const DROP_ANGLES = [15, 75, 135, 195, 255, 315];

const Bubble = memo(function Bubble({ index, W, H }: { index: number; W: number; H: number }) {
  const [cycle, setCycle] = useState(0);
  const popping = useRef(false);

  const params = useMemo(() => {
    const size = 42 + Math.random() * 46;
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
  }, [index, sway]);

  const pop = useCallback(() => {
    if (popping.current) return;
    popping.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    cancelAnimation(y);
    burst.value = 0;
    burst.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) });
    scaleV.value = withSequence(
      withTiming(1.16, { duration: 80 }),
      withTiming(0.001, { duration: 90 })
    );
    setTimeout(() => {
      scaleV.value = 1;
      popping.current = false;
      recycle();
    }, 430);
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

  const s = params.size;

  return (
    <Animated.View
      style={[{ position: 'absolute', left: params.x, top: 0, width: s, height: s }, wrapStyle]}
    >
      {/* Shockwave ring */}
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { width: s, height: s, borderRadius: s / 2 }, ringStyle]}
      />

      {/* Droplets */}
      {DROP_ANGLES.map((a) => (
        <Droplet key={a} angle={a} radius={s * 0.85} burst={burst} cx={s / 2} cy={s / 2} />
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pop a bubble"
        onPress={pop}
        style={{ width: s, height: s }}
      >
        <Animated.View style={[styles.skin, { width: s, height: s, borderRadius: s / 2 }, skinStyle]}>
          <View
            style={[
              styles.gloss,
              { width: s * 0.32, height: s * 0.2, top: s * 0.14, left: s * 0.16, borderRadius: s },
            ]}
          />
          <View style={[styles.glint, { bottom: s * 0.18, right: s * 0.2 }]} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

/** One pop droplet; the shared burst progress drives all six. */
const Droplet = memo(function Droplet({
  angle,
  radius,
  burst,
  cx,
  cy,
}: {
  angle: number;
  radius: number;
  burst: SharedValue<number>;
  cx: number;
  cy: number;
}) {
  const rad = (angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    const p = burst.value;
    return {
      opacity: p >= 1 ? 0 : 1 - p,
      transform: [
        { translateX: Math.cos(rad) * radius * p },
        { translateY: Math.sin(rad) * radius * p + 24 * p * p },
        { scale: 1 - p * 0.4 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.droplet, { left: cx - 2.5, top: cy - 2.5 }, style]}
    />
  );
});

const BubblePop = () => {
  const { width: W, height: H } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <LinearGradient colors={DEEP} style={StyleSheet.absoluteFill} />
      <View style={[styles.caustic, { top: -120, left: -100, width: 380, height: 380 }]} />
      <View style={[styles.caustic, { bottom: -160, right: -80, width: 440, height: 440 }]} />
      {Array.from({ length: BUBBLE_COUNT }).map((_, i) => (
        <Bubble key={i} index={i} W={W} H={H} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  caustic: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(124,187,215,0.05)' },
  skin: {
    borderWidth: 1.25,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(160,220,255,0.08)',
  },
  gloss: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.45)', transform: [{ rotate: '-18deg' }] },
  glint: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(210,240,255,0.9)',
  },
  droplet: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(210,240,255,0.95)',
  },
});

export default BubblePop;
