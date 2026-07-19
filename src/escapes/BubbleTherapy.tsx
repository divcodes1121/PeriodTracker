import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Icon from '../components/Icon';
import { RADIUS, SPACE } from '../theme/tokens';

/**
 * Bubble Therapy — a sensory relaxation experience, not a game.
 *
 * A dreamlike world of drifting soap bubbles you pop for no reason other than
 * how good it feels. No score, no timer, no objective, nothing to miss: a
 * bubble left alone simply floats off the top and comes back around.
 *
 * Depth is faked in three tiers so the air reads as *full* without paying for
 * hundreds of animated views: three parallax field layers (one `Svg` each,
 * circles drawn twice for a seamless wrap) sit behind 14 interactive bubbles.
 *
 * Roughly one bubble in seven carries a **special** — rainbow, glitter,
 * healing, golden, galaxy, aurora, in descending rarity. Popping one sends a
 * shimmer wave through its neighbours (a single shared-value ring every other
 * bubble reads in its own worklet — no re-renders), and the deeper three
 * *transform the world*: healing walks the soft environments (Morning Garden →
 * Lavender Meadow → Cherry Blossom), golden brings the sunset, galaxy the
 * moonlit lake, aurora the northern lights. That discovery replaces the usual
 * unlock ladder on purpose — nothing here tracks how long or how often you
 * come back. Bubble skins are drawn from the current environment, so the
 * bubbles always look like they belong to the sky behind them.
 *
 * Breathing mode (dock chip) syncs the whole world to a 4-2-6-2 rhythm —
 * visual guidance only, never a text instruction. Reduced Motion is honoured:
 * ambient life thins out and the world stops breathing on its own.
 *
 * Specials are distinguishable by the *shape* of their contents (petals,
 * stars, sparks, ring, swirl, ribbon), not hue alone, so they still read
 * without colour vision. Every bubble keeps a visible rim stroke for the
 * same reason.
 */

/* ------------------------------- Ambience --------------------------------- */

/**
 * Audio registry — ships EMPTY on purpose (no bundled sound assets yet).
 * Drop files into src/escapes/audio/ and register them here, e.g.:
 *
 *   air:   require('./audio/bubble-air.mp3'),    // looping soft wind bed
 *   water: require('./audio/bubble-water.mp3'),  // looping water ambience
 *   birds: require('./audio/bubble-birds.mp3'),  // looping distant birds
 *   pop:   require('./audio/bubble-pop.mp3'),    // one-shot pop
 *   chime: require('./audio/bubble-chime.mp3'),  // one-shot for specials
 *
 * The plumbing below is complete: loops start on entry, the dock grows a mute
 * chip, and pops trigger their one-shots. Haptics carry feedback until then.
 */
const BUBBLE_AUDIO: Partial<Record<'air' | 'water' | 'birds' | 'pop' | 'chime', number>> = {};
const HAS_AUDIO = Object.values(BUBBLE_AUDIO).some((v) => v != null);

/** Looping ambience + pop/chime one-shots. Wired, silent until assets exist. */
function useAmbience(enabled: boolean) {
  const popRef = useRef<AudioPlayer | null>(null);
  const chimeRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (!enabled || !HAS_AUDIO) return;
    const players: AudioPlayer[] = [];
    (['air', 'water', 'birds'] as const).forEach((k) => {
      const src = BUBBLE_AUDIO[k];
      if (src == null) return;
      try {
        const p = createAudioPlayer(src);
        p.loop = true;
        p.volume = k === 'air' ? 0.4 : 0.25;
        p.play();
        players.push(p);
      } catch {
        // A missing/corrupt asset must never break the escape.
      }
    });
    (['pop', 'chime'] as const).forEach((k) => {
      const src = BUBBLE_AUDIO[k];
      if (src == null) return;
      try {
        const p = createAudioPlayer(src);
        p.volume = k === 'pop' ? 0.45 : 0.4;
        if (k === 'pop') popRef.current = p;
        else chimeRef.current = p;
        players.push(p);
      } catch {}
    });
    return () => {
      players.forEach((p) => {
        try {
          p.remove();
        } catch {}
      });
      popRef.current = null;
      chimeRef.current = null;
    };
  }, [enabled]);

  return useCallback((kind: 'pop' | 'chime') => {
    const p = kind === 'pop' ? popRef.current : chimeRef.current;
    if (p) {
      p.seekTo(0).catch(() => {});
      p.play();
    }
  }, []);
}

/** Reduced Motion — thins ambient life and stops the world breathing on its own. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduced(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}

/* ----------------------------- Environments ------------------------------- */

type EnvKey = 'ocean' | 'garden' | 'lavender' | 'cherry' | 'sunset' | 'moonlit' | 'aurora';

interface Tint {
  mid: string;
  rim: string;
  glow: string;
}

interface EnvPalette {
  name: string;
  sky: [string, string, string];
  /** Soft out-of-focus light blobs behind everything. */
  bloom: string;
  /** Bubble skins are drawn from the sky they float in. */
  tints: [Tint, Tint, Tint];
  field: string;
  rays: { color: string; alpha: number } | null;
  floor:
    | { kind: 'kelp'; colors: [string, string] }
    | { kind: 'meadow'; colors: [string, string]; grass: string }
    | { kind: 'water'; colors: [string, string]; shimmer: string }
    | { kind: 'branch'; colors: [string, string] }
    | null;
  celestial: { kind: 'sun' | 'moon'; color: string; halo: string; x: number; y: number; r: number } | null;
  life: {
    plankton: number;
    pollen: number;
    petals: number;
    butterflies: number;
    fireflies: number;
    stars: boolean;
    aurora: boolean;
    flare: boolean;
  };
}

/**
 * Every sky keeps a mid-to-deep value at the top: the player's chrome (hint
 * pill + close button) is white, so a pale zenith would swallow it.
 */
