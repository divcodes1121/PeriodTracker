import { ReactNode, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  G,
  Path,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
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
import {
  PIECES,
  PIECE_BOX,
  crackCumulative,
  crackPath,
  nearestOnCrack,
  pointAtT,
} from '../utils/kintsugi';

/**
 * Kintsugi — a quiet act of restoration.
 *
 * A broken ceramic piece rests in a studio at golden hour. Tracing a fracture
 * with a finger draws liquid gold along it: the seam lights, gold flows to
 * catch up with the fingertip, and a bright droplet rides the leading edge.
 * Nothing here can be done wrong. Tracing is deliberately forgiving (a wide
 * catch radius, no need to start at either end) and gold only ever advances —
 * a crack cannot be un-filled, and a wandering finger costs nothing.
 *
 * Filling every seam plays a completion ritual — the piece glows, turns slowly
 * to catch the light, blossom drifts past — and then a *different* piece fades
 * in, so the session never dead-ends. There is no percentage, no counter and
 * no reward beyond the mended object itself. The check-out card arrives on the
 * player's own schedule, exactly as it does for every other escape.
 *
 * Geometry and the per-frame tracing math live in utils/kintsugi.ts, RN-free
 * and node-tested, carrying `'worklet'` so the same tested code runs on the UI
 * thread. Rendering is SVG + Reanimated like every other scene — Skia is not a
 * dependency here, and the gold seams are strokeDashoffset reveals, which is
 * both cheaper and sharper than a shader would be at this scale.
 */

/* ------------------------------- Ambience --------------------------------- */

/**
 * Audio registry — ships EMPTY on purpose (no bundled sound assets yet).
 * Drop files into src/escapes/audio/ and register them here, e.g.:
 *
 *   wind:   require('./audio/kintsugi-wind.mp3'),    // looping soft wind
 *   paper:  require('./audio/kintsugi-paper.mp3'),   // looping paper ambience
 *   brush:  require('./audio/kintsugi-brush.mp3'),   // looping ceramic brushing
 *   chime:  require('./audio/kintsugi-chime.mp3'),   // one-shot per mended seam
 *
 * The plumbing below is complete: loops start on entry, a mute chip appears,
 * and each finished seam strikes the chime. Haptics carry feedback until then.
 */
const KINTSUGI_AUDIO: Partial<Record<'wind' | 'paper' | 'brush' | 'chime', number>> = {};
const HAS_AUDIO = Object.values(KINTSUGI_AUDIO).some((v) => v != null);

/** Looping studio ambience + a seam chime. Wired, silent until assets exist. */
function useAmbience(enabled: boolean) {
  const chimeRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    if (!enabled || !HAS_AUDIO) return;
    const players: AudioPlayer[] = [];
    (['wind', 'paper', 'brush'] as const).forEach((k) => {
      const src = KINTSUGI_AUDIO[k];
      if (src == null) return;
      try {
        const p = createAudioPlayer(src);
        p.loop = true;
        p.volume = k === 'wind' ? 0.4 : 0.24;
        p.play();
        players.push(p);
      } catch {
        // A missing/corrupt asset must never break the studio.
      }
    });
    if (KINTSUGI_AUDIO.chime != null) {
      try {
        const c = createAudioPlayer(KINTSUGI_AUDIO.chime);
        c.volume = 0.4;
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

/* -------------------------------- Palette --------------------------------- */

const STUDIO = ['#EFE3CE', '#E7D8BE', '#DBC8A9'] as const;
const CERAMIC_LIGHT = '#FBF5EA';
const CERAMIC = '#F1E7D6';
const CERAMIC_SHADE = '#DFD0B8';
const CERAMIC_EDGE = 'rgba(122,101,74,0.28)';
const FRACTURE = 'rgba(112,92,66,0.42)';
const GOLD = '#C9A227';
const GOLD_LIGHT = '#F2D98A';
const GOLD_CORE = '#FBEFC4';
const INK = 'rgba(78,64,46,0.5)';
const PETAL = ['#F0CBD6', '#F7DCE4', '#E8B9C9'];

/** Generous catch radius in piece units — precision is never the point. */
const FORGIVE = 24;
/** Cap on how fast gold may advance per frame, so it flows instead of jumping. */
const FLOW_STEP = 0.05;
const MAX_MOTES = 16;
const MAX_PETALS = 14;
const CELEBRATE_MS = 7200;

/* ------------------------------ Ceramic art ------------------------------- */

/**
 * The six bodies, drawn in the shared 200×200 piece space so the crack
 * polylines in utils/kintsugi.ts line up with them. Each is built from a
 * lit face plus a shade pass, which is what makes flat vector shapes read as
 * thrown ceramic rather than stickers.
 */
const PIECE_ART: Record<string, ReactNode> = {
  cup: (
    <G>
      <Path
        d="M152 88 Q182 92 180 112 Q178 132 152 132"
        stroke={CERAMIC_SHADE}
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
      />
      <Path d="M48 72 L56 140 Q60 154 100 154 Q140 154 144 140 L152 72 Z" fill="url(#k-body)" />
      <Path d="M120 74 L136 74 L129 141 Q126 150 112 152 Q126 146 128 138 Z" fill={CERAMIC_SHADE} opacity={0.55} />
      <Ellipse cx={100} cy={72} rx={52} ry={10} fill={CERAMIC_LIGHT} />
      <Ellipse cx={100} cy={72} rx={52} ry={10} fill="none" stroke={CERAMIC_EDGE} strokeWidth={1.2} />
      <Ellipse cx={100} cy={73} rx={43} ry={7} fill={CERAMIC_SHADE} opacity={0.45} />
    </G>
  ),
  bowl: (
    <G>
      <Path d="M28 78 Q30 150 100 152 Q170 150 172 78 Z" fill="url(#k-body)" />
      <Path d="M140 80 L168 80 Q166 138 116 149 Q152 132 152 80 Z" fill={CERAMIC_SHADE} opacity={0.5} />
      <Ellipse cx={100} cy={78} rx={72} ry={14} fill={CERAMIC_LIGHT} />
      <Ellipse cx={100} cy={78} rx={72} ry={14} fill="none" stroke={CERAMIC_EDGE} strokeWidth={1.2} />
      <Ellipse cx={100} cy={79} rx={62} ry={10} fill={CERAMIC_SHADE} opacity={0.42} />
    </G>
  ),
  vase: (
    <G>
      <Path
        d="M86 42 Q84 58 78 66 Q46 84 46 122 Q46 166 100 166 Q154 166 154 122 Q154 84 122 66 Q116 58 114 42 Z"
        fill="url(#k-body)"
      />
      <Path d="M120 68 Q152 86 152 122 Q152 158 106 165 Q140 152 140 120 Q140 88 112 70 Z" fill={CERAMIC_SHADE} opacity={0.5} />
      <Ellipse cx={100} cy={42} rx={14} ry={5} fill={CERAMIC_LIGHT} />
      <Ellipse cx={100} cy={42} rx={14} ry={5} fill="none" stroke={CERAMIC_EDGE} strokeWidth={1.1} />
    </G>
  ),
  lantern: (
    <G>
      <Path d="M70 50 Q52 62 52 100 Q52 138 70 150 L130 150 Q148 138 148 100 Q148 62 130 50 Z" fill="url(#k-body)" />
      <Path d="M126 52 Q144 64 144 100 Q144 136 126 148 L112 148 Q132 134 132 100 Q132 66 112 52 Z" fill={CERAMIC_SHADE} opacity={0.5} />
      <Path d="M64 50 L136 50 L126 38 L74 38 Z" fill={CERAMIC_LIGHT} stroke={CERAMIC_EDGE} strokeWidth={1.1} />
      <Path d="M76 150 L124 150 L128 162 L72 162 Z" fill={CERAMIC_LIGHT} stroke={CERAMIC_EDGE} strokeWidth={1.1} />
      <Path d="M52 100 H148" stroke={CERAMIC_EDGE} strokeWidth={1} opacity={0.4} />
    </G>
  ),
  plate: (
    <G>
      <Circle cx={100} cy={100} r={70} fill="url(#k-body)" />
      <Path d="M100 30a70 70 0 0 1 0 140 70 70 0 0 0 0-140z" fill={CERAMIC_SHADE} opacity={0.42} />
      <Circle cx={100} cy={100} r={70} fill="none" stroke={CERAMIC_EDGE} strokeWidth={1.3} />
      <Circle cx={100} cy={100} r={54} fill={CERAMIC_LIGHT} opacity={0.7} />
      <Circle cx={100} cy={100} r={54} fill="none" stroke={CERAMIC_EDGE} strokeWidth={1} opacity={0.7} />
    </G>
  ),
  bird: (
    <G>
      <Path d="M58 134 Q36 138 26 128 Q44 122 52 112 Z" fill={CERAMIC_SHADE} />
      <Path
        d="M58 134 Q46 110 64 92 Q82 76 106 82 Q128 88 134 110 Q140 134 120 144 Q88 154 58 134 Z"
        fill="url(#k-body)"
      />
      <Path d="M118 92 Q136 106 132 126 Q128 140 114 144 Q126 132 124 112 Z" fill={CERAMIC_SHADE} opacity={0.5} />
      <Path d="M76 106 Q96 96 116 104 Q104 122 84 122 Z" fill={CERAMIC_SHADE} opacity={0.45} />
      <Circle cx={126} cy={74} r={16} fill={CERAMIC_LIGHT} />
      <Circle cx={126} cy={74} r={16} fill="none" stroke={CERAMIC_EDGE} strokeWidth={1.1} />
      <Path d="M141 70 L158 76 L141 82 Z" fill="#D8B98A" />
      <Circle cx={131} cy={70} r={2.2} fill={INK} />
    </G>
  ),
};

/* --------------------------------- Seams ---------------------------------- */

const APath = Animated.createAnimatedComponent(Path);
const ACircle = Animated.createAnimatedComponent(Circle);

/**
 * One fracture. Three passes stacked: the dry break (always visible, so the
 * piece reads as broken before anything is traced), a wide gold bloom, and a
 * bright core — the latter two revealed by animating `strokeDashoffset` from
 * full length down to zero, which is how the gold appears to *flow* along the
 * seam rather than fade in along its whole length at once.
 */
const Seam = memo(function Seam({
  pts,
  fill,
  glow,
}: {
  pts: number[];
  fill: SharedValue<number>;
  glow: SharedValue<number>;
}) {
  const d = useMemo(() => crackPath(pts), [pts]);
  const cum = useMemo(() => crackCumulative(pts), [pts]);
  const len = cum[cum.length - 1];

  const dash = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - fill.value) }));
  const bloomProps = useAnimatedProps(() => ({
    strokeDashoffset: len * (1 - fill.value),
    strokeOpacity: 0.16 + glow.value * 0.3,
  }));

  // The wet leading edge: a bright droplet sitting where the gold has reached,
  // hidden at rest and once the seam is whole.
  const head = useAnimatedProps(() => {
    const f = fill.value;
    const p = pointAtT(pts, cum, f);
    return {
      cx: p.x,
      cy: p.y,
      opacity: f <= 0.001 || f >= 0.999 ? 0 : 0.9,
    };
  });

  return (
    <G>
      <Path d={d} stroke={FRACTURE} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <APath
        d={d}
        stroke={GOLD_LIGHT}
        strokeWidth={11}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        animatedProps={bloomProps}
      />
      <APath
        d={d}
        stroke={GOLD}
        strokeWidth={4.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        animatedProps={dash}
      />
      <APath
        d={d}
        stroke={GOLD_CORE}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        animatedProps={dash}
      />
      <ACircle r={3.6} fill={GOLD_CORE} animatedProps={head} />
    </G>
  );
});

/* ------------------------------- Particles -------------------------------- */

interface Mote {
  id: number;
  x: number;
  y: number;
  seed: number;
}

/** A fleck of gold lifting off a freshly mended seam. */
const GoldMote = memo(function GoldMote({ seed }: { seed: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 2600 + seed * 1400, easing: Easing.out(Easing.quad) });
  }, [p, seed]);
  const style = useAnimatedStyle(() => {
    const q = p.value;
    return {
      opacity: q >= 1 ? 0 : Math.sin(q * Math.PI) * 0.9,
      transform: [
        { translateY: -q * (34 + seed * 40) },
        { translateX: Math.sin(q * Math.PI * 2 + seed * 6) * (5 + seed * 7) },
        { scale: 1 - q * 0.4 },
      ],
    };
  });
  const s = 2.4 + seed * 2.2;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ width: s, height: s, borderRadius: s / 2, backgroundColor: GOLD_LIGHT }, style]}
    />
  );
});

