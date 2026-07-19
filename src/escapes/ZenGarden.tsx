import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Text from '../components/Text';
import Icon, { IconName } from '../components/Icon';
import { MOTION, RADIUS, SPACE } from '../theme/tokens';

/**
 * Zen Garden — the flagship Tiny Escape, a full meditative mini-game.
 *
 * Core loop: drag to rake flowing, calligraphic furrows into the sand (three
 * rake styles); switch to Decorate and tap to place stones, flowers, leaves,
 * shells and crystals, which the rake then interacts with (rings bloom around
 * heavy objects you brush past, flowers shed a petal). A Season control moves
 * the whole garden through spring / summer / autumn / winter, and Smooth
 * wipes the sand clean in one soft breath. No score, no timer, no streaks —
 * per the product's promise, everything is available from the first open.
 *
 * Rendering is SVG + Reanimated like every other scene. The scene palette is
 * fixed (a place, not a document); pools are capped + age-pruned; gestures
 * run as worklets with runOnJS only at spawn points; haptics are throttled.
 */

/* ------------------------------- Ambience --------------------------------- */

/**
 * Audio registry — ships EMPTY on purpose (no bundled sound assets yet).
 * To bring the garden to life, drop files into src/escapes/audio/ and
 * register them here, e.g.:
 *
 *   wind:  require('./audio/zen-wind.mp3'),   // looping bed
 *   water: require('./audio/zen-water.mp3'),  // looping stream
 *   piano: require('./audio/zen-piano.mp3'),  // looping ambience
 *   chime: require('./audio/zen-chime.mp3'),  // one-shot on placement
 *
 * The playback plumbing below is complete: loops start on entry, the dock
 * grows a mute toggle, and decorating strikes the chime.
 */
const ZEN_AUDIO: Partial<Record<'wind' | 'water' | 'piano' | 'chime', number>> = {};
const HAS_AUDIO = Object.values(ZEN_AUDIO).some((v) => v != null);

/** Looping ambience + a chime trigger. Fully wired, silent until assets exist. */
function useAmbience(enabled: boolean) {
  const chimeRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (!enabled || !HAS_AUDIO) return;
    const players: AudioPlayer[] = [];
    (['wind', 'water', 'piano'] as const).forEach((k) => {
      const src = ZEN_AUDIO[k];
      if (src == null) return;
      try {
        const p = createAudioPlayer(src);
        p.loop = true;
        p.volume = k === 'wind' ? 0.45 : 0.3;
        p.play();
        players.push(p);
      } catch {
        // Missing/corrupt asset must never break the garden.
      }
    });
    if (ZEN_AUDIO.chime != null) {
      try {
        const c = createAudioPlayer(ZEN_AUDIO.chime);
        c.volume = 0.5;
        chimeRef.current = c;
        players.push(c);
      } catch {}
    }
    return () => {
      players.forEach((p) => {
        try {
          p.remove();
        } catch {}
      });
      chimeRef.current = null;
    };
  }, [enabled]);

  return useCallback(() => {
    const c = chimeRef.current;
    if (c) {
      c.seekTo(0).catch(() => {});
      c.play();
    }
  }, []);
}

/* -------------------------------- Seasons --------------------------------- */

type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';

interface Season {
  name: string;
  sand: [string, string, string];
  blob: string;
  ink: string;
  lip: string;
  grain: string;
  pond: { edge: string; water: string; deep: string; lily: string };
  wood: string;
  bloomA: string;
  bloomB: string;
  bloomCore: string;
  grass: string;
  drift: { color: string; w: number; h: number; r: number; count: number; dur: number };
}

const SEASONS: Record<SeasonKey, Season> = {
  spring: {
    name: 'Spring',
    sand: ['#F5EEDF', '#EFE7D8', '#E8DEC8'],
    blob: 'rgba(203,186,155,0.32)',
    ink: 'rgba(97,83,64,0.5)',
    lip: 'rgba(255,250,238,0.6)',
    grain: 'rgba(97,83,64,0.09)',
    pond: { edge: '#C6B593', water: '#84ABA9', deep: '#6C9694', lily: '#7FA36B' },
    wood: '#8A7360',
    bloomA: '#E9B7C8',
    bloomB: '#F2D3DD',
    bloomCore: '#C98FA5',
    grass: 'rgba(126,156,116,0.75)',
    drift: { color: 'rgba(219,148,173,0.65)', w: 7, h: 11, r: 7, count: 7, dur: 12000 },
  },
  summer: {
    name: 'Summer',
    sand: ['#F7EFDA', '#F2E7C9', '#EADCB4'],
    blob: 'rgba(214,190,142,0.3)',
    ink: 'rgba(110,90,58,0.5)',
    lip: 'rgba(255,250,232,0.62)',
    grain: 'rgba(110,90,58,0.09)',
    pond: { edge: '#CBB489', water: '#6FA8A4', deep: '#578E8C', lily: '#6E9B5D' },
    wood: '#8A7360',
    bloomA: '#A8CBB0',
    bloomB: '#C4DEC9',
    bloomCore: '#7FA36B',
    grass: 'rgba(110,150,96,0.85)',
    drift: { color: 'rgba(168,203,176,0.6)', w: 5, h: 8, r: 4, count: 5, dur: 14000 },
  },
  autumn: {
    name: 'Autumn',
    sand: ['#F4E7D0', '#EEDCBE', '#E4CCA4'],
    blob: 'rgba(196,158,110,0.3)',
    ink: 'rgba(122,88,52,0.5)',
    lip: 'rgba(255,246,228,0.6)',
    grain: 'rgba(122,88,52,0.1)',
    pond: { edge: '#C4A97E', water: '#7FA2A0', deep: '#678B89', lily: '#96933F' },
    wood: '#7C6350',
    bloomA: '#E0A25E',
    bloomB: '#D97C5B',
    bloomCore: '#A8642A',
    grass: 'rgba(158,132,74,0.8)',
    drift: { color: 'rgba(224,162,94,0.7)', w: 9, h: 7, r: 2.5, count: 8, dur: 10000 },
  },
  winter: {
    name: 'Winter',
    sand: ['#F2F1EA', '#EBEAE2', '#E0E1DA'],
    blob: 'rgba(176,184,182,0.28)',
    ink: 'rgba(88,96,102,0.45)',
    lip: 'rgba(255,255,252,0.7)',
    grain: 'rgba(88,96,102,0.08)',
    pond: { edge: '#BFC5BB', water: '#A9C2C8', deep: '#8FB0B6', lily: '#8FA48A' },
    wood: '#77706A',
    bloomA: '#F4F4F2',
    bloomB: '#E7ECEE',
    bloomCore: '#C9D2D6',
    grass: 'rgba(130,142,138,0.6)',
    drift: { color: 'rgba(250,252,255,0.8)', w: 5, h: 5, r: 3, count: 12, dur: 17000 },
  },
};
const SEASON_ORDER: SeasonKey[] = ['spring', 'summer', 'autumn', 'winter'];