const ENVIRONMENTS: Record<EnvKey, EnvPalette> = {
  ocean: {
    name: 'Ocean Calm',
    sky: ['#143241', '#0E1D26', '#0A141B'],
    bloom: 'rgba(124,187,215,0.06)',
    tints: [
      { mid: '#96D2FF', rim: 'rgba(196,232,255,0.6)', glow: 'rgba(210,240,255,0.95)' },
      { mid: '#C4B4FF', rim: 'rgba(220,208,255,0.55)', glow: 'rgba(228,218,255,0.95)' },
      { mid: '#FFC4E0', rim: 'rgba(255,216,234,0.5)', glow: 'rgba(255,226,240,0.95)' },
    ],
    field: 'rgba(200,232,250,0.16)',
    rays: { color: '190,230,250', alpha: 0.08 },
    floor: { kind: 'kelp', colors: ['rgba(22,58,64,0.85)', 'rgba(18,48,54,0.9)'] },
    celestial: null,
    life: { plankton: 4, pollen: 0, petals: 0, butterflies: 0, fireflies: 0, stars: false, aurora: false, flare: false },
  },
  garden: {
    name: 'Morning Garden',
    sky: ['#3E6B63', '#6FA08C', '#AFC9A8'],
    bloom: 'rgba(226,244,214,0.1)',
    tints: [
      { mid: '#BFE8D2', rim: 'rgba(226,248,236,0.6)', glow: 'rgba(236,252,242,0.95)' },
      { mid: '#FFE3B8', rim: 'rgba(255,236,206,0.55)', glow: 'rgba(255,244,224,0.95)' },
      { mid: '#FFC9D6', rim: 'rgba(255,220,230,0.5)', glow: 'rgba(255,232,240,0.95)' },
    ],
    field: 'rgba(240,252,232,0.2)',
    rays: { color: '255,244,206', alpha: 0.1 },
    floor: { kind: 'meadow', colors: ['#4E7A57', '#375B41'], grass: 'rgba(212,236,196,0.5)' },
    celestial: { kind: 'sun', color: '#FFF2CE', halo: 'rgba(255,242,206,0.18)', x: 0.76, y: 0.14, r: 20 },
    life: { plankton: 0, pollen: 5, petals: 0, butterflies: 2, fireflies: 0, stars: false, aurora: false, flare: true },
  },
  lavender: {
    name: 'Lavender Meadow',
    sky: ['#4A4270', '#7C6DA0', '#B8A6CE'],
    bloom: 'rgba(224,208,246,0.1)',
    tints: [
      { mid: '#D8C4F5', rim: 'rgba(232,220,252,0.6)', glow: 'rgba(240,232,255,0.95)' },
      { mid: '#C0D8F5', rim: 'rgba(214,232,252,0.55)', glow: 'rgba(228,242,255,0.95)' },
      { mid: '#FFD2E4', rim: 'rgba(255,224,238,0.5)', glow: 'rgba(255,236,246,0.95)' },
    ],
    field: 'rgba(238,228,252,0.2)',
    rays: { color: '236,222,255', alpha: 0.08 },
    floor: { kind: 'meadow', colors: ['#5C5484', '#413A63'], grass: 'rgba(216,200,244,0.45)' },
    celestial: { kind: 'sun', color: '#F6E4C6', halo: 'rgba(246,228,198,0.16)', x: 0.24, y: 0.18, r: 18 },
    life: { plankton: 0, pollen: 6, petals: 0, butterflies: 2, fireflies: 2, stars: false, aurora: false, flare: false },
  },
  cherry: {
    name: 'Cherry Blossom',
    sky: ['#5B4457', '#9A7288', '#D9AEB4'],
    bloom: 'rgba(255,224,230,0.1)',
    tints: [
      { mid: '#FFCEDC', rim: 'rgba(255,226,236,0.6)', glow: 'rgba(255,238,244,0.95)' },
      { mid: '#F2D6C0', rim: 'rgba(250,232,216,0.55)', glow: 'rgba(255,242,232,0.95)' },
      { mid: '#D6C8EE', rim: 'rgba(230,222,248,0.5)', glow: 'rgba(240,236,252,0.95)' },
    ],
    field: 'rgba(255,234,240,0.22)',
    rays: { color: '255,228,232,', alpha: 0.07 },
    floor: { kind: 'branch', colors: ['#6B4F52', '#F2C6D2'] },
    celestial: { kind: 'sun', color: '#FFE8D6', halo: 'rgba(255,232,214,0.16)', x: 0.78, y: 0.2, r: 19 },
    life: { plankton: 0, pollen: 0, petals: 7, butterflies: 1, fireflies: 0, stars: false, aurora: false, flare: true },
  },
  sunset: {
    name: 'Golden Sunset',
    sky: ['#4F3F5E', '#B07A66', '#F0BE86'],
    bloom: 'rgba(255,214,160,0.12)',
    tints: [
      { mid: '#FFD9A8', rim: 'rgba(255,232,200,0.6)', glow: 'rgba(255,242,220,0.95)' },
      { mid: '#FFC2B0', rim: 'rgba(255,216,206,0.55)', glow: 'rgba(255,232,224,0.95)' },
      { mid: '#E2C4F0', rim: 'rgba(238,222,248,0.5)', glow: 'rgba(246,236,252,0.95)' },
    ],
    field: 'rgba(255,236,206,0.22)',
    rays: { color: '255,216,158', alpha: 0.13 },
    floor: { kind: 'water', colors: ['#7A5A56', '#4A3742'], shimmer: 'rgba(255,214,158,0.5)' },
    celestial: { kind: 'sun', color: '#FFD9A4', halo: 'rgba(255,217,164,0.26)', x: 0.28, y: 0.34, r: 30 },
    life: { plankton: 0, pollen: 4, petals: 0, butterflies: 1, fireflies: 0, stars: false, aurora: false, flare: true },
  },
  moonlit: {
    name: 'Moonlit Lake',
    sky: ['#1B2340', '#2C3760', '#4B5885'],
    bloom: 'rgba(160,180,230,0.08)',
    tints: [
      { mid: '#AFC6F2', rim: 'rgba(206,222,250,0.55)', glow: 'rgba(226,236,255,0.95)' },
      { mid: '#C8BCF0', rim: 'rgba(220,212,250,0.5)', glow: 'rgba(234,228,255,0.95)' },
      { mid: '#A8DCE4', rim: 'rgba(200,236,242,0.5)', glow: 'rgba(224,246,250,0.95)' },
    ],
    field: 'rgba(206,224,255,0.16)',
    rays: null,
    floor: { kind: 'water', colors: ['#243056', '#141B33'], shimmer: 'rgba(226,232,255,0.4)' },
    celestial: { kind: 'moon', color: '#EFE6CB', halo: 'rgba(239,230,203,0.16)', x: 0.74, y: 0.16, r: 20 },
    life: { plankton: 0, pollen: 0, petals: 0, butterflies: 0, fireflies: 5, stars: true, aurora: false, flare: false },
  },
  aurora: {
    name: 'Aurora Sky',
    sky: ['#101B33', '#172A44', '#22405A'],
    bloom: 'rgba(140,240,210,0.07)',
    tints: [
      { mid: '#A6F0D8', rim: 'rgba(206,248,236,0.55)', glow: 'rgba(226,252,244,0.95)' },
      { mid: '#B4CCF6', rim: 'rgba(212,228,252,0.5)', glow: 'rgba(230,240,255,0.95)' },
      { mid: '#D8B8F0', rim: 'rgba(232,214,250,0.5)', glow: 'rgba(242,232,255,0.95)' },
    ],
    field: 'rgba(206,246,236,0.16)',
    rays: null,
    floor: { kind: 'water', colors: ['#152540', '#0C1626'], shimmer: 'rgba(166,240,216,0.35)' },
    celestial: { kind: 'moon', color: '#E8EEDF', halo: 'rgba(232,238,223,0.12)', x: 0.2, y: 0.13, r: 15 },
    life: { plankton: 0, pollen: 0, petals: 0, butterflies: 0, fireflies: 0, stars: true, aurora: true, flare: false },
  },
};

/** Healing bubbles walk the soft environments in order, then begin again. */
const HEALING_CYCLE: EnvKey[] = ['garden', 'lavender', 'cherry'];

/* ------------------------------- Specials --------------------------------- */

type SpecialKind = 'rainbow' | 'glitter' | 'healing' | 'golden' | 'galaxy' | 'aurora';

interface SpecialMeta {
  /** Share of the special roll — descending rarity down the list. */
  weight: number;
  /** Particle colours for the pop burst. */
  burst: string[];
  /** Ring that travels out and shimmers whatever it passes. */
  wave: string | null;
}

