import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Icon from '../components/Icon';
import { SPACE } from '../theme/tokens';
import { environmentForCatches } from '../utils/tinyEscapes';

/**
 * Rain Catcher — an interactive meditation, not an arcade game.
 *
 * You guide a weighted umbrella through a rainy meadow; every drop it catches
 * waters the earth, and the meadow answers by growing flowers. There is no
 * way to fail: missed drops simply land and soak in, nothing attacks, nothing
 * is lost. Instead of difficulty the world ramps *beauty* — cumulative
 * catches walk the scene through six palettes (Fresh Meadow → Moonlit Garden,
 * thresholds in utils/tinyEscapes.ts) with crossfades slow enough to feel
 * rather than notice. Weather is atmosphere only: clouds pass, mist breathes,
 * a rainbow may hang in the spring air — never a hazard.
 *
 * Performance follows the house rules: a fixed pool of 12 recycled raindrops
 * (no allocation while falling), flower/sprout pools capped + pruned, catch
 * detection in a per-drop worklet with runOnJS only at the catch itself, and
 * haptics throttled. The garden persists across environment crossfades — the
 * meadow you leave behind is the whole reward.
 */

/* ------------------------------- Ambience --------------------------------- */

/**
 * Audio registry — ships EMPTY on purpose (no bundled sound assets yet).
 * Drop files into src/escapes/audio/ and register them here, e.g.:
 *
 *   rain:  require('./audio/catcher-rain.mp3'),   // looping rainfall bed
 *   birds: require('./audio/catcher-birds.mp3'),  // looping distant birdsong
 *   wind:  require('./audio/catcher-wind.mp3'),   // looping soft wind
 *   chime: require('./audio/catcher-chime.mp3'),  // one-shot when a flower opens
 *
 * The plumbing below is complete: loops start on entry, a mute chip appears,
 * and each new flower strikes the chime. Haptics carry feedback until then.
 */
const RAIN_AUDIO: Partial<Record<'rain' | 'birds' | 'wind' | 'chime', number>> = {};
const HAS_AUDIO = Object.values(RAIN_AUDIO).some((v) => v != null);