/** Cherry blossom drifting across the studio during the completion ritual. */
const Petal = memo(function Petal({ w, h, seed }: { w: number; h: number; seed: number }) {
  const p = useSharedValue(0);
  const rot = useSharedValue(seed * 360);
  useEffect(() => {
    p.value = withDelay(
      seed * 2600,
      withTiming(1, { duration: 8000 + seed * 5000, easing: Easing.linear })
    );
    rot.value = withRepeat(
      withSequence(
        withTiming(seed * 360 + 60, { duration: 2600 }),
        withTiming(seed * 360 - 60, { duration: 2600 })
      ),
      -1,
      true
    );
  }, [p, rot, seed]);
  const style = useAnimatedStyle(() => {
    const q = p.value;
    return {
      opacity: q <= 0 || q >= 1 ? 0 : Math.min(1, Math.sin(q * Math.PI) * 2.4),
      transform: [
        { translateX: -30 + q * (w + 60) },
        { translateY: h * (0.1 + seed * 0.5) + Math.sin(q * Math.PI * 2.4) * 46 },
        { rotate: `${rot.value}deg` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.petalWrap, style]}>
      <Svg width={15} height={16} viewBox="0 0 15 16">
        {/* A rounded blossom petal with a notched tip — a thin crescent reads
            as a stray line once it is drifting at this size. */}
        <Path
          d="M7.5 0 Q14 4.5 13 10 Q11.5 15 7.5 13.4 Q3.5 15 2 10 Q1 4.5 7.5 0 Z"
          fill={PETAL[Math.floor(seed * PETAL.length) % PETAL.length]}
        />
      </Svg>
    </Animated.View>
  );
});

/** Studio dust turning slowly in the window light. */
const DustMote = memo(function DustMote({ w, h, seed }: { w: number; h: number; seed: number }) {
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const o = useSharedValue(0.2);
  useEffect(() => {
    const dur = 15000 + seed * 12000;
    y.value = withDelay(
      seed * 7000,
      withRepeat(
        withSequence(
          withTiming(-h * 0.5, { duration: dur, easing: Easing.linear }),
          withTiming(0, { duration: 0 })
        ),
        -1
      )
    );
    x.value = withRepeat(
      withSequence(
        withTiming(16 + seed * 20, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
        withTiming(-(16 + seed * 20), { duration: 4200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    o.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.12, { duration: 3000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [y, x, o, h, seed]);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value }, { translateX: x.value }],
  }));
  const s = 2 + seed * 2.4;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 12 + seed * (w - 24),
          top: h * (0.45 + seed * 0.5),
          width: s,
          height: s,
          borderRadius: s / 2,
          backgroundColor: 'rgba(255,246,222,0.85)',
        },
        style,
      ]}
    />
  );
});

