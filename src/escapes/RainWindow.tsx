import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Mask,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
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
 * The whole screen is a pane of glass. By DEFAULT it is fogged: a cool frost
 * veil sits over everything so the city outside is only a soft blur. Dragging
 * a finger WIPES the fog away — an SVG mask punches a clear streak through the
 * veil, revealing the crisp, warm city and the rain running down outside —
 * then it slowly mists back over. That reveal is the whole point of the scene.
 *
 * Outside the glass: a two-layer skyline with warm lit windows (some flicker),
 * a tower aviation light, breathing street-lamp bokeh, a car sweeping past, and
 * rain streaking down. Inside: condensation drops that gather and run. Distant
 * lightning blinks on a random schedule with a soft rumble haptic.
 */

const NIGHT = ['#2A3A50', '#1B2838', '#141C28'] as const;
const DROP_COUNT = 22;
const MAX_WIPES = 40;
const STEP_PX = 14;
const WIPE_R = 48;
const SKYLINE_H = 150;

const ACircle = Animated.createAnimatedComponent(Circle);

interface Wipe {
  id: number;
  x: number;
  y: number;
  born: number;
}

/* --------------------------------- Rain ---------------------------------- */

/** One raindrop cycling forever: new x/speed each pass, gradient tail. */
const Drop = memo(function Drop({ index, W, H }: { index: number; W: number; H: number }) {
  const [cycle, setCycle] = useState(0);
  const params = useMemo(() => {
    return {
      x: Math.random() * W,
      size: 3.5 + Math.random() * 3.5,
      dur: 1500 + Math.random() * 2200,
      delay: cycle === 0 ? Math.random() * 2200 : Math.random() * 700,
      wobble: 2 + Math.random() * 4,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, W]);

  const y = useSharedValue(-40);
  const wob = useSharedValue(0);
  const recycle = useCallback(() => setCycle((c) => c + 1), []);

  useEffect(() => {
    y.value = -40;
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
        withTiming(params.wobble, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(-params.wobble, { duration: 600, easing: Easing.inOut(Easing.quad) })
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
      <LinearGradient
        colors={['rgba(214,232,248,0)', 'rgba(214,232,248,0.55)']}
        style={{ width: s * 0.5, height: s * 7, borderRadius: 2, marginLeft: s * 0.25, marginBottom: -2 }}
      />
      <View style={[styles.dropHead, { width: s, height: s * 1.3, borderRadius: s }]} />
    </Animated.View>
  );
});

/**
 * A fat drop of condensation on the INSIDE of the glass: it hangs, gathers
 * weight, then runs down leaving a thin wet trail, and reforms. Always crisp
 * (in front of the fog), so there is visible water even before you wipe.
 */
const Runner = memo(function Runner({ x, top, H, delay }: { x: number; top: number; H: number; delay: number }) {
  const y = useSharedValue(0);
  const trail = useSharedValue(0);
  const travel = H * (0.4 + Math.random() * 0.4);

  useEffect(() => {
    const run = () => {
      'worklet';
      return withSequence(
        withTiming(0, { duration: 2600 + Math.random() * 2600 }),
        withTiming(travel, { duration: 1100, easing: Easing.in(Easing.quad) }),
        withTiming(travel, { duration: 400 })
      );
    };
    y.value = withDelay(delay, withRepeat(run(), -1));
    trail.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 2600 }),
          withTiming(1, { duration: 1100 }),
          withTiming(0, { duration: 400 })
        ),
        -1
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const trailStyle = useAnimatedStyle(() => ({
    height: y.value,
    opacity: trail.value * 0.4,
  }));

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top }}>
      <Animated.View style={[styles.runnerTrail, trailStyle]} />
      <Animated.View style={[styles.runnerHead, headStyle]}>
        <View style={styles.runnerGlint} />
      </Animated.View>
    </View>
  );
});

/* ------------------------------ Fog + wipe -------------------------------- */

/** One cleared patch in the fog: reveal instantly, then slowly mist back. */
const WipeHole = memo(function WipeHole({ x, y }: { x: number; y: number }) {
  const o = useSharedValue(0);

  useEffect(() => {
    o.value = withSequence(
      withTiming(1, { duration: 90 }),
      withDelay(2400, withTiming(0, { duration: 5200, easing: Easing.in(Easing.quad) }))
    );
  }, [o]);

  const props = useAnimatedProps(() => ({ opacity: o.value }));
  return <ACircle cx={x} cy={y} r={WIPE_R} fill="url(#reveal)" animatedProps={props} />;
});