/** Looping ambience + a bloom chime. Fully wired, silent until assets exist. */
function useAmbience(enabled: boolean) {
  const chimeRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (!enabled || !HAS_AUDIO) return;
    const players: AudioPlayer[] = [];
    (['rain', 'birds', 'wind'] as const).forEach((k) => {
      const src = RAIN_AUDIO[k];
      if (src == null) return;
      try {
        const p = createAudioPlayer(src);
        p.loop = true;
        p.volume = k === 'rain' ? 0.5 : 0.25;
        p.play();
        players.push(p);
      } catch {
        // A missing/corrupt asset must never break the meadow.
      }
    });
    if (RAIN_AUDIO.chime != null) {
      try {
        const c = createAudioPlayer(RAIN_AUDIO.chime);
        c.volume = 0.35;
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

/* ----------------------------- Environments ------------------------------- */

interface EnvPalette {
  sky: [string, string, string];
  /** Soft light band where the sky settles onto the hills. */
  haze: string;
  hillFar: string;
  hillNear: string;
  ground: [string, string];
  grass: string;
  rain: string;
  cloud: string;
  celestial: { kind: 'sun' | 'moon'; color: string; halo: string; x: number; y: number; r: number };
  drift: { color: string; w: number; h: number; r: number; count: number; dur: number } | null;
  fireflies: boolean;
  stars: boolean;
  mist: string | null;
  rainbow: boolean;
}

/**
 * Palette records keyed by the ids in RAIN_ENVIRONMENTS (utils/tinyEscapes).
 * Every sky keeps a mid-value zenith so the player's white chrome stays
 * readable from Fresh Meadow all the way to the Moonlit Garden — it is
 * raining, after all; these are rain-softened skies, not postcard noons.
 */
const ENVIRONMENTS: Record<string, EnvPalette> = {
  fresh: {
    sky: ['#7C95A6', '#A7BFC0', '#D3E2D6'],
    haze: 'rgba(242,248,242,0.5)',
    hillFar: '#7E9887',
    hillNear: '#5D7B67',
    ground: ['#57795F', '#3C5947'],
    grass: 'rgba(214,232,208,0.5)',
    rain: 'rgba(216,232,240,0.8)',
    cloud: 'rgba(255,255,255,0.13)',
    celestial: { kind: 'sun', color: '#F3ECD8', halo: 'rgba(243,236,216,0.16)', x: 0.78, y: 0.16, r: 17 },
    drift: { color: 'rgba(244,250,240,0.55)', w: 4, h: 4, r: 2, count: 4, dur: 15000 },
    fireflies: false,
    stars: false,
    mist: 'rgba(228,240,232,0.5)',
    rainbow: false,
  },
  spring: {
    sky: ['#7DA3A4', '#A5C9B4', '#DCEBCF'],
    haze: 'rgba(248,252,238,0.5)',
    hillFar: '#83A177',
    hillNear: '#5F855F',
    ground: ['#5B8258', '#3E6244'],
    grass: 'rgba(226,240,204,0.55)',
    rain: 'rgba(222,238,240,0.8)',
    cloud: 'rgba(255,255,255,0.14)',
    celestial: { kind: 'sun', color: '#F7EDD2', halo: 'rgba(247,237,210,0.2)', x: 0.68, y: 0.13, r: 18 },
    drift: { color: 'rgba(247,235,244,0.7)', w: 6, h: 8, r: 5, count: 5, dur: 13000 },
    fireflies: false,
    stars: false,
    mist: null,
    rainbow: true,
  },
  cherry: {
    sky: ['#8B88A8', '#C3A6B9', '#F1DBDC'],
    haze: 'rgba(253,242,240,0.55)',
    hillFar: '#9A7E92',
    hillNear: '#715C74',
    ground: ['#6F7758', '#4B543C'],
    grass: 'rgba(246,228,226,0.5)',
    rain: 'rgba(240,230,238,0.8)',
    cloud: 'rgba(255,246,248,0.13)',
    celestial: { kind: 'sun', color: '#F8E8D8', halo: 'rgba(248,232,216,0.2)', x: 0.26, y: 0.15, r: 17 },
    drift: { color: 'rgba(240,196,208,0.8)', w: 7, h: 9, r: 6, count: 9, dur: 11000 },
    fireflies: false,
    stars: false,
    mist: null,
    rainbow: false,
  },
  lavender: {
    sky: ['#65648E', '#9188B4', '#CDBBDD'],
    haze: 'rgba(238,228,246,0.5)',
    hillFar: '#77689A',
    hillNear: '#544878',
    ground: ['#5E5680', '#403A5E'],
    grass: 'rgba(216,202,240,0.5)',
    rain: 'rgba(226,222,244,0.75)',
    cloud: 'rgba(238,230,250,0.1)',
    celestial: { kind: 'sun', color: '#F4DDC0', halo: 'rgba(244,221,192,0.18)', x: 0.75, y: 0.24, r: 20 },
    drift: { color: 'rgba(198,178,232,0.75)', w: 6, h: 8, r: 5, count: 7, dur: 12000 },
    fireflies: true,
    stars: false,
    mist: null,
    rainbow: false,
  },
  golden: {
    sky: ['#6E5E76', '#B98A6E', '#F0C68C'],
    haze: 'rgba(255,232,196,0.55)',
    hillFar: '#8A6A58',
    hillNear: '#5C4640',
    ground: ['#6E5B44', '#4A3C30'],
    grass: 'rgba(255,228,182,0.5)',
    rain: 'rgba(255,238,214,0.7)',
    cloud: 'rgba(255,236,214,0.12)',
    celestial: { kind: 'sun', color: '#FFD9A4', halo: 'rgba(255,217,164,0.24)', x: 0.24, y: 0.3, r: 26 },
    drift: { color: 'rgba(255,226,163,0.65)', w: 4, h: 4, r: 2, count: 6, dur: 14000 },
    fireflies: true,
    stars: false,
    mist: null,
    rainbow: false,
  },
  moonlit: {
    sky: ['#222A46', '#39436A', '#5D6890'],
    haze: 'rgba(150,166,208,0.22)',
    hillFar: '#2A3352',
    hillNear: '#1B2238',
    ground: ['#252E4A', '#151C30'],
    grass: 'rgba(158,176,220,0.35)',
    rain: 'rgba(196,212,244,0.6)',
    cloud: 'rgba(196,210,240,0.07)',
    celestial: { kind: 'moon', color: '#EFE6CB', halo: 'rgba(239,230,203,0.16)', x: 0.76, y: 0.14, r: 17 },
    drift: null,
    fireflies: true,
    stars: true,
    mist: null,
    rainbow: false,
  },
};

/* -------------------------------- Tuning ---------------------------------- */

const DROPS = 12;
/** Forgiving half-width of the canopy's catch zone — generosity is the point. */
const CATCH_HALF = 62;
const MAX_FLOWERS = 24;
const MAX_SPROUTS = 20;
const UMB_W = 132;
const UMB_H = 132;
/** Canopy center as a fraction of scene height. */
const UMB_Y = 0.56;
const UMB_SPRING = { damping: 17, stiffness: 110, mass: 0.85 };
const PARALLAX = { far: 0.02, near: 0.045 };

const FLOWER_PETALS = [
  { base: '#E8A9BD', light: '#F3CBD9' },
  { base: '#CDB6E4', light: '#E2D4F1' },
  { base: '#F2C9A2', light: '#F8DFC5' },
  { base: '#F4EFE7', light: '#FFFDF7' },
  { base: '#A9C6E8', light: '#CBDDF2' },
];
const FLOWER_CENTER = '#FFE9BE';
const FLOWER_STAMEN = '#C89A5B';
const FIREFLY = '#FFE7A3';

/** Fractional star positions for the Moonlit Garden, seeded once. */
const STAR_FIELD = Array.from({ length: 16 }, (_, i) => ({
  x: ((i * 61 + 13) % 97) / 97,
  y: (((i * 37 + 5) % 41) / 41) * 0.4,
  r: 0.8 + ((i * 13) % 3) * 0.35,
}));
const TWINKLES: [number, number][] = [
  [0.16, 0.1],
  [0.44, 0.22],
  [0.88, 0.07],
];
const DRIFT_SEEDS = Array.from({ length: 9 }, (_, i) => (i + 0.4) / 9.3);
const FIREFLY_SEEDS = Array.from({ length: 4 }, (_, i) => (i + 0.5) / 4.4);
const DROP_SEEDS = Array.from({ length: DROPS }, (_, i) => ((i * 7 + 3) % DROPS) / DROPS);

/* ------------------------------ Environment ------------------------------- */

/**
 * One full painting of the meadow — sky, light, hills, ground, grass.
 * Two of these can be mounted at once: the previous palette sits beneath
 * while the new one fades in over ~1.7s, so transitions never pop. Hills and
 * ground drift a few px against the umbrella for quiet parallax depth.
 */
const Environment = memo(function Environment({
  env,
  w,
  h,
  umbX,
}: {
  env: EnvPalette;
  w: number;
  h: number;
  umbX: SharedValue<number>;
}) {
  const blades = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: (i + 0.5) * (w / 16) + (((i * 37) % 11) - 5),
        len: 12 + ((i * 53) % 16),
        lean: (((i * 29) % 13) - 6) * 0.8,
      })),
    [w]
  );

  const farStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (w / 2 - umbX.value) * PARALLAX.far }],
  }));
  const nearStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (w / 2 - umbX.value) * PARALLAX.near }],
  }));

  const c = env.celestial;
  const cx = w * c.x;
  const cy = h * c.y;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={env.sky} style={StyleSheet.absoluteFill} />

      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={c.r * 2.3} fill={c.halo} />
        <Circle cx={cx} cy={cy} r={c.r} fill={c.color} opacity={0.95} />
        {c.kind === 'moon' && (
          <>
            <Circle cx={cx - c.r * 0.3} cy={cy - c.r * 0.25} r={c.r * 0.2} fill="rgba(0,0,0,0.05)" />
            <Circle cx={cx + c.r * 0.25} cy={cy + c.r * 0.25} r={c.r * 0.14} fill="rgba(0,0,0,0.045)" />
            <Circle cx={cx + c.r * 0.2} cy={cy - c.r * 0.35} r={c.r * 0.1} fill="rgba(0,0,0,0.04)" />
          </>
        )}
        {env.stars &&
          STAR_FIELD.map((s, i) => (
            <Circle key={i} cx={s.x * w} cy={s.y * h} r={s.r} fill="rgba(255,250,235,0.75)" />
          ))}
      </Svg>

      {/* Far hills under a soft haze band */}
      <Animated.View style={[StyleSheet.absoluteFill, farStyle]}>
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Ellipse cx={w / 2} cy={h * 0.66} rx={w * 0.78} ry={h * 0.09} fill={env.haze} />
          <Path
            d={`M0 ${h} L0 ${h * 0.68} Q ${w * 0.28} ${h * 0.6}, ${w * 0.55} ${h * 0.67} T ${w} ${h * 0.63} L${w} ${h} Z`}
            fill={env.hillFar}
          />
        </Svg>
      </Animated.View>

      {/* Near ground — the meadow the garden grows on */}
      <Animated.View style={[StyleSheet.absoluteFill, nearStyle]}>
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Path
            d={`M0 ${h} L0 ${h * 0.76} Q ${w * 0.45} ${h * 0.7}, ${w} ${h * 0.755} L${w} ${h} Z`}
            fill={env.hillNear}
          />
          <Path
            d={`M0 ${h} L0 ${h * 0.84} Q ${w * 0.5} ${h * 0.79}, ${w} ${h * 0.845} L${w} ${h} Z`}
            fill={env.ground[0]}
          />
          <Path
            d={`M0 ${h} L0 ${h * 0.93} Q ${w * 0.5} ${h * 0.885}, ${w} ${h * 0.93} L${w} ${h} Z`}
            fill={env.ground[1]}
          />
          {blades.map((g, i) => (
            <Path
              key={i}
              d={`M${g.x} ${h} Q ${g.x + g.lean * 0.4} ${h - g.len * 0.55}, ${g.x + g.lean} ${h - g.len}`}
              stroke={env.grass}
              strokeWidth={i % 4 ? 1.5 : 2}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
});

/* ----------------------------- Ambient life ------------------------------- */

/** A soft cloud drifting across the sky forever — atmosphere, never threat. */
const CloudPuff = memo(function CloudPuff({
  w,
  y,
  scale,
  color,
  dur,
  delay,
}: {
  w: number;
  y: number;
  scale: number;
  color: string;
  dur: number;
  delay: number;
}) {
  const x = useSharedValue(-180);
  useEffect(() => {
    x.value = -180;
    x.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(w + 60, { duration: dur, easing: Easing.linear }),
          withTiming(-180, { duration: 0 })
        ),
        -1
      )
    );
  }, [x, w, dur, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: y }, style]}>
      <View style={[styles.cloudBlob, { width: 120, height: 34, borderRadius: 20, backgroundColor: color }]} />
      <View style={[styles.cloudBlob, { width: 70, height: 30, borderRadius: 16, left: 18, top: -14, backgroundColor: color }]} />
      <View style={[styles.cloudBlob, { width: 56, height: 24, borderRadius: 14, left: 62, top: -8, backgroundColor: color }]} />
    </Animated.View>
  );
});