/* ------------------------------ Rake styles ------------------------------- */

interface RakeStyle {
  id: string;
  name: string;
  icon: IconName;
  offsets: number[];
  width: number;
  dash?: string;
}

const RAKES: RakeStyle[] = [
  { id: 'classic', name: 'Classic rake', icon: 'rake', offsets: [-4.5, 0, 4.5], width: 2.2 },
  { id: 'wide', name: 'Wide fan', icon: 'rake', offsets: [-9, -4.5, 0, 4.5, 9], width: 1.7 },
  { id: 'pebble', name: 'Pebble trail', icon: 'rake', offsets: [0], width: 3.6, dash: '0.1 9' },
];

/* ------------------------------ Decor kinds ------------------------------- */

type DecorKind = 'stone' | 'flower' | 'leaf' | 'shell' | 'crystal';
const DECOR_KINDS: { kind: DecorKind; icon: IconName; label: string }[] = [
  { kind: 'stone', icon: 'stone', label: 'stone' },
  { kind: 'flower', icon: 'flower', label: 'flower' },
  { kind: 'leaf', icon: 'leaf', label: 'leaf' },
  { kind: 'shell', icon: 'shell', label: 'shell' },
  { kind: 'crystal', icon: 'crystal', label: 'crystal' },
];

/** Pastels from the brief: lavender, peach, cream, mint, sky. */
const PASTEL = {
  lavender: '#CDB6E4',
  lavenderDeep: '#A88FC9',
  peach: '#F2C9A2',
  peachDeep: '#DFA470',
  cream: '#F7EFDD',
  mint: '#A8CBB0',
  mintDeep: '#7FA98B',
  sky: '#A9C6E8',
  skyDeep: '#7FA3CF',
};

/* -------------------------------- Helpers --------------------------------- */

interface Pt {
  x: number;
  y: number;
}

/** Midpoint-quadratic smoothing — turns raw drag points into a flowing line. */
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y}, ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

/** Average normal of a stroke, for laying parallel tines beside it. */
function strokeNormal(pts: Pt[]): Pt {
  const a = pts[0];
  const b = pts[pts.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

const AG = Animated.createAnimatedComponent(G);

/* ----------------------------- Rake strokes ------------------------------- */

interface Stroke {
  id: number;
  rake: RakeStyle;
  pts: Pt[];
  born: number;
}

/**
 * One flowing rake stroke: a smoothed path repeated along the stroke's normal
 * to form parallel tines, each a dark groove with a light lip below so the
 * furrow reads as carved depth. Committed strokes hold, then breathe away.
 */
const StrokePath = memo(function StrokePath({
  pts,
  rake,
  ink,
  lip,
  settling,
}: {
  pts: Pt[];
  rake: RakeStyle;
  ink: string;
  lip: string;
  settling: boolean;
}) {
  const o = useSharedValue(settling ? 0.9 : 1);

  useEffect(() => {
    if (settling) {
      o.value = withSequence(
        withTiming(0.9, { duration: 200 }),
        withDelay(8000, withTiming(0, { duration: 16000, easing: Easing.in(Easing.quad) }))
      );
    }
  }, [settling, o]);

  const animatedProps = useAnimatedProps(() => ({ opacity: o.value }));

  const d = useMemo(() => smoothPath(pts), [pts]);
  const n = useMemo(() => (pts.length > 1 ? strokeNormal(pts) : { x: 0, y: 1 }), [pts]);
  if (!d) return null;

  return (
    <AG animatedProps={animatedProps}>
      {rake.offsets.map((off) => (
        <G key={off} transform={`translate(${n.x * off} ${n.y * off})`}>
          <Path
            d={d}
            stroke={ink}
            strokeWidth={rake.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={rake.dash}
            fill="none"
          />
          <Path
            d={d}
            stroke={lip}
            strokeWidth={Math.max(rake.width - 1, 0.9)}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={rake.dash}
            fill="none"
            transform="translate(0 1.1)"
          />
        </G>
      ))}
    </AG>
  );
});

/* ------------------------- One-shot particle bits -------------------------- */

/** Grains kicked up at the rake head. */
const SandKick = memo(function SandKick({ nx, ny, tint }: { nx: number; ny: number; tint: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 560, easing: Easing.out(Easing.quad) });
  }, [p]);
  const dots = [
    { dx: nx * 14, dy: ny * 14 - 4, s: 2.6 },
    { dx: -nx * 11, dy: -ny * 11 - 6, s: 2.2 },
    { dx: nx * 5 - ny * 8, dy: ny * 5 + nx * 8 - 3, s: 1.8 },
  ];
  return (
    <>
      {dots.map((dot, i) => (
        <KickDot key={i} {...dot} p={p} tint={tint} />
      ))}
    </>
  );
});

const KickDot = memo(function KickDot({
  dx,
  dy,
  s,
  p,
  tint,
}: {
  dx: number;
  dy: number;
  s: number;
  p: { value: number };
  tint: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * 0.7,
    transform: [{ translateX: dx * p.value }, { translateY: dy * p.value + 6 * p.value * p.value }],
  }));
  return (
    <Animated.View
      style={[{ position: 'absolute', width: s, height: s, borderRadius: s, backgroundColor: tint }, style]}
    />
  );
});