/**
 * A warm sheen that appears only where the glass was just wiped — the wet,
 * clean smear you leave behind. It rides on top of the fog so a fresh wipe
 * reads as "clean glass catching the city's warmth", not a dark hole, and
 * fades as the pane mists back over.
 */
const Sheen = memo(function Sheen({ x, y }: { x: number; y: number }) {
  const o = useSharedValue(0);

  useEffect(() => {
    o.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(2000, withTiming(0, { duration: 5200, easing: Easing.in(Easing.quad) }))
    );
  }, [o]);

  const props = useAnimatedProps(() => ({ opacity: o.value * 0.5 }));
  return <ACircle cx={x} cy={y} r={WIPE_R * 0.96} fill="url(#sheen)" animatedProps={props} />;
});

/**
 * The frosted pane. A full-screen frost gradient masked so every wipe circle
 * cuts a clear hole through it. Black in the mask = fog removed (clear glass);
 * white = fog. The city + rain live behind this, so a wipe reveals them.
 */
const FogGlass = memo(function FogGlass({ W, H, wipes }: { W: number; H: number; wipes: Wipe[] }) {
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id="frost" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#DBE6F2" stopOpacity="0.58" />
          <Stop offset="0.55" stopColor="#CEDAE8" stopOpacity="0.44" />
          <Stop offset="1" stopColor="#C1CEDD" stopOpacity="0.3" />
        </SvgLinearGradient>
        {/* Feathered so wiped edges are soft, not a hard disc. */}
        <RadialGradient id="reveal" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#000" stopOpacity="1" />
          <Stop offset="0.42" stopColor="#000" stopOpacity="0.97" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="sheen" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FBE3C2" stopOpacity="0.5" />
          <Stop offset="0.6" stopColor="#F4D2B0" stopOpacity="0.18" />
          <Stop offset="1" stopColor="#F4D2B0" stopOpacity="0" />
        </RadialGradient>
        <Mask id="fog" maskUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={W} height={H} fill="#fff" />
          {wipes.map((w) => (
            <WipeHole key={w.id} x={w.x} y={w.y} />
          ))}
        </Mask>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#frost)" mask="url(#fog)" />
      {/* Warm wet sheen on the freshly wiped path, over the fog. */}
      {wipes.map((w) => (
        <Sheen key={w.id} x={w.x} y={w.y} />
      ))}
    </Svg>
  );
});

/* ------------------------------ City behind ------------------------------- */

/** A hazy moon hanging behind the storm — a focal point up high to reveal. */
const Moon = memo(function Moon({ x, y }: { x: number; y: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 52, top: y - 52 }}>
      <View style={styles.moonHalo} />
      <View style={styles.moonBody}>
        <View style={[styles.moonCraterA]} />
        <View style={[styles.moonCraterB]} />
      </View>
    </View>
  );
});

/** Street-light bokeh through wet glass; some of them breathe. */
const Bokeh = memo(function Bokeh({
  x,
  y,
  size,
  color,
  core,
  pulse,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  core?: string;
  pulse?: number;
}) {
  const o = useSharedValue(1);
  useEffect(() => {
    if (pulse) {
      o.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: pulse, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: pulse, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    }
  }, [o, pulse]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      {core ? (
        <View style={{ width: size * 0.24, height: size * 0.24, borderRadius: size, backgroundColor: core }} />
      ) : null}
    </Animated.View>
  );
});

/** A lit window that flickers like someone's TV. */
const FlickerWindow = memo(function FlickerWindow({ x, y, delay }: { x: number; y: number; delay: number }) {
  const o = useSharedValue(0.8);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.9, { duration: 300 }),
          withTiming(0.6, { duration: 1400 }),
          withTiming(0.95, { duration: 2600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [o, delay]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[styles.flickerWin, { left: x, top: y }, style]} />;
});

/** Aviation light atop the tallest tower — slow red blink. */
const TowerLight = memo(function TowerLight({ x, y }: { x: number; y: number }) {
  const o = useSharedValue(0.15);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 160 }),
        withTiming(0.15, { duration: 240 }),
        withTiming(0.15, { duration: 2400 })
      ),
      -1
    );
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[styles.towerLight, { left: x, top: y }, style]} />;
});