const SPECIALS: Record<SpecialKind, SpecialMeta> = {
  rainbow: {
    weight: 34,
    burst: ['#FF9DB0', '#FFD79A', '#FFF3A8', '#A8E6BE', '#A8CCF0', '#C9AEE8'],
    wave: 'rgba(255,236,246,0.5)',
  },
  glitter: {
    weight: 27,
    burst: ['#FFFFFF', '#FFF6D8', '#E8F4FF', '#FFEAF4'],
    wave: 'rgba(255,255,255,0.55)',
  },
  healing: {
    weight: 18,
    burst: ['#FFC9D6', '#F6D8E4', '#D8EFC8', '#FFF0D2'],
    wave: 'rgba(255,224,236,0.45)',
  },
  golden: {
    weight: 12,
    burst: ['#FFD79A', '#FFE9BE', '#FFC98A', '#FFF4D8'],
    wave: 'rgba(255,222,168,0.5)',
  },
  galaxy: {
    weight: 6,
    burst: ['#CFE0FF', '#B9A8F0', '#FFFFFF', '#8FD8E8'],
    wave: 'rgba(206,224,255,0.45)',
  },
  aurora: {
    weight: 3,
    burst: ['#A6F0D8', '#B4CCF6', '#D8B8F0', '#EAFFF6'],
    wave: 'rgba(166,240,216,0.5)',
  },
};

const SPECIAL_KINDS = Object.keys(SPECIALS) as SpecialKind[];
const SPECIAL_TOTAL = SPECIAL_KINDS.reduce((sum, k) => sum + SPECIALS[k].weight, 0);
/** Rare enough to stay a surprise; common enough to be discovered in one sitting. */
const SPECIAL_CHANCE = 0.15;

function rollSpecial(): SpecialKind | null {
  if (Math.random() > SPECIAL_CHANCE) return null;
  let r = Math.random() * SPECIAL_TOTAL;
  for (const k of SPECIAL_KINDS) {
    r -= SPECIALS[k].weight;
    if (r <= 0) return k;
  }
  return 'rainbow';
}

/* -------------------------------- Tuning ---------------------------------- */

const BUBBLES = 14;
const DROP_ANGLES = [20, 80, 140, 200, 260, 320];
const BURST_PARTICLES = [0, 45, 90, 135, 180, 225, 270, 315, 22, 112, 202, 292];
const MAX_TRANSIENT = 5;
const MAX_BLOOMS = 12;
const FIELD_LAYERS = [
  { count: 13, size: 3.4, dur: 52000, alpha: 0.5 },
  { count: 11, size: 5.5, dur: 74000, alpha: 0.72 },
  { count: 8, size: 8.5, dur: 98000, alpha: 1 },
];
/** Shimmer wave reach, in px, before it fades out entirely. */
const WAVE_REACH = 460;
const BREATH = { inhale: 4000, hold1: 2000, exhale: 6000, hold2: 2000 };

/* ------------------------- Environment furniture -------------------------- */

/** A slanted shaft of light; the middle one breathes. */
const Ray = memo(function Ray({
  left,
  width,
  height,
  tilt,
  color,
  alpha,
  breathe,
}: {
  left: number;
  width: number;
  height: number;
  tilt: string;
  color: string;
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
      <LinearGradient colors={[`rgba(${color},${alpha})`, `rgba(${color},0)`]} style={StyleSheet.absoluteFill} />
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

/** The ground the bubbles drift above — reads differently per environment. */
const Floor = memo(function Floor({ env, w, h }: { env: EnvPalette; w: number; h: number }) {
  const floor = env.floor;
  if (!floor) return null;

  if (floor.kind === 'kelp') {
    return (
      <>
        <Kelp x={w * 0.06} h={170} lean={6} fill={floor.colors[0]} sway={2.2} />
        <Kelp x={w * 0.14} h={120} lean={-5} fill={floor.colors[1]} sway={0} />
        <Kelp x={w * 0.84} h={150} lean={-7} fill={floor.colors[0]} sway={1.8} dur={5200} />
      </>
    );
  }

  if (floor.kind === 'branch') {
    return (
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path
          d={`M${w + 6} 12 C ${w - 60} 26, ${w - 110} 62, ${w - 168} 96`}
          stroke={floor.colors[0]}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={`M${w - 96} 60 C ${w - 108} 40, ${w - 122} 28, ${w - 142} 22`}
          stroke={floor.colors[0]}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        {[
          { x: w - 74, y: 44, r: 7 },
          { x: w - 116, y: 72, r: 8 },
          { x: w - 148, y: 92, r: 6 },
          { x: w - 132, y: 26, r: 6.5 },
          { x: w - 44, y: 26, r: 5.5 },
        ].map((b, i) => (
          <G key={i}>
            <Circle cx={b.x} cy={b.y} r={b.r} fill={floor.colors[1]} opacity={0.9} />
            <Circle cx={b.x} cy={b.y} r={b.r * 0.28} fill="#FFF0D6" opacity={0.8} />
          </G>
        ))}
        <Path
          d={`M0 ${h} L0 ${h * 0.9} Q ${w * 0.5} ${h * 0.85}, ${w} ${h * 0.9} L${w} ${h} Z`}
          fill={floor.colors[0]}
          opacity={0.55}
        />
      </Svg>
    );
  }

  if (floor.kind === 'meadow') {
    const blades = Array.from({ length: 14 }, (_, i) => ({
      x: (i + 0.5) * (w / 14) + (((i * 37) % 11) - 5),
      len: 12 + ((i * 53) % 18),
      lean: (((i * 29) % 13) - 6) * 0.8,
    }));
    return (
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path
          d={`M0 ${h} L0 ${h * 0.84} Q ${w * 0.45} ${h * 0.78}, ${w} ${h * 0.84} L${w} ${h} Z`}
          fill={floor.colors[0]}
        />
        <Path
          d={`M0 ${h} L0 ${h * 0.93} Q ${w * 0.5} ${h * 0.885}, ${w} ${h * 0.93} L${w} ${h} Z`}
          fill={floor.colors[1]}
        />
        {blades.map((g, i) => (
          <Path
            key={i}
            d={`M${g.x} ${h} Q ${g.x + g.lean * 0.4} ${h - g.len * 0.55}, ${g.x + g.lean} ${h - g.len}`}
            stroke={floor.grass}
            strokeWidth={i % 4 ? 1.5 : 2}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </Svg>
    );
  }

  // water — a still lake with a broken band of reflected light
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={`M0 ${h} L0 ${h * 0.8} L${w} ${h * 0.8} L${w} ${h} Z`} fill={floor.colors[0]} />
      <Path d={`M0 ${h} L0 ${h * 0.9} L${w} ${h * 0.9} L${w} ${h} Z`} fill={floor.colors[1]} />
      {[0.83, 0.86, 0.89, 0.93, 0.97].map((f, i) => (
        <Ellipse
          key={f}
          cx={w * (0.5 + (i % 2 ? 0.05 : -0.04))}
          cy={h * f}
          rx={w * (0.1 + i * 0.055)}
          ry={1.4}
          fill={floor.shimmer}
          opacity={0.5 - i * 0.07}
        />
      ))}
    </Svg>
  );
});

/** Northern lights — three ribbons breathing across the sky. */
const Aurora = memo(function Aurora({ w, h, still }: { w: number; h: number; still: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (still) {
      p.value = 0.5;
      return;
    }
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 9000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [p, still]);

  const a = useAnimatedStyle(() => ({
    opacity: 0.2 + p.value * 0.28,
    transform: [{ translateX: -14 + p.value * 28 }, { scaleY: 0.9 + p.value * 0.2 }],
  }));
  const b = useAnimatedStyle(() => ({
    opacity: 0.32 - p.value * 0.16,
    transform: [{ translateX: 16 - p.value * 30 }, { scaleY: 1.05 - p.value * 0.15 }],
  }));

  const ribbon = (yf: number, amp: number) =>
    `M-40 ${h * yf} C ${w * 0.25} ${h * (yf - amp)}, ${w * 0.55} ${h * (yf + amp)}, ${w + 40} ${h * (yf - amp * 0.6)}`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, a]}>
        <Svg width={w} height={h}>
          <Path d={ribbon(0.3, 0.09)} stroke="#7DE8C0" strokeWidth={46} fill="none" opacity={0.22} strokeLinecap="round" />
          <Path d={ribbon(0.3, 0.09)} stroke="#BFF6E2" strokeWidth={16} fill="none" opacity={0.28} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, b]}>
        <Svg width={w} height={h}>
          <Path d={ribbon(0.42, 0.07)} stroke="#9FB8F2" strokeWidth={38} fill="none" opacity={0.2} strokeLinecap="round" />
          <Path d={ribbon(0.2, 0.05)} stroke="#C9A6EC" strokeWidth={26} fill="none" opacity={0.16} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
});

/** Full painting of one world: sky, light, floor. Two crossfade on a change. */
const Environment = memo(function Environment({
  env,
  w,
  h,
  still,
}: {
  env: EnvPalette;
  w: number;
  h: number;
  still: boolean;
}) {
  const c = env.celestial;
  const stars = useMemo(
    () =>
      env.life.stars
        ? Array.from({ length: 18 }, (_, i) => ({
            x: (((i * 61 + 13) % 97) / 97) * w,
            y: ((((i * 37 + 5) % 41) / 41) * 0.45) * h,
            r: 0.8 + ((i * 13) % 3) * 0.35,
          }))
        : [],
    [env.life.stars, w, h]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={env.sky} style={StyleSheet.absoluteFill} />
      <View style={[styles.bloomBlob, { backgroundColor: env.bloom, top: -120, left: -100, width: 380, height: 380 }]} />
      <View style={[styles.bloomBlob, { backgroundColor: env.bloom, bottom: -160, right: -80, width: 440, height: 440 }]} />

      {env.life.aurora && <Aurora w={w} h={h} still={still} />}

      {(stars.length > 0 || c) && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          {stars.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="rgba(255,250,235,0.7)" />
          ))}
          {c && (
            <>
              <Circle cx={w * c.x} cy={h * c.y} r={c.r * 2.4} fill={c.halo} />
              <Circle cx={w * c.x} cy={h * c.y} r={c.r} fill={c.color} opacity={0.95} />
              {c.kind === 'moon' && (
                <>
                  <Circle cx={w * c.x - c.r * 0.3} cy={h * c.y - c.r * 0.25} r={c.r * 0.2} fill="rgba(0,0,0,0.05)" />
                  <Circle cx={w * c.x + c.r * 0.25} cy={h * c.y + c.r * 0.25} r={c.r * 0.14} fill="rgba(0,0,0,0.045)" />
                </>
              )}
            </>
          )}
        </Svg>
      )}

      {env.rays && (
        <>
          <Ray left={w * 0.08} width={90} height={h * 0.85} tilt="14deg" color={env.rays.color} alpha={env.rays.alpha * 0.8} />
          <Ray
            left={w * 0.34}
            width={130}
            height={h * 0.95}
            tilt="18deg"
            color={env.rays.color}
            alpha={env.rays.alpha}
            breathe={!still}
          />
          <Ray left={w * 0.68} width={80} height={h * 0.7} tilt="22deg" color={env.rays.color} alpha={env.rays.alpha * 0.6} />
        </>
      )}

      <Floor env={env} w={w} h={h} />
    </View>
  );
});