/** Seasonal drift — seeds, petals or pollen falling forever. */
const Drift = memo(function Drift({
  w,
  h,
  seed,
  cfg,
}: {
  w: number;
  h: number;
  seed: number;
  cfg: NonNullable<EnvPalette['drift']>;
}) {
  const delaySeed = (seed * 9301 + 0.17) % 1;
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
      withSequence(
        withTiming(seed * 360 + 50, { duration: 3200 }),
        withTiming(seed * 360 - 50, { duration: 3200 })
      ),
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

/** Firefly with a layered halo, wandering on independent loops (dusk on). */
const Firefly = memo(function Firefly({ w, h, seed }: { w: number; h: number; seed: number }) {
  const cfg = useMemo(() => {
    const sx = 20 + seed * (w - 40);
    const sy = h * 0.45 + ((seed * 7919) % 1) * h * 0.3;
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
        withTiming(0.9, { duration: cfg.pulse, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.12, { duration: cfg.pulse, easing: Easing.inOut(Easing.quad) })
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
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: cfg.sx, top: cfg.sy }, style]}>
      <View style={styles.fireflyOuter}>
        <View style={styles.fireflyHalo}>
          <View style={styles.fireflyCore} />
        </View>
      </View>
    </Animated.View>
  );
});

/** A star that breathes a little brighter than the static field. */
const Twinkle = memo(function Twinkle({ x, y, delay }: { x: number; y: number; delay: number }) {
  const o = useSharedValue(0.15);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.15, { duration: 1600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [o, delay]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[styles.twinkle, { left: x, top: y }, style]} />;
});

/** A distant bird gliding across the daytime sky every so often. */
const Bird = memo(function Bird({ w, h }: { w: number; h: number }) {
  const [cycle, setCycle] = useState(0);
  const params = useMemo(
    () => ({
      y0: h * (0.08 + Math.random() * 0.16),
      amp: 10 + Math.random() * 14,
      dur: 12000 + Math.random() * 5000,
      wait: cycle === 0 ? 6000 : 16000 + Math.random() * 18000,
      ltr: Math.random() > 0.5,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycle, h]
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
    flap.value = withRepeat(withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [flap]);

  const style = useAnimatedStyle(() => {
    const q = p.value;
    const x = params.ltr ? -30 + q * (w + 60) : w + 30 - q * (w + 60);
    return {
      opacity: q === 0 ? 0 : Math.min(0.8, Math.sin(q * Math.PI) * 2.4),
      transform: [
        { translateX: x },
        { translateY: params.y0 + Math.sin(q * Math.PI * 2) * params.amp },
        { scaleY: 0.6 + flap.value * 0.4 },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <Svg width={18} height={8} viewBox="0 0 18 8">
        <Path d="M1 6Q4.5 1 9 6" stroke="rgba(52,60,66,0.55)" strokeWidth={1.5} strokeLinecap="round" fill="none" />
        <Path d="M9 6Q13.5 1 17 6" stroke="rgba(52,60,66,0.55)" strokeWidth={1.5} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
});

/** A faint rainbow breathing in the spring air. Decoration, never a goal. */
const Rainbow = memo(function Rainbow({ w, h }: { w: number; h: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.18, { duration: 5200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  const cx = w * 0.32;
  const cy = h * 0.7;
  const R = w * 0.42;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        {[
          { r: R, c: '#E8A9BD' },
          { r: R - 7, c: '#F2C9A2' },
          { r: R - 14, c: '#A9C6E8' },
        ].map(({ r, c }, i) => (
          <Path
            key={i}
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            stroke={c}
            strokeWidth={4.5}
            opacity={0.22}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </Svg>
    </Animated.View>
  );
});

/** Morning mist lying over the far meadow, breathing slowly. */
const MistBand = memo(function MistBand({ w, h, color }: { w: number; h: number; color: string }) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.35, { duration: 5200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: -20, width: w + 40, top: h * 0.58, height: h * 0.16 }, style]}
    >
      <LinearGradient colors={['transparent', color, 'transparent']} style={{ flex: 1 }} />
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
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x, bottom: 0, width: 54, height: 46 }, style]}
    >
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

/* -------------------------------- Garden ---------------------------------- */

/** One sparkle flying out as a flower opens; shared progress drives all four. */
const SparkDot = memo(function SparkDot({
  angle,
  dist,
  spark,
  color,
  cx,
  cy,
}: {
  angle: number;
  dist: number;
  spark: { value: number };
  color: string;
  cx: number;
  cy: number;
}) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    const p = spark.value;
    return {
      opacity: p >= 1 ? 0 : (1 - p) * 0.9,
      transform: [
        { translateX: Math.cos(rad) * dist * p },
        { translateY: Math.sin(rad) * dist * p },
        { scale: 1 - p * 0.5 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sparkDot, { left: cx - 2, top: cy - 2, backgroundColor: color }, style]}
    />
  );
});

/**
 * A meadow flower on a stem. The whole plant springs up from the soil
 * (pivot at its base), then the head unfolds in layers — outer petals, inner
 * petals, heart — each on its own delayed spring, with a small sparkle burst.
 * It sways forever, and after ~40s softens into scenery without ever leaving.
 */
const MeadowFlower = memo(function MeadowFlower({
  size,
  palette,
  seed,
}: {
  size: number;
  palette: { base: string; light: string };
  seed: number;
}) {
  const H = size * 1.6;
  const outer = useSharedValue(0);
  const inner = useSharedValue(0);
  const heart = useSharedValue(0);
  const spark = useSharedValue(0);
  const sway = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    outer.value = withSpring(1, { damping: 12, stiffness: 150, mass: 0.8 });
    inner.value = withDelay(110, withSpring(1, { damping: 11, stiffness: 170, mass: 0.7 }));
    heart.value = withDelay(200, withSpring(1, { damping: 9, stiffness: 210, mass: 0.6 }));
    spark.value = withDelay(90, withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) }));
    sway.value = withDelay(
      seed * 900,
      withRepeat(
        withSequence(
          withTiming(2.6, { duration: 2700 + seed * 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(-2.6, { duration: 2700 + seed * 1600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
    // The meadow remembers, but softly — old blooms recede into the scenery.
    fade.value = withDelay(40000, withTiming(0.5, { duration: 14000 }));
  }, [outer, inner, heart, spark, sway, fade, seed]);

  const wrap = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateY: H / 2 },
      { rotate: `${sway.value}deg` },
      { scale: outer.value },
      { translateY: -H / 2 },
    ],
  }));
  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(1 - outer.value) * -22}deg` }],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inner.value }, { rotate: `${(1 - inner.value) * 26}deg` }],
  }));
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));

  return (
    <Animated.View style={[{ width: size, height: H }, wrap]}>
      {[30, 120, 210, 300].map((a) => (
        <SparkDot key={a} angle={a} dist={size * 0.55} spark={spark} color={palette.light} cx={size / 2} cy={size * 0.5} />
      ))}

      <Svg width={size} height={H} viewBox="0 0 40 64" style={StyleSheet.absoluteFill}>
        <Path d="M20 63C20 52 19.4 44 20 30" stroke="#5F7F55" strokeWidth={2.2} strokeLinecap="round" fill="none" />
        <Path d="M20 48C14.5 46.5 11.5 42.5 11 37.5C16 38.5 19 42 20 46.5" fill="#6B8A5E" opacity={0.9} />
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, outerStyle]}>
        <Svg width={size} height={H} viewBox="0 0 40 64">
          {[0, 72, 144, 216, 288].map((a) => (
            <Ellipse
              key={a}
              cx={20}
              cy={12.5}
              rx={5.2}
              ry={8.5}
              transform={`rotate(${a} 20 20)`}
              fill={palette.base}
              opacity={0.92}
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, innerStyle]}>
        <Svg width={size} height={H} viewBox="0 0 40 64">
          {[36, 108, 180, 252, 324].map((a) => (
            <Ellipse
              key={a}
              cx={20}
              cy={14.5}
              rx={3.6}
              ry={6}
              transform={`rotate(${a} 20 20)`}
              fill={palette.light}
              opacity={0.95}
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, heartStyle]}>
        <Svg width={size} height={H} viewBox="0 0 40 64">
          <Circle cx={20} cy={20} r={3.4} fill={FLOWER_CENTER} />
          {[45, 135, 225, 315].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <Circle
                key={a}
                cx={20 + Math.cos(rad) * 2.2}
                cy={20 + Math.sin(rad) * 2.2}
                r={0.9}
                fill={FLOWER_STAMEN}
              />
            );
          })}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
});

/** A small grass sprout — the meadow's quieter answer to being watered. */
const Sprout = memo(function Sprout({ color, seed }: { color: string; seed: number }) {
  const grow = useSharedValue(0);
  const sway = useSharedValue(0);
  const fade = useSharedValue(1);
  useEffect(() => {
    grow.value = withSpring(1, { damping: 11, stiffness: 160, mass: 0.7 });
    sway.value = withDelay(
      seed * 700,
      withRepeat(
        withSequence(
          withTiming(2, { duration: 2300 + seed * 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(-2, { duration: 2300 + seed * 1200, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
    fade.value = withDelay(30000, withTiming(0.55, { duration: 12000 }));
  }, [grow, sway, fade, seed]);
  const style = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: 11 }, { rotate: `${sway.value}deg` }, { scale: grow.value }, { translateY: -11 }],
  }));
  return (
    <Animated.View style={[{ width: 22, height: 22 }, style]}>
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Path d="M6 21Q5 14 9.5 8.5" stroke={color} strokeWidth={1.9} strokeLinecap="round" fill="none" />
        <Path d="M11.5 21Q12.5 11 10 4.5" stroke={color} strokeWidth={2.1} strokeLinecap="round" fill="none" />
        <Path d="M16.5 21Q18 16 19.5 13" stroke={color} strokeWidth={1.7} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
});

/* --------------------------------- Rain ----------------------------------- */

/**
 * One recycled raindrop. A fixed pool of these falls forever: each cycle
 * re-randomises position and pace, drifts on the shared wind, and a worklet
 * watches for the moment it crosses the canopy line within reach of the
 * umbrella — caught drops splash (ring + two droplets) and notify JS once;
 * missed drops simply soften into the grass. Nothing is ever lost.
 */
const Raindrop = memo(function Raindrop({
  seed,
  w,
  h,
  wind,
  umbX,
  color,
  onCatch,
}: {
  seed: number;
  w: number;
  h: number;
  wind: SharedValue<number>;
  umbX: SharedValue<number>;
  color: string;
  onCatch: (x: number) => void;
}) {
  const [cycle, setCycle] = useState(0);
  const params = useMemo(
    () => ({
      x0: 14 + Math.random() * (w - 28),
      depth: 0.55 + Math.random() * 0.45,
      dur: 2600 + Math.random() * 1700,
      wait: cycle === 0 ? seed * 2600 : 300 + Math.random() * 2200,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycle, w]
  );
  const p = useSharedValue(0);
  const caught = useSharedValue(0);
  const splash = useSharedValue(0);
  const catchX = useSharedValue(0);
  const recycle = useCallback(() => setCycle((c) => c + 1), []);

  const catchY = h * UMB_Y - 44;
  const fallEnd = h * 0.87;

  useEffect(() => {
    p.value = 0;
    caught.value = 0;
    splash.value = 0;
    p.value = withDelay(
      params.wait,
      withTiming(1, { duration: params.dur, easing: Easing.linear }, (f) => {
        if (f) runOnJS(recycle)();
      })
    );
  }, [params, p, caught, splash, recycle]);

  useAnimatedReaction(
    () => p.value,
    (pv, prev) => {
      if (prev === null || caught.value === 1) return;
      const yNow = -24 + pv * (fallEnd + 24);
      const yPrev = -24 + prev * (fallEnd + 24);
      if (yPrev < catchY && yNow >= catchY) {
        const x = params.x0 + wind.value * 16 * params.depth;
        if (Math.abs(x - umbX.value) < CATCH_HALF) {
          caught.value = 1;
          catchX.value = x;
          splash.value = 0;
          splash.value = withTiming(1, { duration: 430, easing: Easing.out(Easing.quad) });
          runOnJS(onCatch)(x);
        }
      }
    },
    [params, catchY, fallEnd, onCatch]
  );

  const dropStyle = useAnimatedStyle(() => {
    const landing = p.value > 0.94 ? Math.max(0, (1 - p.value) / 0.06) : 1;
    return {
      opacity: caught.value === 1 || p.value === 0 ? 0 : (0.4 + params.depth * 0.45) * landing,
      transform: [
        { translateX: params.x0 + wind.value * 16 * params.depth },
        { translateY: -24 + p.value * (fallEnd + 24) },
      ],
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const s = splash.value;
    return {
      opacity: s === 0 || s >= 1 ? 0 : (1 - s) * 0.85,
      transform: [{ translateX: catchX.value - 13 }, { scale: 0.35 + s * 0.9 }, { scaleY: 0.5 }],
    };
  });
  const dotLeft = useAnimatedStyle(() => {
    const s = splash.value;
    return {
      opacity: s === 0 || s >= 1 ? 0 : 1 - s,
      transform: [{ translateX: catchX.value - 3 - s * 16 }, { translateY: -s * 20 + s * s * 30 }],
    };
  });
  const dotRight = useAnimatedStyle(() => {
    const s = splash.value;
    return {
      opacity: s === 0 || s >= 1 ? 0 : 1 - s,
      transform: [{ translateX: catchX.value - 1 + s * 16 }, { translateY: -s * 24 + s * s * 34 }],
    };
  });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.drop, { width: 2 + params.depth * 1.4, height: 9 + params.depth * 8, backgroundColor: color }, dropStyle]}
      />
      <Animated.View pointerEvents="none" style={[styles.splashRing, { top: catchY - 5 }, ringStyle]} />
      <Animated.View pointerEvents="none" style={[styles.splashDot, { top: catchY - 3 }, dotLeft]} />
      <Animated.View pointerEvents="none" style={[styles.splashDot, { top: catchY - 3 }, dotRight]} />
    </>
  );
});

/* ------------------------------- Umbrella --------------------------------- */

/**
 * The umbrella. Follows the finger on a weighted spring; the gap between
 * finger and canopy tilts it into the movement, a slow bob keeps it alive
 * while parked, and each catch dips it in a small grateful nod. A warm glow
 * pools underneath — shelter made visible.
 */
const Umbrella = memo(function Umbrella({
  x,
  target,
  dip,
  top,
}: {
  x: SharedValue<number>;
  target: SharedValue<number>;
  dip: SharedValue<number>;
  top: number;
}) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [bob]);

  const style = useAnimatedStyle(() => {
    const lag = Math.max(-9, Math.min(9, (target.value - x.value) * 0.09));
    return {
      transform: [
        { translateX: x.value },
        { translateY: bob.value * 4 + dip.value * 3 },
        { rotate: `${lag}deg` },
        { scaleY: 1 - dip.value * 0.045 },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.umbrella, { top }, style]}>
      <Svg width={UMB_W} height={UMB_H} viewBox="0 0 132 132">
        <Defs>
          <SvgLinearGradient id="rcu-canopy" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E29A8C" />
            <Stop offset="1" stopColor="#B4685C" />
          </SvgLinearGradient>
          <RadialGradient id="rcu-glow" cx="0.5" cy="0.3" r="0.7">
            <Stop offset="0" stopColor="#FFD6AA" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#FFD6AA" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={66} cy={80} rx={56} ry={26} fill="url(#rcu-glow)" />
        <Path d="M66 64V114a8 8 0 0 0 16 0" stroke="#77604F" strokeWidth={3.5} strokeLinecap="round" fill="none" />
        <Path
          d="M10 64A56 56 0 0 1 122 64A18.7 11 0 0 1 84.7 64A18.7 11 0 0 1 47.3 64A18.7 11 0 0 1 10 64Z"
          fill="url(#rcu-canopy)"
        />
        <Path
          d="M66 9C52 20 48.5 42 47.3 62M66 9C80 20 83.5 42 84.7 62"
          stroke="rgba(90,42,36,0.35)"
          strokeWidth={1.4}
          fill="none"
        />
        <Ellipse cx={42} cy={31} rx={19} ry={9} fill="rgba(255,255,255,0.17)" transform="rotate(-26 42 31)" />
        <Circle cx={66} cy={7} r={3} fill="#B4685C" />
      </Svg>
    </Animated.View>
  );
});

/* -------------------------------- Scene ----------------------------------- */

interface FlowerItem {
  id: number;
  x: number;
  y: number;
  size: number;
  pi: number;
  seed: number;
}

interface SproutItem {
  id: number;
  x: number;
  y: number;
  seed: number;
  color: string;
}

const RainCatcher = () => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [catches, setCatches] = useState(0);
  const [flowers, setFlowers] = useState<FlowerItem[]>([]);
  const [sprouts, setSprouts] = useState<SproutItem[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const insets = useSafeAreaInsets();
  const idRef = useRef(1);
  const plantRef = useRef(0);
  const lastHaptic = useRef(0);
  const placed = useRef(false);
  const { w, h } = size;

  const envMeta = environmentForCatches(catches);
  const env = ENVIRONMENTS[envMeta.id] ?? ENVIRONMENTS.fresh;
  const [prevEnvId, setPrevEnvId] = useState<string | null>(null);
  const envIdRef = useRef(envMeta.id);
  useEffect(() => {
    if (envIdRef.current !== envMeta.id) {
      setPrevEnvId(envIdRef.current);
      envIdRef.current = envMeta.id;
      // No banner, no toast — just the faintest acknowledgment in the hand.
      Haptics.selectionAsync().catch(() => {});
    }
  }, [envMeta.id]);
  const prevEnv = prevEnvId ? ENVIRONMENTS[prevEnvId] : null;

  const umbX = useSharedValue(-1000);
  const target = useSharedValue(-1000);
  const wind = useSharedValue(0);
  const dip = useSharedValue(0);

  // Park the umbrella mid-scene once we know how wide the world is.
  useEffect(() => {
    if (w > 0 && !placed.current) {
      placed.current = true;
      umbX.value = w / 2;
      target.value = w / 2;
    }
  }, [w, umbX, target]);

  useEffect(() => {
    wind.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 6400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: 6400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [wind]);

  const chime = useAmbience(soundOn);

  const spawnFlower = useCallback(
    (x: number) => {
      setFlowers((prev) => {
        const next = prev.length >= MAX_FLOWERS ? prev.slice(prev.length - MAX_FLOWERS + 1) : prev;
        const seed = Math.random();
        return [
          ...next,
          {
            id: idRef.current++,
            x: Math.min(w - 26, Math.max(26, x + (seed - 0.5) * 110)),
            y: h * (0.8 + ((seed * 7919) % 1) * 0.13),
            size: 34 + seed * 16,
            pi: Math.floor(seed * FLOWER_PETALS.length),
            seed,
          },
        ];
      });
      chime();
    },
    [w, h, chime]
  );

  const spawnSprout = useCallback(
    (x: number) => {
      const color = (ENVIRONMENTS[envIdRef.current] ?? ENVIRONMENTS.fresh).grass;
      setSprouts((prev) => {
        const next = prev.length >= MAX_SPROUTS ? prev.slice(prev.length - MAX_SPROUTS + 1) : prev;
        const seed = Math.random();
        return [
          ...next,
          {
            id: idRef.current++,
            x: Math.min(w - 16, Math.max(16, x + (seed - 0.5) * 90)),
            y: h * (0.8 + ((seed * 104729) % 1) * 0.14),
            seed,
            color,
          },
        ];
      });
    },
    [w, h]
  );

  /**
   * A drop landed in the canopy. Haptic (throttled), a grateful dip, and the
   * meadow answers: every 3rd catch opens a flower, every 3rd a sprout, and
   * the one between is simply water for what's already growing.
   */
  const onCatch = useCallback(
    (x: number) => {
      const now = Date.now();
      if (now - lastHaptic.current > 160) {
        lastHaptic.current = now;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      dip.value = withSequence(
        withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 9, stiffness: 210 })
      );
      setCatches((c) => c + 1);
      plantRef.current += 1;
      if (plantRef.current % 3 === 0) spawnFlower(x);
      else if (plantRef.current % 3 === 1) spawnSprout(x);
    },
    [dip, spawnFlower, spawnSprout]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          if (HAS_AUDIO && e.y > h - 110 && e.x > w - 110) return;
          const tx = Math.min(w - 30, Math.max(30, e.x));
          target.value = tx;
          umbX.value = withSpring(tx, UMB_SPRING);
        })
        .onUpdate((e) => {
          const tx = Math.min(w - 30, Math.max(30, e.x));
          target.value = tx;
          umbX.value = withSpring(tx, UMB_SPRING);
        }),
    [w, h, target, umbX]
  );

  // The garden shares the ground's parallax so blooms stay rooted to it.
  const gardenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: w > 0 ? (w / 2 - umbX.value) * PARALLAX.near : 0 }],
  }));

  const drift = env.drift;

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.root}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {/* The world — previous palette beneath, current fading in over it */}
        {w > 0 && prevEnv && <Environment env={prevEnv} w={w} h={h} umbX={umbX} />}
        {w > 0 && (
          <Animated.View key={envMeta.id} entering={FadeIn.duration(1700)} style={StyleSheet.absoluteFill}>
            <Environment env={env} w={w} h={h} umbX={umbX} />
          </Animated.View>
        )}

        {/* Ambient life, re-cast for each environment */}
        {w > 0 && (
          <Animated.View
            key={`life-${envMeta.id}`}
            entering={FadeIn.duration(1100)}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {env.mist && <MistBand w={w} h={h} color={env.mist} />}
            {env.rainbow && <Rainbow w={w} h={h} />}
            <CloudPuff w={w} y={h * 0.07} scale={1} color={env.cloud} dur={76000} delay={0} />
            <CloudPuff w={w} y={h * 0.19} scale={0.68} color={env.cloud} dur={98000} delay={26000} />
            {drift && DRIFT_SEEDS.slice(0, drift.count).map((s, i) => <Drift key={i} w={w} h={h} seed={s} cfg={drift} />)}
            {env.celestial.kind === 'sun' && <Bird w={w} h={h} />}
            {env.fireflies && FIREFLY_SEEDS.map((s, i) => <Firefly key={i} w={w} h={h} seed={s} />)}
            {env.stars && TWINKLES.map(([tx, ty], i) => <Twinkle key={i} x={tx * w} y={ty * h} delay={i * 700} />)}
            <GrassTuft x={w * 0.06} flip={false} color={env.grass} delay={0} />
            <GrassTuft x={w * 0.52} flip color={env.grass} delay={900} />
            <GrassTuft x={w * 0.8} flip={false} color={env.grass} delay={1700} />
          </Animated.View>
        )}

        {/* Your garden — persists through every crossfade */}
        {w > 0 && (
          <Animated.View style={[StyleSheet.absoluteFill, gardenStyle]} pointerEvents="none">
            {sprouts.map((s) => (
              <View key={s.id} style={{ position: 'absolute', left: s.x - 11, top: s.y - 22 }}>
                <Sprout color={s.color} seed={s.seed} />
              </View>
            ))}
            {flowers.map((f) => (
              <View key={f.id} style={{ position: 'absolute', left: f.x - f.size / 2, top: f.y - f.size * 1.6 }}>
                <MeadowFlower size={f.size} palette={FLOWER_PETALS[f.pi]} seed={f.seed} />
              </View>
            ))}
          </Animated.View>
        )}

        {/* Rain — a fixed, recycled pool */}
        {w > 0 &&
          DROP_SEEDS.map((s, i) => (
            <Raindrop key={i} seed={s} w={w} h={h} wind={wind} umbX={umbX} color={env.rain} onCatch={onCatch} />
          ))}

        {w > 0 && <Umbrella x={umbX} target={target} dip={dip} top={h * UMB_Y - 64} />}

        {HAS_AUDIO && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={soundOn ? 'Mute sounds' : 'Unmute sounds'}
            onPress={() => setSoundOn((v) => !v)}
            hitSlop={10}
            style={[styles.soundChip, { bottom: insets.bottom + SPACE.lg }]}
          >
            <Icon name={soundOn ? 'sound' : 'soundOff'} size={17} color="rgba(255,255,255,0.9)" />
          </Pressable>
        )}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#7C95A6' },
  umbrella: { position: 'absolute', left: -(UMB_W / 2) },
  drop: { position: 'absolute', left: 0, top: 0, borderRadius: 2 },
  splashRing: {
    position: 'absolute',
    left: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.6,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  splashDot: {
    position: 'absolute',
    left: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  twinkle: { position: 'absolute', width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: '#F6EFD8' },
  cloudBlob: { position: 'absolute' },
  sparkDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2 },
  fireflyOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,231,163,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireflyHalo: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: 'rgba(255,231,163,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireflyCore: { width: 4.5, height: 4.5, borderRadius: 3, backgroundColor: FIREFLY },
  soundChip: {
    position: 'absolute',
    right: SPACE.gutter,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30,34,44,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RainCatcher;