/** Headlights sweeping along the street below, every so often. */
const CarLight = memo(function CarLight({ W, y }: { W: number; y: number }) {
  const x = useSharedValue(-140);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(-140, { duration: 8200 }),
        withTiming(W + 160, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [x, W]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: y }, style]}>
      <LinearGradient
        colors={['rgba(255,214,150,0)', 'rgba(255,224,170,0.5)', 'rgba(255,240,210,0.9)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: 56, height: 2.6, borderRadius: 2 }}
      />
    </Animated.View>
  );
});

/* --------------------------------- Scene ---------------------------------- */

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
          withTiming(0.18, { duration: 60 }),
          withTiming(0.03, { duration: 90 }),
          withTiming(0.13, { duration: 70 }),
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
    if (tickRef.current % 5 === 0) Haptics.selectionAsync().catch(() => {});
    setWipes((prev) => {
      const now = Date.now();
      let next = prev.filter((m) => now - m.born < 7800);
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

  /** Two skyline layers + lit windows, seeded per width. */
  const skyline = useMemo(() => {
    const far: { x: number; w: number; h: number }[] = [];
    const near: { x: number; w: number; h: number }[] = [];
    const windows: { x: number; y: number; warm: boolean; flicker: boolean }[] = [];
    let x = -8;
    let i = 0;
    while (x < W) {
      const bw = 34 + ((i * 41) % 44);
      const bh = 48 + ((i * 61) % 66);
      far.push({ x, w: bw, h: bh });
      x += bw - 6;
      i += 1;
    }
    x = -6;
    i = 0;
    let tallest = { x: 0, h: 0 };
    while (x < W) {
      const bw = 28 + ((i * 37) % 38);
      const bh = 32 + ((i * 53) % 62);
      near.push({ x, w: bw, h: bh });
      if (bh > tallest.h) tallest = { x: x + bw * 0.5, h: bh };
      if (bh > 44) {
        windows.push({ x: x + bw * 0.26, y: bh - 12, warm: i % 3 !== 1, flicker: i % 7 === 3 });
        if (bw > 40) windows.push({ x: x + bw * 0.62, y: bh - 26, warm: i % 2 === 0, flicker: false });
        if (bh > 70) windows.push({ x: x + bw * 0.42, y: bh - 44, warm: i % 2 === 1, flicker: false });
      }
      x += bw + 3 + ((i * 13) % 7);
      i += 1;
    }
    return { far, near, windows, tallest };
  }, [W]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  /**
   * Street-lamp bokeh scattered across the whole pane, so wherever you wipe
   * you clear the fog onto warm glowing light — not empty dark sky. Seeded off
   * the index so the layout is stable across renders.
   */
  const lamps = useMemo(() => {
    const rnd = (n: number) => {
      const v = Math.sin(n * 99.71) * 43758.5453;
      return v - Math.floor(v);
    };
    // Warm-weighted: mostly sodium street-lamp amber, a little rose and one
    // cool, so the revealed city reads as glowing and inviting.
    const palette = [
      { color: 'rgba(230,168,94,0.24)', core: 'rgba(252,208,150,0.66)' },
      { color: 'rgba(240,200,124,0.22)', core: 'rgba(252,220,154,0.62)' },
      { color: 'rgba(228,150,100,0.2)', core: 'rgba(248,196,150,0.58)' },
      { color: 'rgba(226,132,164,0.16)', core: 'rgba(240,180,200,0.48)' },
      { color: 'rgba(230,176,102,0.22)', core: 'rgba(252,212,152,0.62)' },
      { color: 'rgba(122,160,198,0.16)', core: 'rgba(184,210,238,0.42)' },
    ];
    return Array.from({ length: 15 }, (_, i) => {
      const p = palette[i % palette.length];
      return {
        cx: rnd(i + 1) * W,
        cy: (0.14 + rnd(i + 7) * 0.62) * H,
        size: 46 + rnd(i + 3) * 96,
        pulse: i % 3 === 0 ? 3200 + rnd(i + 5) * 2600 : undefined,
        ...p,
      };
    });
  }, [W, H]);

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.root}>
        <LinearGradient colors={NIGHT} style={StyleSheet.absoluteFill} />

        {/* ---- The world outside the glass (revealed by wiping) ---- */}

        {/* Warm city light-pollution rising from the streets */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(228,150,92,0)', 'rgba(226,146,96,0.10)', 'rgba(224,140,98,0.16)']}
          style={styles.cityGlow}
        />
        <View pointerEvents="none" style={[styles.glowBlob, { left: W * 0.5 - 200, top: H - 300, backgroundColor: 'rgba(232,158,96,0.10)' }]} />

        <Moon x={W * 0.24} y={H * 0.19} />

        {/* Street-lamp bokeh */}
        {lamps.map((l, i) => (
          <Bokeh key={i} x={l.cx - l.size / 2} y={l.cy - l.size / 2} size={l.size} color={l.color} core={l.core} pulse={l.pulse} />
        ))}

        {/* Far skyline */}
        <Svg pointerEvents="none" width={W} height={SKYLINE_H} style={styles.skyline}>
          {skyline.far.map((b, i) => (
            <Rect key={i} x={b.x} y={SKYLINE_H - b.h - 18} width={b.w} height={b.h + 18} fill="rgba(30,42,60,0.7)" />
          ))}
        </Svg>

        {/* A car passes on the street between the layers */}
        <CarLight W={W} y={H - 70} />

        {/* Near skyline + warm windows */}
        <Svg pointerEvents="none" width={W} height={SKYLINE_H} style={styles.skyline}>
          {skyline.near.map((b, i) => (
            <Rect key={i} x={b.x} y={SKYLINE_H - b.h} width={b.w} height={b.h} fill="#090D14" />
          ))}
          <Rect x={skyline.tallest.x - 0.8} y={SKYLINE_H - skyline.tallest.h - 14} width={1.6} height={14} fill="#090D14" />
          {skyline.windows.map((wn, i) =>
            wn.flicker ? null : (
              <Rect
                key={i}
                x={wn.x}
                y={SKYLINE_H - wn.y}
                width={3.4}
                height={5}
                fill={wn.warm ? 'rgba(244,206,128,0.9)' : 'rgba(188,212,236,0.68)'}
              />
            )
          )}
        </Svg>
        {skyline.windows
          .filter((wn) => wn.flicker)
          .map((wn, i) => (
            <FlickerWindow key={i} x={wn.x} y={H - wn.y} delay={i * 1700} />
          ))}
        <TowerLight x={skyline.tallest.x - 2} y={H - skyline.tallest.h - 18} />

        {/* Rain outside, running down the pane */}
        {Array.from({ length: DROP_COUNT }).map((_, i) => (
          <Drop key={i} index={i} W={W} H={H} />
        ))}

        {/* ---- The fogged glass itself (wipe to clear) ---- */}
        <FogGlass W={W} H={H} wipes={wipes} />

        {/* ---- On the inside of the glass (always crisp, above the fog) ---- */}
        <Runner x={W * 0.2} top={H * 0.14} H={H} delay={0} />
        <Runner x={W * 0.52} top={H * 0.1} H={H} delay={2200} />
        <Runner x={W * 0.78} top={H * 0.22} H={H} delay={4200} />
        <Runner x={W * 0.36} top={H * 0.3} H={H} delay={6000} />

        {/* Lightning */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.lightning, flashStyle]} />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  skyline: { position: 'absolute', bottom: 0, left: 0 },
  cityGlow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '48%' },
  glowBlob: { position: 'absolute', width: 400, height: 300, borderRadius: 200 },
  moonHalo: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(228,226,208,0.12)',
  },
  moonBody: {
    position: 'absolute',
    left: 30,
    top: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(238,236,216,0.72)',
    overflow: 'hidden',
  },
  moonCraterA: {
    position: 'absolute',
    left: 10,
    top: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  moonCraterB: {
    position: 'absolute',
    left: 26,
    top: 24,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dropHead: { backgroundColor: 'rgba(214,232,248,0.7)' },
  runnerHead: {
    width: 7,
    height: 9,
    borderRadius: 6,
    backgroundColor: 'rgba(220,238,252,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runnerGlint: {
    width: 2.4,
    height: 2.4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginLeft: -1.5,
    marginTop: -1,
  },
  runnerTrail: {
    position: 'absolute',
    left: 2.4,
    top: 4,
    width: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(214,232,248,0.55)',
  },
  flickerWin: {
    position: 'absolute',
    width: 3.4,
    height: 5,
    backgroundColor: 'rgba(244,206,128,0.9)',
  },
  towerLight: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E85A5A',
  },
  lightning: { backgroundColor: '#E8F1FF' },
});

export default RainWindow;