/* ------------------------------ Ambient life ------------------------------ */

/** One parallax layer of far-off bubbles. Drawn twice for a seamless wrap. */
const BubbleField = memo(function BubbleField({
  w,
  h,
  color,
  cfg,
  still,
}: {
  w: number;
  h: number;
  color: string;
  cfg: (typeof FIELD_LAYERS)[number];
  still: boolean;
}) {
  const dots = useMemo(
    () =>
      Array.from({ length: cfg.count }, (_, i) => ({
        x: (((i * 73 + 17) % 101) / 101) * w,
        y: (((i * 47 + 11) % 89) / 89) * h,
        r: cfg.size * (0.6 + (((i * 29) % 7) / 7) * 0.7),
      })),
    [cfg, w, h]
  );
  const y = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    y.value = 0;
    y.value = withRepeat(withTiming(-h, { duration: cfg.dur, easing: Easing.linear }), -1);
    return () => cancelAnimation(y);
  }, [y, h, cfg.dur, still]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h * 2 }, style]}>
      <Svg width={w} height={h * 2}>
        {dots.map((d, i) => (
          <G key={i}>
            <Circle cx={d.x} cy={d.y} r={d.r} fill={color} opacity={cfg.alpha * 0.5} />
            <Circle cx={d.x} cy={d.y} r={d.r} stroke={color} strokeWidth={0.8} fill="none" opacity={cfg.alpha} />
            <Circle cx={d.x} cy={d.y + h} r={d.r} fill={color} opacity={cfg.alpha * 0.5} />
            <Circle cx={d.x} cy={d.y + h} r={d.r} stroke={color} strokeWidth={0.8} fill="none" opacity={cfg.alpha} />
          </G>
        ))}
      </Svg>
    </Animated.View>
  );
});