/** Six-point sparkle burst when something is placed. */
const SparkBurst = memo(function SparkBurst({ color }: { color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) });
  }, [p]);
  return (
    <>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <SparkDot key={a} angle={a} p={p} color={color} />
      ))}
    </>
  );
});

const SparkDot = memo(function SparkDot({
  angle,
  p,
  color,
}: {
  angle: number;
  p: { value: number };
  color: string;
}) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * 0.9,
    transform: [
      { translateX: Math.cos(rad) * 30 * p.value },
      { translateY: Math.sin(rad) * 30 * p.value },
      { scale: 1 - p.value * 0.4 },
    ],
  }));
  return (
    <Animated.View
      style={[{ position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: color }, style]}
    />
  );
});

/** Expanding ring — water touches, and sand rings when the rake brushes decor. */
const RingPulse = memo(function RingPulse({ size, color }: { size: number; color: string }) {
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
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2, borderColor: color },
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
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2, borderColor: 'rgba(240,248,246,0.9)' },
        style,
      ]}
    />
  );
});

/** A glint of light, twinkling on its own rhythm. */
const Glint = memo(function Glint({ delay, dim }: { delay: number; dim?: boolean }) {
  const o = useSharedValue(0.1);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(dim ? 0.5 : 0.8, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.08, { duration: 1500, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [o, delay, dim]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.glint, style]} />;
});

/* ------------------------------ Ambient life ------------------------------ */

/** A koi on an endless elliptical swim; heading follows the path tangent. */
interface Pond {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

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
    const heading = Math.atan2(dir * Math.cos(a) * ry, dir * -Math.sin(a) * rx);
    return {
      transform: [
        { translateX: x - 22 },
        { translateY: y - 10 },
        { rotate: `${(heading * 180) / Math.PI + wag.value}deg` },
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

/** A dragonfly hovering near the pond — lazy loops, wings a fast flicker. */
const Dragonfly = memo(function Dragonfly({ cx, cy }: { cx: number; cy: number }) {
  const t = useSharedValue(0);
  const flick = useSharedValue(0.4);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.quad) }), -1, true);
    flick.value = withRepeat(withTiming(0.95, { duration: 90 }), -1, true);
  }, [t, flick]);

  const body = useAnimatedStyle(() => {
    const a = t.value * Math.PI * 2;
    return {
      transform: [
        { translateX: cx + Math.sin(a) * 30 },
        { translateY: cy + Math.sin(a * 2) * 14 },
        { rotate: `${Math.cos(a) * 12}deg` },
      ],
    };
  });
  const wings = useAnimatedStyle(() => ({ opacity: flick.value }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -14, top: -8 }, body]}>
      <Animated.View style={wings}>
        <Svg width={28} height={16} viewBox="0 0 28 16">
          <Ellipse cx={10} cy={5} rx={7} ry={2.6} fill="rgba(255,255,255,0.6)" transform="rotate(-24 10 5)" />
          <Ellipse cx={18} cy={5} rx={7} ry={2.6} fill="rgba(255,255,255,0.6)" transform="rotate(24 18 5)" />
        </Svg>
      </Animated.View>
      <View style={styles.dfBody} />
      <View style={styles.dfHead} />
    </Animated.View>
  );
});

