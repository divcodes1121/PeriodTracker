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
 * Rain Window — sitting on the warm side of the glass during a storm.
 *
 * Drops slide down with a wobble and a fading tail; blurred street lights
 * glow through; distant lightning blinks on a random schedule with a soft
 * rumble haptic. Dragging a finger wipes condensation — light streaks that
 * mist back over a few seconds.
 */

const NIGHT = ['#1B2430', '#141B26', '#0D1219'] as const;
const DROP_COUNT = 14;
const MAX_WIPES = 60;
const STEP_PX = 18;

interface Wipe {
  id: number;
  x: number;
  y: number;
  born: number;
}

/** One raindrop cycling forever: new x/speed each pass. */
const Drop = memo(function Drop({ index, W, H }: { index: number; W: number; H: number }) {
  const [cycle, setCycle] = useState(0);
  const params = useMemo(() => {
    return {
      x: Math.random() * W,
      size: 3 + Math.random() * 3.5,
      dur: 2600 + Math.random() * 3400,
      delay: cycle === 0 ? Math.random() * 2600 : Math.random() * 900,
      wobble: 3 + Math.random() * 5,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, W]);

  const y = useSharedValue(-30);
  const wob = useSharedValue(0);
  const recycle = useCallback(() => setCycle((c) => c + 1), []);

  useEffect(() => {
    y.value = -30;
    y.value = withDelay(
      params.delay,
      withTiming(H + 30, { duration: params.dur, easing: Easing.in(Easing.quad) }, (f) => {
        if (f) runOnJS(recycle)();
      })
    );
  }, [params, H, y, recycle]);

  useEffect(() => {
    wob.value = withRepeat(
      withSequence(
        withTiming(params.wobble, { duration: 620, easing: Easing.inOut(Easing.quad) }),
        withTiming(-params.wobble, { duration: 620, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [params.wobble, wob]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: wob.value }],
  }));

  const s = params.size;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: params.x, top: 0 }, style]}>
      {/* Tail above the head */}
      <View style={[styles.dropTail, { width: s * 0.45, height: s * 5, marginLeft: s * 0.28 }]} />
      <View style={[styles.dropHead, { width: s, height: s * 1.25, borderRadius: s }]} />
    </Animated.View>
  );
});

/** A wiped streak of condensation that mists back over. */
const WipeMark = memo(function WipeMark() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.11, { duration: 90 }),
      withDelay(3200, withTiming(0, { duration: 4200, easing: Easing.in(Easing.quad) }))
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.wipe, style]} />;
});

const RainWindow = () => {
  const { width: W, height: H } = useWindowDimensions();
  const [wipes, setWipes] = useState<Wipe[]>([]);
  const idRef = useRef(1);
  const tickRef = useRef(0);
  const last = useSharedValue({ x: 0, y: 0 });
  const flash = useSharedValue(0);

  // Lightning on a random 7–15s schedule: double-blink + a soft rumble.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const schedule = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        flash.value = withSequence(
          withTiming(0.16, { duration: 60 }),
          withTiming(0.02, { duration: 90 }),
          withTiming(0.11, { duration: 70 }),
          withTiming(0, { duration: 460, easing: Easing.out(Easing.quad) })
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        schedule();
      }, 7000 + Math.random() * 8000);
    };
    schedule();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [flash]);

  const wipeAt = useCallback((x: number, y: number) => {
    tickRef.current += 1;
    if (tickRef.current % 6 === 0) Haptics.selectionAsync().catch(() => {});
    setWipes((prev) => {
      const now = Date.now();
      let next = prev.filter((m) => now - m.born < 8000);
      if (next.length >= MAX_WIPES) next = next.slice(next.length - MAX_WIPES + 1);
      return [...next, { id: idRef.current++, x, y, born: now }];
    });
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          last.value = { x: e.x, y: e.y };
          runOnJS(wipeAt)(e.x, e.y);
        })
        .onUpdate((e) => {
          const dx = e.x - last.value.x;
          const dy = e.y - last.value.y;
          if (dx * dx + dy * dy > STEP_PX * STEP_PX) {
            last.value = { x: e.x, y: e.y };
            runOnJS(wipeAt)(e.x, e.y);
          }
        }),
    [wipeAt, last]
  );

  /** Static condensation specks, seeded once. */
  const specks = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        x: ((i * 7919) % 997) / 997 * W,
        y: ((i * 104729) % 991) / 991 * H,
        r: 1 + ((i * 31) % 10) / 5,
      })),
    [W, H]
  );

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.root}>
        <LinearGradient colors={NIGHT} style={StyleSheet.absoluteFill} />

        {/* Blurred street lights through the glass */}
        <View style={[styles.glow, { top: H * 0.16, left: W * 0.12, backgroundColor: 'rgba(217,160,92,0.10)' }]} />
        <View style={[styles.glow, { top: H * 0.42, right: -60, backgroundColor: 'rgba(94,140,163,0.10)' }]} />
        <View style={[styles.glowSmall, { top: H * 0.68, left: W * 0.3, backgroundColor: 'rgba(217,124,155,0.08)' }]} />

        {/* Condensation */}
        {specks.map((s, i) => (
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
              backgroundColor: 'rgba(255,255,255,0.10)',
            }}
          />
        ))}

        {/* Wipe streaks */}
        {wipes.map((m) => (
          <View key={m.id} pointerEvents="none" style={{ position: 'absolute', left: m.x - 26, top: m.y - 26 }}>
            <WipeMark />
          </View>
        ))}

        {/* Rain */}
        {Array.from({ length: DROP_COUNT }).map((_, i) => (
          <Drop key={i} index={i} W={W} H={H} />
        ))}

        {/* Lightning */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.lightning, flashStyle]} />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130 },
  glowSmall: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  dropHead: { backgroundColor: 'rgba(205,228,244,0.55)' },
  dropTail: {
    backgroundColor: 'rgba(205,228,244,0.18)',
    borderRadius: 2,
    marginBottom: -2,
  },
  wipe: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF' },
  lightning: { backgroundColor: '#E8F1FF' },
});

export default RainWindow;