/** A mote drifting slowly upward — plankton, pollen, dust. */
const Mote = memo(function Mote({
  x,
  h,
  dur,
  delay,
  size,
  color,
  sway,
}: {
  x: number;
  h: number;
  dur: number;
  delay: number;
  size: number;
  color: string;
  sway: number;
}) {
  const y = useSharedValue(h + 10);
  const sx = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(-14, { duration: dur, easing: Easing.linear }), withTiming(h + 10, { duration: 0 })),
        -1
      )
    );
    if (sway > 0) {
      sx.value = withRepeat(
        withSequence(
          withTiming(sway, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
          withTiming(-sway, { duration: 3000, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    }
  }, [y, sx, h, dur, delay, sway]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: sx.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x, top: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
});

/** A blossom petal tumbling down the frame. */
const Petal = memo(function Petal({ w, h, seed }: { w: number; h: number; seed: number }) {
  const delaySeed = (seed * 9301 + 0.17) % 1;
  const y = useSharedValue(-30);
  const x = useSharedValue(0);
  const rot = useSharedValue(seed * 360);
  useEffect(() => {
    y.value = withDelay(
      delaySeed * 9000,
      withRepeat(
        withSequence(
          withTiming(h + 40, { duration: 11000 + ((seed * 9301) % 1) * 7000, easing: Easing.linear }),
          withTiming(-30, { duration: 0 })
        ),
        -1
      )
    );
    x.value = withRepeat(
      withSequence(
        withTiming(16 + seed * 24, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(-(16 + seed * 24), { duration: 2600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    rot.value = withRepeat(
      withSequence(withTiming(seed * 360 + 60, { duration: 3400 }), withTiming(seed * 360 - 60, { duration: 3400 })),
      -1,
      true
    );
  }, [y, x, rot, h, seed, delaySeed]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: x.value }, { rotate: `${rot.value}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 16 + seed * (w - 40), top: 0 }, style]}>
      <View style={styles.petal} />
    </Animated.View>
  );
});

/** Butterfly crossing the frame now and then. */
const Butterfly = memo(function Butterfly({ w, h, first }: { w: number; h: number; first: number }) {
  const [cycle, setCycle] = useState(0);
  const params = useMemo(
    () => ({
      y0: h * (0.12 + Math.random() * 0.4),
      amp: 26 + Math.random() * 34,
      dur: 7200 + Math.random() * 2800,
      wait: cycle === 0 ? first : 12000 + Math.random() * 16000,
      ltr: Math.random() > 0.4,
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
    flap.value = withRepeat(withTiming(1, { duration: 150, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [flap]);

  const style = useAnimatedStyle(() => {
    const q = p.value;
    const x = params.ltr ? -50 + q * (w + 100) : w + 50 - q * (w + 100);
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
        <Animated.View style={[styles.wing, { left: 0, backgroundColor: 'rgba(226,208,246,0.9)' }, wingL]} />
        <Animated.View style={[styles.wing, { left: 11, backgroundColor: 'rgba(255,222,214,0.9)' }, wingR]} />
        <View style={styles.bfBody} />
      </View>
    </Animated.View>
  );
});

/** Firefly with a layered halo, wandering on independent loops. */
const Firefly = memo(function Firefly({ w, h, seed }: { w: number; h: number; seed: number }) {
  const cfg = useMemo(
    () => ({
      sx: 20 + seed * (w - 40),
      sy: h * 0.35 + ((seed * 7919) % 1) * h * 0.45,
      dx: 30 + seed * 60,
      dy: 24 + ((seed * 104729) % 1) * 50,
      dur: 3600 + seed * 3200,
      pulse: 1400 + seed * 1600,
    }),
    [w, h, seed]
  );
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

/** A slow rainbow lens flare sliding across the glass. */
const Flare = memo(function Flare({ w, h }: { w: number; h: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 17000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 17000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.05 + Math.sin(p.value * Math.PI) * 0.13,
    transform: [{ translateX: -60 + p.value * (w + 40) }, { translateY: h * 0.1 + p.value * h * 0.28 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <Svg width={120} height={120}>
        <Circle cx={40} cy={40} r={26} fill="#FFD9A8" opacity={0.5} />
        <Circle cx={70} cy={62} r={16} fill="#A8CCF0" opacity={0.45} />
        <Circle cx={92} cy={84} r={9} fill="#F2B8D8" opacity={0.4} />
      </Svg>
    </Animated.View>
  );
});

/* -------------------------------- Bursts ---------------------------------- */

/** One particle of a special's burst; a shared progress drives the whole set. */
const BurstParticle = memo(function BurstParticle({
  angle,
  reach,
  progress,
  color,
  size,
  spin,
}: {
  angle: number;
  reach: number;
  progress: SharedValue<number>;
  color: string;
  size: number;
  spin: boolean;
}) {
  const rad = (angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const ease = 1 - Math.pow(1 - p, 2.4);
    return {
      opacity: p >= 1 ? 0 : (1 - p) * 0.95,
      transform: [
        { translateX: Math.cos(rad) * reach * ease },
        { translateY: Math.sin(rad) * reach * ease + 30 * p * p },
        { rotate: spin ? `${p * 220}deg` : '0deg' },
        { scale: 1 - p * 0.45 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: -size / 2,
          top: -size / 2,
          width: size,
          height: spin ? size * 1.5 : size,
          borderRadius: size,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
});

/**
 * The visible remains of a special pop, mounted at the pop site: a colour
 * burst plus a soft bloom of light. The bloom is a radial gradient rather
 * than a filled circle — a flat disc reads as a sticker, not as light.
 * Pruned by the scene's transient pool.
 */
const SpecialBurst = memo(function SpecialBurst({ kind, id }: { kind: SpecialKind; id: number }) {
  const meta = SPECIALS[kind];
  const p = useSharedValue(0);
  const bloom = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 1250, easing: Easing.out(Easing.quad) });
    bloom.value = withSequence(
      withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
    );
  }, [p, bloom]);

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloom.value * 0.75,
    transform: [{ scale: 0.4 + bloom.value * 1.9 }],
  }));

  const spin = kind === 'healing';
  const gid = `bt-burst-${id}`;
  return (
    <View pointerEvents="none" style={styles.burstRoot}>
      <Animated.View style={[styles.burstBloom, bloomStyle]}>
        <Svg width={128} height={128}>
          <Defs>
            <RadialGradient id={gid} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={meta.burst[meta.burst.length - 1]} stopOpacity="0.5" />
              <Stop offset="0.45" stopColor={meta.burst[0]} stopOpacity="0.22" />
              <Stop offset="1" stopColor={meta.burst[0]} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={64} cy={64} r={64} fill={`url(#${gid})`} />
        </Svg>
      </Animated.View>
      {BURST_PARTICLES.map((a, i) => (
        <BurstParticle
          key={a + '-' + i}
          angle={a + (i % 3) * 7}
          reach={78 + (i % 4) * 26}
          progress={p}
          color={meta.burst[i % meta.burst.length]}
          size={i % 3 === 0 ? 6 : 4}
          spin={spin}
        />
      ))}
    </View>
  );
});

/** A flower opening on the backdrop where a healing bubble let go. */
const TinyBloom = memo(function TinyBloom({ size, color, seed }: { size: number; color: string; seed: number }) {
  const open = useSharedValue(0);
  const fade = useSharedValue(1);
  const spin = useSharedValue(seed * 360);
  useEffect(() => {
    open.value = withDelay(seed * 220, withTiming(1, { duration: 620, easing: Easing.out(Easing.back(1.6)) }));
    spin.value = withRepeat(
      withSequence(
        withTiming(seed * 360 + 7, { duration: 3600, easing: Easing.inOut(Easing.quad) }),
        withTiming(seed * 360 - 7, { duration: 3600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    fade.value = withDelay(26000, withTiming(0.35, { duration: 12000 }));
  }, [open, fade, spin, seed]);
  const style = useAnimatedStyle(() => ({
    opacity: fade.value * open.value,
    transform: [{ scale: open.value }, { rotate: `${spin.value}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {[0, 72, 144, 216, 288].map((a) => (
          <Ellipse key={a} cx={20} cy={11} rx={5} ry={8} transform={`rotate(${a} 20 20)`} fill={color} opacity={0.85} />
        ))}
        <Circle cx={20} cy={20} r={3.4} fill="#FFE9BE" opacity={0.9} />
      </Svg>
    </Animated.View>
  );
});

/* -------------------------------- Bubble ---------------------------------- */

/** The little cargo that marks a special — a shape first, a colour second. */
const SpecialContents = memo(function SpecialContents({ kind, s }: { kind: SpecialKind; s: number }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: kind === 'galaxy' ? 14000 : 9000, easing: Easing.linear }), -1);
  }, [spin, kind]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  const c = s / 2;
  const r = s * 0.24;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={s} height={s}>
        {kind === 'healing' &&
          [0, 90, 180, 270].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <Ellipse
                key={a}
                cx={c + Math.cos(rad) * r}
                cy={c + Math.sin(rad) * r}
                rx={s * 0.075}
                ry={s * 0.045}
                fill="rgba(255,214,228,0.85)"
                transform={`rotate(${a} ${c + Math.cos(rad) * r} ${c + Math.sin(rad) * r})`}
              />
            );
          })}

        {(kind === 'golden' || kind === 'galaxy') &&
          [0, 72, 144, 216, 288].map((a, i) => {
            const rad = ((a + (kind === 'galaxy' ? 18 : 0)) * Math.PI) / 180;
            const rr = kind === 'galaxy' ? r * (0.5 + (i % 3) * 0.28) : r;
            const cx = c + Math.cos(rad) * rr;
            const cy = c + Math.sin(rad) * rr;
            const k = s * (kind === 'galaxy' ? 0.028 : 0.04);
            return (
              <Path
                key={a}
                d={`M${cx} ${cy - k} L${cx + k * 0.42} ${cy - k * 0.42} L${cx + k} ${cy} L${cx + k * 0.42} ${cy + k * 0.42} L${cx} ${cy + k} L${cx - k * 0.42} ${cy + k * 0.42} L${cx - k} ${cy} L${cx - k * 0.42} ${cy - k * 0.42} Z`}
                fill={kind === 'golden' ? 'rgba(255,231,170,0.9)' : 'rgba(232,240,255,0.9)'}
              />
            );
          })}

        {kind === 'glitter' &&
          [10, 70, 130, 190, 250, 310, 40, 220].map((a, i) => {
            const rad = (a * Math.PI) / 180;
            const rr = r * (0.45 + (i % 4) * 0.2);
            return (
              <Circle
                key={a}
                cx={c + Math.cos(rad) * rr}
                cy={c + Math.sin(rad) * rr}
                r={s * (i % 2 ? 0.014 : 0.022)}
                fill="rgba(255,255,255,0.92)"
              />
            );
          })}

        {kind === 'rainbow' &&
          ['#FF9DB0', '#FFD79A', '#A8E6BE', '#A8CCF0', '#C9AEE8'].map((col, i) => (
            <Circle
              key={col}
              cx={c}
              cy={c}
              r={r * 1.25 - i * (s * 0.028)}
              stroke={col}
              strokeWidth={s * 0.022}
              fill="none"
              opacity={0.55}
            />
          ))}

        {kind === 'aurora' && (
          <>
            <Path
              d={`M${c - r * 1.3} ${c + r * 0.4} Q ${c - r * 0.3} ${c - r * 0.9}, ${c + r * 1.3} ${c - r * 0.1}`}
              stroke="#A6F0D8"
              strokeWidth={s * 0.06}
              fill="none"
              opacity={0.7}
              strokeLinecap="round"
            />
            <Path
              d={`M${c - r * 1.2} ${c + r * 0.9} Q ${c} ${c - r * 0.2}, ${c + r * 1.2} ${c + r * 0.5}`}
              stroke="#D8B8F0"
              strokeWidth={s * 0.045}
              fill="none"
              opacity={0.6}
              strokeLinecap="round"
            />
          </>
        )}
      </Svg>
    </Animated.View>
  );
});

/**
 * One bubble: drifts, wobbles, waits to be touched.
 *
 * Motion is two sine currents at unrelated frequencies plus a slow vertical
 * rise, which is enough for paths to cross and separate organically without
 * any collision solver. Large bubbles rise slower than small ones. The
 * `wave*` shared values let a neighbour's special pop shimmer this bubble
 * without a single React re-render.
 */
const Bubble = memo(function Bubble({
  index,
  w,
  h,
  tint,
  breath,
  breathing,
  still,
  waveX,
  waveY,
  waveP,
  onPop,
}: {
  index: number;
  w: number;
  h: number;
  tint: Tint;
  breath: SharedValue<number>;
  breathing: boolean;
  still: boolean;
  waveX: SharedValue<number>;
  waveY: SharedValue<number>;
  waveP: SharedValue<number>;
  onPop: (x: number, y: number, kind: SpecialKind | null) => void;
}) {
  const [cycle, setCycle] = useState(0);
  const popping = useRef(false);

  const params = useMemo(() => {
    const size = 40 + Math.random() * 54;
    // Big bubbles are heavy: they climb slower and wobble less.
    const heft = (size - 40) / 54;
    return {
      size,
      x: 8 + Math.random() * Math.max(w - size - 16, 1),
      dur: (10000 + Math.random() * 7000) * (0.85 + heft * 0.5),
      swayA: 16 - heft * 8,
      swayDur: 2400 + Math.random() * 2600 + heft * 1400,
      wobbleDur: 1500 + Math.random() * 1400,
      special: rollSpecial(),
      spin: (Math.random() - 0.5) * 16,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, w]);

  const y = useSharedValue(h + 120);
  const sway = useSharedValue(0);
  const wobble = useSharedValue(0);
  const scaleV = useSharedValue(1);
  const stretch = useSharedValue(0);
  const burst = useSharedValue(1); // 1 = finished/hidden; 0→1 animates a pop
  const fizz = useSharedValue(0);

  const recycle = useCallback(() => setCycle((c) => c + 1), []);

  useEffect(() => {
    // The first cycle spreads bubbles up the screen so it never starts empty.
    const from = cycle === 0 ? h - (index + 0.5) * (h / BUBBLES) : h + params.size + 30;
    const to = -params.size - 40;
    y.value = from;
    const dur = params.dur * ((from - to) / (h + params.size + 70));
    y.value = withTiming(to, { duration: dur, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(recycle)();
    });
    return () => cancelAnimation(y);
  }, [cycle, params, h, index, y, recycle]);

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(params.swayA, { duration: params.swayDur, easing: Easing.inOut(Easing.quad) }),
        withTiming(-params.swayA, { duration: params.swayDur, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    // A second, faster current — the reason paths look wandering, not scripted.
    wobble.value = withRepeat(
      withSequence(
        withTiming(1, { duration: params.wobbleDur, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: params.wobbleDur, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    fizz.value = withDelay(
      index * 420,
      withRepeat(withTiming(1, { duration: 1500 + index * 180, easing: Easing.out(Easing.quad) }), -1)
    );
  }, [params, index, sway, wobble, fizz]);

  const pop = useCallback(() => {
    if (popping.current) return;
    popping.current = true;
    cancelAnimation(y);
    burst.value = 0;
    burst.value = withTiming(1, { duration: 440, easing: Easing.out(Easing.quad) });
    // Swell, let the membrane stretch, then collapse inward.
    scaleV.value = withSequence(
      withTiming(1.16, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0.88, { duration: 60, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.001, { duration: 95, easing: Easing.in(Easing.quad) })
    );
    stretch.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(-0.6, { duration: 60 }),
      withTiming(0, { duration: 95 })
    );
    onPop(params.x + params.size / 2, y.value + params.size / 2, params.special);
    setTimeout(() => {
      scaleV.value = 1;
      stretch.value = 0;
      popping.current = false;
      recycle();
    }, 480);
  }, [y, burst, scaleV, stretch, params, onPop, recycle]);

  const s = params.size;
  const r = s / 2 - 1.5;
  const circ = 2 * Math.PI * (r - 2);

  /**
   * Position, drift, breath and the neighbour-shimmer all resolve here so the
   * bubble costs one worklet per frame no matter what the scene is doing.
   */
  const wrapStyle = useAnimatedStyle(() => {
    const bx = params.x + sway.value + wobble.value * 7;
    const by = y.value;
    // A passing wave front lifts the bubble slightly as it goes by.
    let lift = 0;
    if (waveP.value < 1) {
      const d = Math.sqrt((bx + s / 2 - waveX.value) ** 2 + (by + s / 2 - waveY.value) ** 2);
      const front = waveP.value * WAVE_REACH;
      const band = 1 - Math.min(Math.abs(d - front) / 90, 1);
      lift = band * (1 - waveP.value);
    }
    const breathScale = breathing ? 0.94 + breath.value * 0.12 : 1;
    return {
      transform: [
        { translateX: bx },
        { translateY: by },
        { scale: breathScale * (1 + lift * 0.07) },
        { rotate: `${wobble.value * params.spin}deg` },
      ],
    };
  });

  const skinStyle = useAnimatedStyle(() => {
    let glow = 0;
    if (waveP.value < 1) {
      const bx = params.x + sway.value + wobble.value * 7 + s / 2;
      const by = y.value + s / 2;
      const d = Math.sqrt((bx - waveX.value) ** 2 + (by - waveY.value) ** 2);
      const front = waveP.value * WAVE_REACH;
      glow = (1 - Math.min(Math.abs(d - front) / 90, 1)) * (1 - waveP.value);
    }
    return {
      opacity: 0.86 + glow * 0.14,
      transform: [
        { scale: scaleV.value },
        { scaleX: 1 + stretch.value * 0.09 },
        { scaleY: 1 - stretch.value * 0.06 },
      ],
    };
  });

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
      transform: [{ translateY: (0.35 - p * 0.55) * s }],
    };
  });

  const special = params.special;
  const rim = special ? SPECIALS[special].burst[0] : tint.rim;

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: s, height: s }, wrapStyle]}>
      {/* Shockwave rings + mist */}
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { width: s, height: s, borderRadius: s / 2, borderColor: tint.glow }, ringStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ring2, { width: s, height: s, borderRadius: s / 2, borderColor: rim }, ring2Style]}
      />
      <Animated.View pointerEvents="none" style={[styles.mist, { width: s, height: s, borderRadius: s / 2 }, mistStyle]} />

      {/* Droplets */}
      {DROP_ANGLES.map((a, i) => (
        <Droplet key={a} angle={a} radius={s * 0.85} burst={burst} cx={s / 2} cy={s / 2} big={i % 2 === 0} color={tint.glow} />
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={special ? 'Pop a rare bubble' : 'Pop a bubble'}
        onPress={pop}
        hitSlop={10}
        style={{ width: s, height: s }}
      >
        <Animated.View style={[{ width: s, height: s }, skinStyle]}>
          <Svg width={s} height={s}>
            <Defs>
              {/* Unique per bubble — on web, svg ids share one document. */}
              <RadialGradient id={`bt-skin-${index}`} cx="35%" cy="30%" r="75%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.26" />
                <Stop offset="0.5" stopColor={tint.mid} stopOpacity="0.1" />
                <Stop offset="0.82" stopColor="#FFFFFF" stopOpacity="0.05" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.22" />
              </RadialGradient>
            </Defs>
            <Circle cx={s / 2} cy={s / 2} r={r} fill={`url(#bt-skin-${index})`} />
            {/* The rim always reads, whatever the sky or the viewer's colour vision. */}
            <Circle cx={s / 2} cy={s / 2} r={r} stroke={rim} strokeWidth={special ? 1.7 : 1.25} fill="none" />
            {/* Refracted arc along the upper-left rim */}
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

          {special && <SpecialContents kind={special} s={s} />}

          {/* Fizz mote rising inside the bubble */}
          {!still && <Animated.View pointerEvents="none" style={[styles.fizz, { left: s * 0.56, top: s * 0.5 }, fizzStyle]} />}
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

/* --------------------------------- Dock ----------------------------------- */

const DockChip = memo(function DockChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: 'breathe' | 'sound' | 'soundOff';
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.08 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      hitSlop={8}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 160 });
      }}
      onPress={onPress}
    >
      <Animated.View
        style={[styles.chip, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.11)' }, style]}
      >
        <Icon name={icon} size={19} color="rgba(255,255,255,0.95)" weight={active ? 1.15 : 1} />
      </Animated.View>
    </Pressable>
  );
});

/* -------------------------------- Scene ----------------------------------- */

interface Transient {
  id: number;
  x: number;
  y: number;
  kind: SpecialKind;
}

interface Bloom {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  seed: number;
}

const BubbleTherapy = () => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [envKey, setEnvKey] = useState<EnvKey>('ocean');
  const [prevEnvKey, setPrevEnvKey] = useState<EnvKey | null>(null);
  const [transients, setTransients] = useState<Transient[]>([]);
  const [blooms, setBlooms] = useState<Bloom[]>([]);
  const [breathing, setBreathing] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const idRef = useRef(1);
  const healRef = useRef(0);
  const { w, h } = size;

  const env = ENVIRONMENTS[envKey];
  const prevEnv = prevEnvKey ? ENVIRONMENTS[prevEnvKey] : null;
  const play = useAmbience(soundOn);

  // The shimmer wave every bubble reads — one ring, zero re-renders.
  const waveX = useSharedValue(0);
  const waveY = useSharedValue(0);
  const waveP = useSharedValue(1);
  // Warm light for golden/healing pops — a bloom from the pop, not a wash.
  const flash = useSharedValue(0);
  const [flashLight, setFlashLight] = useState({ color: '#FFD79A', x: 0.5, y: 0.5 });
  // Breath: inhale, hold, exhale, hold. Drives the world when breathing is on.
  const breath = useSharedValue(0);

  useEffect(() => {
    if (!breathing) {
      breath.value = withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) });
      return;
    }
    breath.value = 0;
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: BREATH.inhale, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: BREATH.hold1 }),
        withTiming(0, { duration: BREATH.exhale, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: BREATH.hold2 })
      ),
      -1
    );
    return () => cancelAnimation(breath);
  }, [breathing, breath]);

  const changeEnv = useCallback(
    (next: EnvKey) => {
      setEnvKey((cur) => {
        if (cur === next) return cur;
        setPrevEnvKey(cur);
        return next;
      });
    },
    []
  );

  /**
   * A bubble let go. Everything that follows is reward, never bookkeeping:
   * haptic, sound, and — if it was carrying something — a burst, a shimmer
   * wave through its neighbours, and for the deeper three, a new world.
   */
  const onPop = useCallback(
    (x: number, y: number, kind: SpecialKind | null) => {
      if (!kind) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        play('pop');
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      play('chime');

      const id = idRef.current++;
      setTransients((prev) => {
        const next = prev.length >= MAX_TRANSIENT ? prev.slice(prev.length - MAX_TRANSIENT + 1) : prev;
        return [...next, { id, x, y, kind }];
      });
      setTimeout(() => setTransients((prev) => prev.filter((t) => t.id !== id)), 1500);

      const meta = SPECIALS[kind];
      if (meta.wave) {
        waveX.value = x;
        waveY.value = y;
        waveP.value = 0;
        waveP.value = withTiming(1, { duration: 1150, easing: Easing.out(Easing.quad) });
      }

      if (kind === 'healing') {
        setFlashLight({ color: '#FFD9E4', x: w > 0 ? x / w : 0.5, y: h > 0 ? y / h : 0.5 });
        flash.value = withSequence(
          withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) })
        );
        setBlooms((prev) => {
          const trimmed = prev.length >= MAX_BLOOMS - 3 ? prev.slice(prev.length - MAX_BLOOMS + 4) : prev;
          const born = Array.from({ length: 3 }, () => {
            const seed = Math.random();
            return {
              id: idRef.current++,
              x: Math.min(w - 30, Math.max(10, x + (seed - 0.5) * 190)),
              y: Math.min(h - 40, Math.max(h * 0.5, y + (Math.random() - 0.3) * 200)),
              size: 24 + seed * 18,
              color: ['#FFC9D6', '#E6D2F2', '#FFE0C2'][Math.floor(seed * 3)],
              seed,
            };
          });
          return [...trimmed, ...born];
        });
        healRef.current += 1;
        changeEnv(HEALING_CYCLE[healRef.current % HEALING_CYCLE.length]);
      } else if (kind === 'golden') {
        setFlashLight({ color: '#FFD79A', x: w > 0 ? x / w : 0.5, y: h > 0 ? y / h : 0.5 });
        flash.value = withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 1700, easing: Easing.inOut(Easing.quad) })
        );
        changeEnv('sunset');
      } else if (kind === 'galaxy') {
        changeEnv('moonlit');
      } else if (kind === 'aurora') {
        changeEnv('aurora');
      }
    },
    [play, waveX, waveY, waveP, flash, changeEnv, w, h]
  );

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  // The whole world leans into the breath — scale only, no text, no counting.
  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathing ? 1 + breath.value * 0.035 : 1 }],
  }));

  const life = env.life;
  const density = reduced ? 0.4 : 1;
  const n = (count: number) => Math.round(count * density);

  const seeds = useMemo(() => Array.from({ length: 8 }, (_, i) => (i + 0.4) / 8.3), []);

  return (
    <View
      style={styles.root}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {/* The world — previous sky beneath, the new one fading in over it */}
      {w > 0 && prevEnv && <Environment env={prevEnv} w={w} h={h} still={reduced} />}
      {w > 0 && (
        <Animated.View key={envKey} entering={FadeIn.duration(2000)} style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, worldStyle]}>
            <Environment env={env} w={w} h={h} still={reduced} />
          </Animated.View>
        </Animated.View>
      )}

      {/* Depth: far bubbles drifting in parallax tiers */}
      {w > 0 &&
        FIELD_LAYERS.map((cfg, i) => (
          <BubbleField key={i} w={w} h={h} color={env.field} cfg={cfg} still={reduced} />
        ))}

      {/* Ambient life, re-cast for each world */}
      {w > 0 && (
        <Animated.View
          key={`life-${envKey}`}
          entering={FadeIn.duration(1200)}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {Array.from({ length: n(life.plankton) }).map((_, i) => (
            <Mote
              key={`pl-${i}`}
              x={w * (0.15 + i * 0.22)}
              h={h}
              dur={24000 + i * 4000}
              delay={i * 7000}
              size={2.5}
              color="rgba(200,230,245,0.4)"
              sway={0}
            />
          ))}
          {Array.from({ length: n(life.pollen) }).map((_, i) => (
            <Mote
              key={`po-${i}`}
              x={w * (0.08 + i * 0.17)}
              h={h}
              dur={17000 + i * 3200}
              delay={i * 4200}
              size={3.2}
              color="rgba(255,246,214,0.55)"
              sway={14}
            />
          ))}
          {Array.from({ length: n(life.petals) }).map((_, i) => (
            <Petal key={`pe-${i}`} w={w} h={h} seed={seeds[i % seeds.length]} />
          ))}
          {Array.from({ length: n(life.butterflies) }).map((_, i) => (
            <Butterfly key={`bu-${i}`} w={w} h={h} first={3000 + i * 9000} />
          ))}
          {Array.from({ length: n(life.fireflies) }).map((_, i) => (
            <Firefly key={`fi-${i}`} w={w} h={h} seed={seeds[i % seeds.length]} />
          ))}
          {life.flare && !reduced && <Flare w={w} h={h} />}
        </Animated.View>
      )}

      {/* Flowers left behind by healing bubbles */}
      {blooms.map((b) => (
        <View key={b.id} pointerEvents="none" style={{ position: 'absolute', left: b.x, top: b.y }}>
          <TinyBloom size={b.size} color={b.color} seed={b.seed} />
        </View>
      ))}

      {/* The bubbles themselves */}
      {w > 0 &&
        Array.from({ length: BUBBLES }).map((_, i) => (
          <Bubble
            key={i}
            index={i}
            w={w}
            h={h}
            tint={env.tints[i % env.tints.length]}
            breath={breath}
            breathing={breathing}
            still={reduced}
            waveX={waveX}
            waveY={waveY}
            waveP={waveP}
            onPop={onPop}
          />
        ))}

      {/* What a special left behind */}
      {transients.map((t) => (
        <View key={t.id} pointerEvents="none" style={{ position: 'absolute', left: t.x, top: t.y }}>
          <SpecialBurst kind={t.kind} id={t.id} />
        </View>
      ))}

      {/* Warm light spreading from a healing or golden pop */}
      {w > 0 && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, flashStyle]}>
          <Svg width={w} height={h}>
            <Defs>
              <RadialGradient id="bt-flash" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={flashLight.color} stopOpacity="0.32" />
                <Stop offset="0.55" stopColor={flashLight.color} stopOpacity="0.12" />
                <Stop offset="1" stopColor={flashLight.color} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx={w * flashLight.x}
              cy={h * flashLight.y}
              rx={w * 1.15}
              ry={h * 0.75}
              fill="url(#bt-flash)"
            />
          </Svg>
        </Animated.View>
      )}

      {/* Dock */}
      <View style={[styles.dock, { bottom: insets.bottom + SPACE.lg }]} pointerEvents="box-none">
        <BlurView intensity={26} tint="dark" style={styles.dockInner}>
          <DockChip
            icon="breathe"
            label={breathing ? 'Stop breathing guide' : 'Breathe with the bubbles'}
            active={breathing}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setBreathing((v) => !v);
            }}
          />
          {HAS_AUDIO && (
            <DockChip
              icon={soundOn ? 'sound' : 'soundOff'}
              label={soundOn ? 'Mute sounds' : 'Unmute sounds'}
              onPress={() => setSoundOn((v) => !v)}
            />
          )}
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#0E1D26' },
  bloomBlob: { position: 'absolute', borderRadius: 999 },
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
  burstRoot: { width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  burstBloom: { position: 'absolute', left: -64, top: -64, width: 128, height: 128 },
  petal: {
    width: 7,
    height: 9,
    borderRadius: 6,
    backgroundColor: 'rgba(255,206,220,0.85)',
  },
  wing: { position: 'absolute', width: 11, height: 15, borderRadius: 7 },
  bfBody: {
    position: 'absolute',
    left: 10,
    top: 3,
    width: 2,
    height: 11,
    borderRadius: 1,
    backgroundColor: 'rgba(74,62,58,0.75)',
  },
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
  fireflyCore: { width: 4.5, height: 4.5, borderRadius: 3, backgroundColor: '#FFE7A3' },
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  dockInner: {
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  chip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BubbleTherapy;