/** A butterfly that crosses the garden every so often, wings flapping. */
const Butterfly = memo(function Butterfly({ W, H, first }: { W: number; H: number; first: number }) {
  const [cycle, setCycle] = useState(0);
  const params = useMemo(
    () => ({
      y0: H * (0.1 + Math.random() * 0.34),
      amp: 26 + Math.random() * 34,
      dur: 6800 + Math.random() * 2600,
      wait: cycle === 0 ? first : 12000 + Math.random() * 14000,
      ltr: Math.random() > 0.4,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycle, H]
  );
  const p = useSharedValue(0);
  const flap = useSharedValue(0);
  const recycle = useCallback(() => setCycle((c) => c + 1), []);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(
      params.wait,
      withTiming(1, { duration: params.dur, easing: Easing.inOut(Easing.quad) }, (f) => {
        if (f) runOnJS(recycle)();
      })
    );
  }, [params, p, recycle]);

  useEffect(() => {
    flap.value = withRepeat(withTiming(1, { duration: 150, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [flap]);

  const style = useAnimatedStyle(() => {
    const q = p.value;
    const x = params.ltr ? -50 + q * (W + 100) : W + 50 - q * (W + 100);
    return {
      opacity: q === 0 ? 0 : Math.min(1, Math.sin(q * Math.PI) * 3),
      transform: [
        { translateX: x },
        { translateY: params.y0 + Math.sin(q * Math.PI * 3) * params.amp },
        { scaleX: params.ltr ? 1 : -1 },
        { rotate: `${Math.cos(q * Math.PI * 3) * 10}deg` },
      ],
    };
  });
  const wingL = useAnimatedStyle(() => ({ transform: [{ scaleX: 0.4 + flap.value * 0.6 }] }));
  const wingR = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 - flap.value * 0.6 }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <View style={{ width: 22, height: 16 }}>
        <Animated.View style={[styles.wing, { left: 0, backgroundColor: PASTEL.lavender }, wingL]} />
        <Animated.View style={[styles.wing, { left: 11, backgroundColor: PASTEL.peach }, wingR]} />
        <View style={styles.bfBody} />
      </View>
    </Animated.View>
  );
});

/** A tuft of grass that leans with the wind. */
const GrassTuft = memo(function GrassTuft({
  x,
  flip,
  color,
  delay,
}: {
  x: number;
  flip: boolean;
  color: string;
  delay: number;
}) {
  const a = useSharedValue(0);
  useEffect(() => {
    a.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(2.2, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
          withTiming(-1.6, { duration: 2600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [a, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: 23 }, { rotate: `${a.value}deg` }, { translateY: -23 }, { scaleX: flip ? -1 : 1 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, bottom: 0, width: 54, height: 46 }, style]}>
      <Svg width={54} height={46} viewBox="0 0 54 46">
        <Path d="M8 46 Q6 30 12 18" stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <Path d="M16 46 Q17 26 12 10" stroke={color} strokeWidth={2.8} strokeLinecap="round" fill="none" />
        <Path d="M24 46 Q26 28 33 20" stroke={color} strokeWidth={2.2} strokeLinecap="round" fill="none" />
        <Path d="M32 46 Q31 32 26 26" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
        <Path d="M40 46 Q42 34 47 30" stroke={color} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
});

/** Seasonal drift — petals, leaf flecks, or snow — falling forever. */
const Drift = memo(function Drift({
  w,
  h,
  seed,
  cfg,
}: {
  w: number;
  h: number;
  seed: number;
  cfg: Season['drift'];
}) {
  // Decorrelate horizontal position from launch delay, or the particles fall
  // in one tidy diagonal line — nature doesn't queue.
  const delaySeed = ((seed * 9301 + 0.17) % 1);
  const y = useSharedValue(-30);
  const x = useSharedValue(0);
  const rot = useSharedValue(seed * 360);
  useEffect(() => {
    y.value = withDelay(
      delaySeed * 9000,
      withRepeat(
        withSequence(
          withTiming(h + 40, { duration: cfg.dur + ((seed * 9301) % 1) * 8000, easing: Easing.linear }),
          withTiming(-30, { duration: 0 })
        ),
        -1
      )
    );
    x.value = withRepeat(
      withSequence(
        withTiming(14 + seed * 22, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-(14 + seed * 22), { duration: 2400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    rot.value = withRepeat(
      withSequence(withTiming(seed * 360 + 50, { duration: 3200 }), withTiming(seed * 360 - 50, { duration: 3200 })),
      -1,
      true
    );
  }, [y, x, rot, h, seed, delaySeed, cfg.dur]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: x.value }, { rotate: `${rot.value}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 16 + seed * (w - 40), top: 0 }, style]}>
      <View style={{ width: cfg.w, height: cfg.h, borderRadius: cfg.r, backgroundColor: cfg.color }} />
    </Animated.View>
  );
});

/* --------------------------------- Decor ---------------------------------- */

interface DecorItem {
  id: number;
  kind: DecorKind;
  x: number;
  y: number;
  seed: number;
  floating: boolean;
}

/** Hand-drawn glyph for each placeable object. */
const DecorGlyph = memo(function DecorGlyph({ kind, seed, size }: { kind: DecorKind; seed: number; size: number }) {
  const s = size;
  switch (kind) {
    case 'stone':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Ellipse cx={20} cy={24} rx={14} ry={9.5} fill="rgba(60,52,42,0.16)" />
          <Ellipse cx={20} cy={21} rx={14} ry={9.5} fill="#8A8175" />
          <Ellipse cx={16.5} cy={18} rx={8} ry={5} fill="#A29A8C" opacity={0.85} />
          <Circle cx={25} cy={19} r={1.4} fill="rgba(244,240,228,0.5)" />
        </Svg>
      );
    case 'flower': {
      const petal = seed > 0.5 ? PASTEL.lavender : '#EFB7C8';
      const heart = seed > 0.5 ? PASTEL.lavenderDeep : '#D48CA4';
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <Ellipse key={a} cx={20} cy={12.5} rx={5.4} ry={8} transform={`rotate(${a} 20 20)`} fill={petal} opacity={0.95} />
          ))}
          <Circle cx={20} cy={20} r={4.2} fill="#FFE9BE" />
          <Circle cx={20} cy={20} r={1.6} fill={heart} />
        </Svg>
      );
    }
    case 'leaf':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Path d="M20 4 C31 10 33 24 20 36 C7 24 9 10 20 4 Z" fill={PASTEL.mint} />
          <Path d="M20 8 V32 M20 14 L26 11 M20 14 L14 11 M20 22 L27 18 M20 22 L13 18" stroke={PASTEL.mintDeep} strokeWidth={1.4} strokeLinecap="round" fill="none" />
        </Svg>
      );
    case 'shell':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Path d="M20 34 L8.5 22 A11.5 11.5 0 1 1 31.5 22 Z" fill={PASTEL.peach} />
          <Path d="M20 34 V10.5 M13.5 27 L16 12 M26.5 27 L24 12" stroke={PASTEL.peachDeep} strokeWidth={1.5} strokeLinecap="round" fill="none" />
          <Circle cx={20} cy={34} r={2} fill={PASTEL.peachDeep} />
        </Svg>
      );
    case 'crystal':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Path d="M20 4 L30 16 L25 35 L15 35 L10 16 Z" fill={PASTEL.sky} opacity={0.95} />
          <Path d="M20 4 L15 35 M20 4 L10 16 M20 4 L30 16" stroke="rgba(255,255,255,0.65)" strokeWidth={1.2} fill="none" />
          <Path d="M10 16 L15 35 M30 16 L25 35" stroke={PASTEL.skyDeep} strokeWidth={1.2} fill="none" />
        </Svg>
      );
  }
});

/**
 * A placed object: springs into the garden, then idles in character — flowers
 * sway, leaves rock, crystals glow, floaters bob on the pond. Heavy objects
 * carry raked rings, like the boulders.
 */
const PlacedDecor = memo(function PlacedDecor({ item, ink }: { item: DecorItem; ink: string }) {
  const scale = useSharedValue(0);
  const idle = useSharedValue(0);
  const size = 30 + item.seed * 14;

  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 170, mass: 0.7 });
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200 + item.seed * 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2200 + item.seed * 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [scale, idle, item.seed]);

  const style = useAnimatedStyle(() => {
    const wob = idle.value;
    const sway =
      item.kind === 'flower' ? (wob - 0.5) * 9 : item.kind === 'leaf' ? (wob - 0.5) * 14 : 0;
    const bob = item.floating ? (wob - 0.5) * 5 : 0;
    return {
      transform: [{ translateY: bob }, { scale: scale.value }, { rotate: `${sway}deg` }],
    };
  });
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.15 + idle.value * 0.25 }));

  const ringed = !item.floating && (item.kind === 'stone' || item.kind === 'crystal');

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: item.x - size / 2, top: item.y - size / 2 }}>
      {ringed && (
        <>
          <View style={[styles.sandRing, { borderColor: ink, width: size + 22, height: (size + 22) * 0.72, left: -11, top: size * 0.14 - 8 + 4 }]} />
          <View style={[styles.sandRing, { borderColor: ink, width: size + 40, height: (size + 40) * 0.72, left: -20, top: size * 0.14 - 14 + 4, opacity: 0.5 }]} />
        </>
      )}
      {item.kind === 'crystal' && (
        <Animated.View
          style={[
            { position: 'absolute', left: -size * 0.25, top: -size * 0.25, width: size * 1.5, height: size * 1.5, borderRadius: size, backgroundColor: PASTEL.sky },
            glowStyle,
          ]}
        />
      )}
      <Animated.View style={style}>
        <DecorGlyph kind={item.kind} seed={item.seed} size={size} />
      </Animated.View>
    </View>
  );
});

/* ------------------------------ Glass dock UI ------------------------------ */

const DockChip = memo(function DockChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.1 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPressIn={() => (press.value = withSpring(1, MOTION.springSnap))}
      onPressOut={() => (press.value = withSpring(0, MOTION.spring))}
      onPress={onPress}
      hitSlop={4}
    >
      <Animated.View style={[styles.chip, active && styles.chipActive, style]}>
        <Icon name={icon} size={19} color={active ? '#5D4B36' : 'rgba(93,75,54,0.55)'} />
      </Animated.View>
    </Pressable>
  );
});

/* --------------------------------- Scene ----------------------------------- */

interface Transient {
  id: number;
  x: number;
  y: number;
  kind: 'ripple' | 'brush' | 'kick' | 'spark';
  born: number;
  color?: string;
  nx?: number;
  ny?: number;
}

const STEP_PX = 11;
const MAX_STROKES = 12;
const STROKE_LIFE = 26000;
const MAX_POINTS = 90;
const MAX_DECOR = 24;
const MAX_TRANSIENT = 26;

const ZenGarden = () => {
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ w: 0, h: 0 });

  const [seasonKey, setSeasonKey] = useState<SeasonKey>('spring');
  const season = SEASONS[seasonKey];

  const [rakeIdx, setRakeIdx] = useState(0);
  const [mode, setMode] = useState<'rake' | 'decorate'>('rake');
  const [decorKind, setDecorKind] = useState<DecorKind>('flower');
  const [soundOn, setSoundOn] = useState(true);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [activeTick, setActiveTick] = useState(0);
  const [decor, setDecor] = useState<DecorItem[]>([]);
  const [fx, setFx] = useState<Transient[]>([]);

  const activePts = useRef<Pt[]>([]);
  const idRef = useRef(1);
  const tickRef = useRef(0);
  const brushMemo = useRef<Map<number, number>>(new Map());
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const rakeRef = useRef(RAKES[0]);
  rakeRef.current = RAKES[rakeIdx];
  const decorRef = useRef<DecorItem[]>([]);
  decorRef.current = decor;
  const kindRef = useRef(decorKind);
  kindRef.current = decorKind;

  const last = useSharedValue({ x: 0, y: 0 });
  const clearVeil = useSharedValue(0);
  const chime = useAmbience(soundOn);

  const pond = useMemo<Pond | null>(() => {
    if (size.w === 0) return null;
    const rx = Math.min(92, size.w * 0.24);
    return { cx: size.w * 0.74, cy: size.h * 0.2, rx, ry: rx * 0.62 };
  }, [size]);
  const pondRef = useRef<Pond | null>(null);
  pondRef.current = pond;

  const dockGuard = insets.bottom + 108;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const inPond = (x: number, y: number) => {
    const p = pondRef.current;
    if (!p) return false;
    const nx = (x - p.cx) / p.rx;
    const ny = (y - p.cy) / p.ry;
    return nx * nx + ny * ny <= 1;
  };
  const inDock = (y: number) => y > sizeRef.current.h - dockGuard;

  const pushFx = useCallback((t: Omit<Transient, 'id' | 'born'>) => {
    setFx((prev) => {
      const now = Date.now();
      let next = prev.filter((f) => now - f.born < 1400);
      if (next.length >= MAX_TRANSIENT) next = next.slice(next.length - MAX_TRANSIENT + 1);
      return [...next, { ...t, id: idRef.current++, born: now }];
    });
  }, []);

  const say = useCallback((msg: string) => {
    setToast({ id: Date.now(), msg });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1300);
    return () => clearTimeout(t);
  }, [toast]);

  /** Commit the active stroke into the settling pool. */
  const commit = useCallback(() => {
    const pts = activePts.current;
    activePts.current = [];
    setActiveTick((t) => t + 1);
    if (pts.length < 2) return;
    setStrokes((prev) => {
      const now = Date.now();
      let next = prev.filter((s) => now - s.born < STROKE_LIFE);
      if (next.length >= MAX_STROKES) next = next.slice(next.length - MAX_STROKES + 1);
      return [...next, { id: idRef.current++, rake: rakeRef.current, pts, born: now }];
    });
  }, []);

  /** Place a decoration (Decorate mode tap). */
  const place = useCallback(
    (x: number, y: number) => {
      const kind = kindRef.current;
      const floating = inPond(x, y);
      if (floating && (kind === 'stone' || kind === 'crystal')) {
        // Heavy things sink — answer with water, not clutter.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        pushFx({ x, y, kind: 'ripple' });
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      chime();
      pushFx({ x, y, kind: 'spark', color: floating ? 'rgba(240,248,246,0.95)' : PASTEL.cream });
      if (floating) pushFx({ x, y, kind: 'ripple' });
      setDecor((prev) => {
        let next = prev;
        if (next.length >= MAX_DECOR) next = next.slice(next.length - MAX_DECOR + 1);
        return [...next, { id: idRef.current++, kind, x, y, seed: Math.random(), floating }];
      });
    },
    [pushFx, chime]
  );

  const begin = useCallback(
    (x: number, y: number) => {
      if (inDock(y)) return;
      if (modeRef.current === 'decorate') {
        place(x, y);
        return;
      }
      if (inPond(x, y)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        pushFx({ x, y, kind: 'ripple' });
        return;
      }
      activePts.current = [{ x, y }];
      setActiveTick((t) => t + 1);
    },
    [place, pushFx]
  );

  const step = useCallback(
    (x: number, y: number) => {
      if (modeRef.current === 'decorate' || inDock(y)) return;
      tickRef.current += 1;

      if (inPond(x, y)) {
        // Water answers differently than sand — and the rake lifts out.
        if (tickRef.current % 3 === 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          pushFx({ x, y, kind: 'ripple' });
        }
        if (activePts.current.length > 1) commit();
        else activePts.current = [];
        return;
      }

      if (tickRef.current % 5 === 0) Haptics.selectionAsync().catch(() => {});

      const pts = activePts.current;
      if (pts.length === 0) {
        activePts.current = [{ x, y }];
      } else {
        pts.push({ x, y });
        if (pts.length > MAX_POINTS) {
          commit();
          activePts.current = [{ x, y }];
        }
      }
      setActiveTick((t) => t + 1);

      // Sand sprays off the rake head.
      if (tickRef.current % 3 === 0) {
        const prev = pts[pts.length - 2] ?? { x: x - 1, y };
        const dx = x - prev.x;
        const dy = y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        pushFx({ x, y, kind: 'kick', nx: -dy / len, ny: dx / len });
      }

      // Brushing past decor: heavy pieces ring, flowers shed a petal.
      const now = Date.now();
      for (const item of decorRef.current) {
        if (item.floating) continue;
        const d2 = (item.x - x) ** 2 + (item.y - y) ** 2;
        if (d2 > 38 * 38) continue;
        const lastHit = brushMemo.current.get(item.id) ?? 0;
        if (now - lastHit < 1600) continue;
        brushMemo.current.set(item.id, now);
        if (item.kind === 'flower') {
          pushFx({ x: item.x, y: item.y, kind: 'spark', color: 'rgba(219,148,173,0.9)' });
        } else {
          pushFx({ x: item.x, y: item.y, kind: 'brush' });
        }
      }
    },
    [commit, pushFx]
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
            last.value = { x: e.x, y: e.y };
            runOnJS(step)(e.x, e.y);
          }
        })
        .onFinalize(() => {
          runOnJS(commit)();
        }),
    [begin, step, commit, last]
  );

  /** Smooth the sand: one soft breath of light, and the garden is new. */
  const smooth = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    clearVeil.value = withTiming(0.95, { duration: 420, easing: Easing.in(Easing.quad) });
    setTimeout(() => {
      activePts.current = [];
      setStrokes([]);
      setDecor([]);
      setFx([]);
      brushMemo.current.clear();
      clearVeil.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) });
    }, 430);
    say('Sand smoothed');
  }, [clearVeil, say]);

  const cycleRake = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setMode('rake');
    setRakeIdx((i) => {
      const n = (i + 1) % RAKES.length;
      say(RAKES[n].name);
      return n;
    });
  }, [say]);

  const cycleSeason = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setSeasonKey((k) => {
      const n = SEASON_ORDER[(SEASON_ORDER.indexOf(k) + 1) % SEASON_ORDER.length];
      say(SEASONS[n].name);
      return n;
    });
  }, [say]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: clearVeil.value }));

  /* ----- static geometry (per layout + season) ----- */

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

  const baseWaves = useMemo(() => {
    if (size.w === 0) return [];
    const { w, h } = size;
    return [0.5, 0.58, 0.9].map((f) => {
      const y = h * f;
      const q = w / 8;
      return `M0 ${y} Q ${q} ${y - 9}, ${q * 2} ${y} T ${q * 4} ${y} T ${q * 6} ${y} T ${q * 8} ${y}`;
    });
  }, [size]);

  const grains = useMemo(() => {
    if (size.w === 0) return [];
    return Array.from({ length: 70 }, (_, i) => ({
      x: (((i * 7919) % 997) / 997) * size.w,
      y: (((i * 104729) % 991) / 991) * size.h,
      r: 0.7 + ((i * 31) % 10) / 12,
    }));
  }, [size]);

  const driftSeeds = useMemo(
    () => Array.from({ length: season.drift.count }, (_, i) => (i + 0.7) / (season.drift.count + 0.4)),
    [season.drift.count]
  );

  const activeRake = RAKES[rakeIdx];
  const showWildlife = seasonKey !== 'winter';

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.root}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {/* Sand, lit from above — crossfades between seasons */}
        <Animated.View key={seasonKey} entering={FadeIn.duration(650)} style={StyleSheet.absoluteFill}>
          <LinearGradient colors={season.sand} style={StyleSheet.absoluteFill} />
          <View style={[styles.blob, { backgroundColor: season.blob, top: -120, left: -80, width: 340, height: 340 }]} />
          <View style={[styles.blob, { backgroundColor: season.blob, bottom: -140, right: -60, width: 420, height: 420 }]} />
        </Animated.View>
        <View style={styles.sunlight} />

        {/* Static garden: grain, base waves, pond, rocks, stones, branch */}
        {size.w > 0 && (
          <Animated.View key={`static-${seasonKey}`} entering={FadeIn.duration(650)} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
              {grains.map((g, i) => (
                <Circle key={i} cx={g.x} cy={g.y} r={g.r} fill={season.grain} />
              ))}
              {baseWaves.map((d, i) => (
                <Path key={i} d={d} stroke={season.ink} strokeWidth={1.1} opacity={0.24} fill="none" />
              ))}

              {pond && (
                <G>
                  <Ellipse cx={pond.cx} cy={pond.cy} rx={pond.rx + 7} ry={pond.ry + 7} fill={season.pond.edge} />
                  <Ellipse cx={pond.cx} cy={pond.cy} rx={pond.rx} ry={pond.ry} fill={season.pond.water} />
                  <Ellipse cx={pond.cx + pond.rx * 0.12} cy={pond.cy + pond.ry * 0.16} rx={pond.rx * 0.66} ry={pond.ry * 0.62} fill={season.pond.deep} />
                  <Circle cx={pond.cx - pond.rx * 0.52} cy={pond.cy - pond.ry * 0.34} r={11} fill={season.pond.lily} />
                  <Path
                    d={`M ${pond.cx - pond.rx * 0.52} ${pond.cy - pond.ry * 0.34} L ${pond.cx - pond.rx * 0.52 + 12} ${pond.cy - pond.ry * 0.34 - 5} L ${pond.cx - pond.rx * 0.52 + 12} ${pond.cy - pond.ry * 0.34 + 3} Z`}
                    fill={season.pond.water}
                  />
                  <Circle cx={pond.cx + pond.rx * 0.55} cy={pond.cy + pond.ry * 0.42} r={8} fill={season.pond.lily} opacity={0.9} />
                  <Circle cx={pond.cx - pond.rx * 0.52} cy={pond.cy - pond.ry * 0.34} r={3.4} fill={season.bloomB} />
                </G>
              )}

              {rocks.map((r, i) => (
                <G key={i}>
                  <Ellipse cx={r.cx} cy={r.cy} rx={r.rx + 18} ry={(r.rx + 18) * 0.62} stroke={season.ink} strokeWidth={2} opacity={0.28} fill="none" />
                  <Ellipse cx={r.cx} cy={r.cy} rx={r.rx + 34} ry={(r.rx + 34) * 0.62} stroke={season.ink} strokeWidth={2} opacity={0.18} fill="none" />
                  <Ellipse cx={r.cx} cy={r.cy + 4} rx={r.rx} ry={r.ry} fill="rgba(60,52,42,0.18)" />
                  <Ellipse cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill="#6E665B" />
                  <Ellipse cx={r.cx - r.rx * 0.22} cy={r.cy - r.ry * 0.28} rx={r.rx * 0.62} ry={r.ry * 0.52} fill="#8A8175" opacity={0.8} />
                  {i !== 1 && seasonKey !== 'winter' && (
                    <Ellipse cx={r.cx - r.rx * 0.4} cy={r.cy + r.ry * 0.4} rx={r.rx * 0.42} ry={r.ry * 0.36} fill="#8CA06B" opacity={0.45} />
                  )}
                  {seasonKey === 'winter' && (
                    <Ellipse cx={r.cx} cy={r.cy - r.ry * 0.55} rx={r.rx * 0.7} ry={r.ry * 0.3} fill="rgba(250,252,255,0.85)" />
                  )}
                  <Circle cx={r.cx + r.rx * 0.3} cy={r.cy - r.ry * 0.1} r={1.6} fill="rgba(244,240,228,0.5)" />
                </G>
              ))}

              {/* Stepping stones */}
              {[
                { x: size.w * 0.14, y: size.h * 0.95, rx: 17, ry: 8.5 },
                { x: size.w * 0.245, y: size.h * 0.905, rx: 14, ry: 7 },
                { x: size.w * 0.34, y: size.h * 0.945, rx: 12, ry: 6 },
              ].map((st, i) => (
                <G key={i}>
                  <Ellipse cx={st.x} cy={st.y + 2} rx={st.rx} ry={st.ry} fill="rgba(60,52,42,0.14)" />
                  <Ellipse cx={st.x} cy={st.y} rx={st.rx} ry={st.ry} fill="#DACBAD" />
                  <Ellipse cx={st.x - st.rx * 0.2} cy={st.y - st.ry * 0.25} rx={st.rx * 0.6} ry={st.ry * 0.5} fill="#E5D8BC" opacity={0.9} />
                </G>
              ))}

              {/* Branch reaching in from the corner, dressed for the season */}
              <G>
                <Path d="M-8 26 C 46 34, 82 58, 138 84" stroke={season.wood} strokeWidth={5} strokeLinecap="round" fill="none" />
                <Path d="M52 40 C 74 44, 88 54, 104 60" stroke={season.wood} strokeWidth={3} strokeLinecap="round" fill="none" />
                <Path d="M96 66 C 112 68, 124 76, 132 82" stroke={season.wood} strokeWidth={2.4} strokeLinecap="round" fill="none" />
                {[
                  { x: 104, y: 58, r: 8 },
                  { x: 122, y: 74, r: 9 },
                  { x: 140, y: 88, r: 7.5 },
                  { x: 92, y: 70, r: 6.5 },
                  { x: 132, y: 62, r: 6 },
                  { x: 152, y: 78, r: 5.5 },
                ].map((b, i) =>
                  seasonKey === 'winter' && i % 2 === 1 ? null : (
                    <G key={i}>
                      <Circle cx={b.x} cy={b.y} r={seasonKey === 'winter' ? b.r * 0.55 : b.r} fill={i % 2 ? season.bloomA : season.bloomB} />
                      <Circle cx={b.x} cy={b.y} r={1.6} fill={season.bloomCore} />
                    </G>
                  )
                )}
              </G>
            </Svg>
          </Animated.View>
        )}

        {/* Wind through the grass */}
        {size.w > 0 && (
          <>
            <GrassTuft x={-6} flip={false} color={season.grass} delay={0} />
            <GrassTuft x={38} flip color={season.grass} delay={900} />
            <GrassTuft x={size.w - 52} flip color={season.grass} delay={500} />
          </>
        )}

        {/* Rake strokes — the heart of the garden */}
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
            {strokes.map((s) => (
              <StrokePath key={s.id} pts={s.pts} rake={s.rake} ink={season.ink} lip={season.lip} settling />
            ))}
            {activePts.current.length > 1 && (
              <StrokePath
                key={`active-${activeTick >= 0 ? 'now' : ''}`}
                pts={[...activePts.current]}
                rake={activeRake}
                ink={season.ink}
                lip={season.lip}
                settling={false}
              />
            )}
          </Svg>
        )}

        {/* Placed decorations */}
        {decor.map((item) => (
          <PlacedDecor key={item.id} item={item} ink={season.ink} />
        ))}

        {/* Pond life */}
        {pond && (
          <>
            <Koi pond={pond} scale={0.55} dur={seasonKey === 'winter' ? 21000 : 14000} phase={0} reverse={false} body="#F6F3EC" patch="#E8894A" />
            <Koi pond={pond} scale={0.42} dur={seasonKey === 'winter' ? 26000 : 19000} phase={2.6} reverse body="#E8894A" patch="#F6F3EC" />
            <View pointerEvents="none" style={{ position: 'absolute', left: pond.cx - pond.rx * 0.3, top: pond.cy - pond.ry * 0.2 }}>
              <AmbientRipple delay={0} size={46} />
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', left: pond.cx + pond.rx * 0.4, top: pond.cy + pond.ry * 0.35 }}>
              <AmbientRipple delay={1700} size={34} />
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', left: pond.cx + pond.rx * 0.2, top: pond.cy - pond.ry * 0.4 }}>
              <Glint delay={0} />
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', left: pond.cx - pond.rx * 0.25, top: pond.cy + pond.ry * 0.5 }}>
              <Glint delay={1100} />
            </View>
            {showWildlife && <Dragonfly cx={pond.cx - pond.rx - 46} cy={pond.cy + 22} />}
          </>
        )}

        {/* Ambient sand sparkles */}
        {size.w > 0 && (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', left: size.w * 0.48, top: size.h * 0.34 }}>
              <Glint delay={600} dim />
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', left: size.w * 0.12, top: size.h * 0.6 }}>
              <Glint delay={2100} dim />
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', left: size.w * 0.82, top: size.h * 0.52 }}>
              <Glint delay={3300} dim />
            </View>
          </>
        )}

        {/* Butterflies */}
        {size.w > 0 && showWildlife && (
          <>
            <Butterfly W={size.w} H={size.h} first={5000} />
            <Butterfly W={size.w} H={size.h} first={16000} />
          </>
        )}

        {/* Transient effects: ripples, brush rings, sand kicks, sparkles */}
        {fx.map((f) => (
          <View key={f.id} pointerEvents="none" style={{ position: 'absolute', left: f.x, top: f.y }}>
            {f.kind === 'ripple' && <RingPulse size={54} color="rgba(240,248,246,0.9)" />}
            {f.kind === 'brush' && <RingPulse size={64} color={season.ink} />}
            {f.kind === 'kick' && <SandKick nx={f.nx ?? 0} ny={f.ny ?? 1} tint={season.ink} />}
            {f.kind === 'spark' && <SparkBurst color={f.color ?? PASTEL.cream} />}
          </View>
        ))}

        {/* Seasonal drift — petals, leaf flecks, snow */}
        {size.h > 0 &&
          driftSeeds.map((s, i) => <Drift key={`${seasonKey}-${i}`} w={size.w} h={size.h} seed={s} cfg={season.drift} />)}

        {/* Smoothing veil */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: season.sand[1] }, veilStyle]}
        />

        {/* Toast */}
        {toast && (
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(220)}
            exiting={FadeOut.duration(260)}
            pointerEvents="none"
            style={[styles.toast, { bottom: insets.bottom + 176 }]}
          >
            <BlurView intensity={26} tint="light" style={styles.toastBlur}>
              <Text variant="subhead" color="#5D4B36">
                {toast.msg}
              </Text>
            </BlurView>
          </Animated.View>
        )}

        {/* Decor picker — floats above the dock in Decorate mode */}
        {mode === 'decorate' && (
          <Animated.View
            entering={FadeInDown.duration(220)}
            exiting={FadeOut.duration(160)}
            style={[styles.picker, { bottom: insets.bottom + 92 }]}
          >
            <BlurView intensity={26} tint="light" style={styles.dockBlur}>
              {DECOR_KINDS.map((d) => (
                <DockChip
                  key={d.kind}
                  icon={d.icon}
                  label={`Place ${d.label}`}
                  active={decorKind === d.kind}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setDecorKind(d.kind);
                  }}
                />
              ))}
            </BlurView>
          </Animated.View>
        )}

        {/* Floating glass dock */}
        <View style={[styles.dock, { bottom: insets.bottom + 26 }]}>
          <BlurView intensity={26} tint="light" style={styles.dockBlur}>
            <DockChip icon="rake" label="Rake style" active={mode === 'rake'} onPress={cycleRake} />
            <DockChip
              icon="flower"
              label="Decorate"
              active={mode === 'decorate'}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setMode((m) => (m === 'decorate' ? 'rake' : 'decorate'));
              }}
            />
            <DockChip icon="leaf" label="Season" onPress={cycleSeason} />
            <DockChip icon="wind" label="Smooth sand" onPress={smooth} />
            {HAS_AUDIO && (
              <DockChip
                icon={soundOn ? 'sound' : 'soundOff'}
                label={soundOn ? 'Mute sound' : 'Unmute sound'}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSoundOn((s) => !s);
                }}
              />
            )}
          </BlurView>
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EFE7D8', overflow: 'hidden' },
  sunlight: {
    position: 'absolute',
    top: -160,
    left: -120,
    width: 420,
    height: 420,
    borderRadius: 999,
    backgroundColor: 'rgba(255,248,226,0.35)',
  },
  blob: { position: 'absolute', borderRadius: 999 },

  ring: { position: 'absolute', borderWidth: 1.6 },
  glint: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)' },

  koi: { position: 'absolute', left: 0, top: 0 },
  dfBody: {
    position: 'absolute',
    left: 8,
    top: 7,
    width: 13,
    height: 1.8,
    borderRadius: 1,
    backgroundColor: '#4E6E75',
  },
  dfHead: {
    position: 'absolute',
    left: 19.5,
    top: 6.2,
    width: 3.4,
    height: 3.4,
    borderRadius: 2,
    backgroundColor: '#3E5B62',
  },

  wing: { position: 'absolute', top: 2, width: 11, height: 12, borderRadius: 8 },
  bfBody: {
    position: 'absolute',
    left: 9.5,
    top: 1,
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#5D4B36',
  },

  sandRing: { position: 'absolute', borderWidth: 1.6, borderRadius: 999 },

  dock: { position: 'absolute', alignSelf: 'center' },
  picker: { position: 'absolute', alignSelf: 'center' },
  dockBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,252,244,0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: 'rgba(93,75,54,0.12)' },

  toast: { position: 'absolute', alignSelf: 'center' },
  toastBlur: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,252,244,0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.65)',
  },
});

export default ZenGarden;