/** A butterfly crossing the studio now and then. */
const Butterfly = memo(function Butterfly({ w, h, first }: { w: number; h: number; first: number }) {
  const [cycle, setCycle] = useState(0);
  const params = useMemo(
    () => ({
      y0: h * (0.16 + Math.random() * 0.24),
      amp: 24 + Math.random() * 30,
      dur: 9000 + Math.random() * 4000,
      wait: cycle === 0 ? first : 18000 + Math.random() * 20000,
      ltr: Math.random() > 0.45,
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
    flap.value = withRepeat(withTiming(1, { duration: 170, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [flap]);

  const style = useAnimatedStyle(() => {
    const q = p.value;
    const x = params.ltr ? -40 + q * (w + 80) : w + 40 - q * (w + 80);
    return {
      opacity: q === 0 ? 0 : Math.min(1, Math.sin(q * Math.PI) * 3),
      transform: [
        { translateX: x },
        { translateY: params.y0 + Math.sin(q * Math.PI * 3) * params.amp },
        { scaleX: params.ltr ? 1 : -1 },
      ],
    };
  });
  const wingL = useAnimatedStyle(() => ({ transform: [{ scaleX: 0.4 + flap.value * 0.6 }] }));
  const wingR = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 - flap.value * 0.6 }] }));

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <View style={{ width: 20, height: 14 }}>
        <Animated.View style={[styles.wing, { left: 0, backgroundColor: 'rgba(233,196,214,0.85)' }, wingL]} />
        <Animated.View style={[styles.wing, { left: 10, backgroundColor: 'rgba(244,222,198,0.85)' }, wingR]} />
        <View style={styles.bfBody} />
      </View>
    </Animated.View>
  );
});

/* --------------------------------- Scene ---------------------------------- */

const DUST_SEEDS = Array.from({ length: 12 }, (_, i) => (i + 0.4) / 12.3);
const PETAL_SEEDS = Array.from({ length: MAX_PETALS }, (_, i) => (i + 0.3) / MAX_PETALS);
/** Room for the widest piece; every piece uses five, but the pool is fixed. */
const MAX_SEAMS = 8;

const Kintsugi = () => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [pieceIndex, setPieceIndex] = useState(() => Math.floor(Math.random() * PIECES.length));
  const [motes, setMotes] = useState<Mote[]>([]);
  const [done, setDone] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const moteId = useRef(1);
  const { w, h } = size;

  const piece = PIECES[pieceIndex];
  const cracks = piece.cracks;

  // A fixed pool of progress values — hooks can't be conditional, and the
  // piece can change mid-session.
  const f0 = useSharedValue(0);
  const f1 = useSharedValue(0);
  const f2 = useSharedValue(0);
  const f3 = useSharedValue(0);
  const f4 = useSharedValue(0);
  const f5 = useSharedValue(0);
  const f6 = useSharedValue(0);
  const f7 = useSharedValue(0);
  const fills = useMemo(() => [f0, f1, f2, f3, f4, f5, f6, f7], [f0, f1, f2, f3, f4, f5, f6, f7]);

  const glow = useSharedValue(0);
  const shine = useSharedValue(0);
  const turn = useSharedValue(0);
  const pieceOpacity = useSharedValue(0);
  const lastHaptic = useSharedValue(0);
  /** Latches once the ritual starts, so a still-moving finger can't re-fire it. */
  const finished = useSharedValue(0);

  const chime = useAmbience(soundOn);

  // Piece box: generous, but leaves the studio visible around it.
  const scale = useMemo(() => (w > 0 ? Math.min(w * 0.82, h * 0.5) / PIECE_BOX : 1), [w, h]);
  const originX = w / 2 - (PIECE_BOX * scale) / 2;
  const originY = h * 0.48 - (PIECE_BOX * scale) / 2;

  const cumulatives = useMemo(() => cracks.map((c) => crackCumulative(c)), [cracks]);

  // Fade each piece in as it arrives.
  useEffect(() => {
    pieceOpacity.value = 0;
    pieceOpacity.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
  }, [pieceIndex, pieceOpacity]);

  const pulse = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const spawnMote = useCallback((x: number, y: number) => {
    setMotes((prev) => {
      const next = prev.length >= MAX_MOTES ? prev.slice(prev.length - MAX_MOTES + 1) : prev;
      return [...next, { id: moteId.current++, x, y, seed: Math.random() }];
    });
  }, []);

  /** A seam just became whole. */
  const onSeamDone = useCallback(
    (x: number, y: number) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      chime();
      glow.value = withSequence(
        withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
        withTiming(0.35, { duration: 1400 })
      );
      spawnMote(x, y);
      spawnMote(x, y);
    },
    [chime, glow, spawnMote]
  );

  /** Every seam is whole — the restoration ritual. */
  const onAllDone = useCallback(() => {
    setDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    glow.value = withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) });
    shine.value = withSequence(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.45, { duration: 2600 })
    );
    if (!reduced) {
      // Turn slowly to catch the light — never far enough to read edge-on.
      turn.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.quad) }),
          withTiming(-1, { duration: 3400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    }
  }, [glow, shine, turn, reduced]);

  // After the ritual, a different piece arrives. The session never dead-ends,
  // and the check-out card still comes on the player's own schedule.
  useEffect(() => {
    if (!done) return;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const t = setTimeout(() => {
      pieceOpacity.value = withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) });
      swap = setTimeout(() => {
        fills.forEach((f) => (f.value = 0));
        glow.value = withTiming(0, { duration: 600 });
        shine.value = withTiming(0, { duration: 600 });
        turn.value = withTiming(0, { duration: 600 });
        finished.value = 0;
        setMotes([]);
        setDone(false);
        // Always a different piece than the one just mended.
        setPieceIndex((i) => (i + 1 + Math.floor(Math.random() * (PIECES.length - 1))) % PIECES.length);
      }, 950);
    }, CELEBRATE_MS);
    return () => {
      clearTimeout(t);
      if (swap) clearTimeout(swap);
    };
  }, [done, fills, glow, shine, turn, pieceOpacity, finished]);

  /**
   * Tracing. Runs entirely on the UI thread: map the touch into piece space,
   * ask each unfinished seam how close the finger is and how far along it
   * sits, then let the gold creep toward that point at a capped rate. Gold
   * only ever advances. `runOnJS` fires solely for haptics and seam events.
   */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onUpdate((e) => {
          if (scale <= 0 || finished.value === 1) return;
          const lx = (e.x - originX) / scale;
          const ly = (e.y - originY) / scale;
          let touched = false;
          let allDone = true;

          for (let i = 0; i < cracks.length; i++) {
            const cur = fills[i].value;
            if (cur >= 1) continue;
            const r = nearestOnCrack(cracks[i], cumulatives[i], lx, ly);
            if (r.dist < FORGIVE && r.t > cur) {
              const next = r.t < cur + FLOW_STEP ? r.t : cur + FLOW_STEP;
              if (next >= 0.985) {
                fills[i].value = 1;
                const end = pointAtT(cracks[i], cumulatives[i], 1);
                runOnJS(onSeamDone)(originX + end.x * scale, originY + end.y * scale);
              } else {
                fills[i].value = next;
                touched = true;
              }
            }
            if (fills[i].value < 1) allDone = false;
          }

          if (touched) {
            const now = Date.now();
            if (now - lastHaptic.value > 130) {
              lastHaptic.value = now;
              runOnJS(pulse)();
            }
          }
          if (allDone && finished.value === 0) {
            finished.value = 1;
            runOnJS(onAllDone)();
          }
        }),
    [cracks, cumulatives, fills, originX, originY, scale, onSeamDone, onAllDone, pulse, lastHaptic, finished]
  );

  // The piece: fades in, glows as it mends, turns during the ritual.
  const pieceStyle = useAnimatedStyle(() => ({
    opacity: pieceOpacity.value,
    transform: [{ perspective: 900 }, { rotateY: `${turn.value * 20}deg` }, { scale: 1 + glow.value * 0.012 }],
  }));
  const haloProps = useAnimatedProps(() => ({ opacity: glow.value * 0.6 }));
  const sunStyle = useAnimatedStyle(() => ({ opacity: 0.18 + shine.value * 0.32 }));

  const dustCount = reduced ? 4 : DUST_SEEDS.length;

  return (
    <GestureDetector gesture={pan}>
      <View
        style={styles.root}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <LinearGradient colors={STUDIO} style={StyleSheet.absoluteFill} />

        {/* Paper window light falling across the studio */}
        {w > 0 && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, sunStyle]}>
            <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
              <Defs>
                <SvgLinearGradient id="k-ray" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FFF3D2" stopOpacity="0.85" />
                  <Stop offset="1" stopColor="#FFF3D2" stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Path d={`M0 0 L${w * 0.52} 0 L${w * 0.14} ${h} L0 ${h * 0.72} Z`} fill="url(#k-ray)" />
              <Path d={`M${w * 0.6} 0 L${w * 0.86} 0 L${w * 0.44} ${h} L${w * 0.26} ${h} Z`} fill="url(#k-ray)" opacity={0.55} />
            </Svg>
          </Animated.View>
        )}

        {/* Rice-paper grain */}
        {w > 0 && (
          <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
            {Array.from({ length: 46 }, (_, i) => {
              const gx = ((i * 71 + 13) % 97) / 97;
              const gy = ((i * 37 + 7) % 89) / 89;
              return (
                <Circle
                  key={i}
                  cx={gx * w}
                  cy={gy * h}
                  r={((i * 13) % 3) * 0.5 + 0.7}
                  fill="rgba(126,104,74,0.07)"
                />
              );
            })}
          </Svg>
        )}

        {/* Studio dust */}
        {h > 0 && DUST_SEEDS.slice(0, dustCount).map((s, i) => <DustMote key={i} w={w} h={h} seed={s} />)}
        {w > 0 && !reduced && <Butterfly w={w} h={h} first={14000} />}

        {/* The piece */}
        {w > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', left: originX, top: originY }, pieceStyle]}
          >
            <Svg width={PIECE_BOX * scale} height={PIECE_BOX * scale} viewBox={`0 0 ${PIECE_BOX} ${PIECE_BOX}`}>
              <Defs>
                <SvgLinearGradient id="k-body" x1="0" y1="0" x2="0.4" y2="1">
                  <Stop offset="0" stopColor={CERAMIC_LIGHT} />
                  <Stop offset="0.55" stopColor={CERAMIC} />
                  <Stop offset="1" stopColor={CERAMIC_SHADE} />
                </SvgLinearGradient>
                <RadialGradient id="k-glow" cx="0.5" cy="0.5" r="0.5">
                  <Stop offset="0" stopColor={GOLD_LIGHT} stopOpacity="0.85" />
                  <Stop offset="0.55" stopColor={GOLD_LIGHT} stopOpacity="0.35" />
                  <Stop offset="1" stopColor={GOLD_LIGHT} stopOpacity="0" />
                </RadialGradient>
              </Defs>

              {/* Contact shadow, so the piece sits on a surface */}
              <Ellipse cx={100} cy={176} rx={62} ry={9} fill="rgba(104,84,58,0.16)" />

              {/* The mended piece's own warmth, soft-edged so it reads as bloom */}
              <ACircle cx={100} cy={100} r={98} fill="url(#k-glow)" animatedProps={haloProps} />

              <G key={piece.id}>{PIECE_ART[piece.id]}</G>

              {cracks.map((c, i) => (
                <Seam key={`${piece.id}-${i}`} pts={c} fill={fills[i]} glow={glow} />
              ))}
            </Svg>
          </Animated.View>
        )}

        {/* Gold lifting off the mended seams */}
        {motes.map((m) => (
          <View key={m.id} pointerEvents="none" style={{ position: 'absolute', left: m.x, top: m.y }}>
            <GoldMote seed={m.seed} />
          </View>
        ))}

        {/* Blossom, only while the restored piece is being admired */}
        {done && w > 0 && (
          <Animated.View
            entering={FadeIn.duration(700)}
            exiting={FadeOut.duration(500)}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {PETAL_SEEDS.slice(0, reduced ? 5 : MAX_PETALS).map((s, i) => (
              <Petal key={i} w={w} h={h} seed={s} />
            ))}
          </Animated.View>
        )}

        {HAS_AUDIO && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={soundOn ? 'Mute sounds' : 'Unmute sounds'}
            onPress={() => setSoundOn((v) => !v)}
            hitSlop={10}
            style={[styles.soundChip, { bottom: insets.bottom + SPACE.lg }]}
          >
            <Icon name={soundOn ? 'sound' : 'soundOff'} size={17} color="rgba(74,63,48,0.85)" />
          </Pressable>
        )}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#EFE3CE' },
  petalWrap: { position: 'absolute', left: 0, top: 0 },
  wing: { position: 'absolute', top: 0, width: 10, height: 14, borderRadius: 6 },
  bfBody: {
    position: 'absolute',
    left: 9,
    top: 3,
    width: 2,
    height: 9,
    borderRadius: 1,
    backgroundColor: 'rgba(92,74,54,0.7)',
  },
  soundChip: {
    position: 'absolute',
    right: SPACE.gutter,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(122,101,74,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Kintsugi;
