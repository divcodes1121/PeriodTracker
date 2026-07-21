import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MEADOW_STAGES, stageForSeeds } from '../utils/tinyEscapes';

/**
 * Dandelion Wishes — "Take a breath. Let go."
 *
 * A breathing ritual rather than a game. A dandelion stands in a quiet meadow;
 * swiping upward lifts seeds off the head and carries them into the wind. Where
 * they land, the meadow grows. Nothing is scored, nothing is lost, and the
 * light walks slowly from morning to a starry night as more seeds are released.
 *
 * ARCHITECTURE — consistent with the other scenes:
 *
 *  - **Fixed seed pool, recycled.** SEED_COUNT seeds are allocated once. A
 *    swipe activates the ones nearest the gesture by writing shared values; no
 *    spawn ever re-renders. Each seed carries its own drift worklet, so the
 *    flight paths differ without a physics solver.
 *  - **Stage walk is pure and tested.** `stageForSeeds` lives in
 *    utils/tinyEscapes.ts alongside Rain Catcher's `environmentForCatches` —
 *    same idea, same node test project, no duplicated thresholds.
 *  - **Two-layer crossfade** between stages: the previous sky stays mounted
 *    beneath while the new one fades in over ~2s, so the light shifts without
 *    a visible cut. The meadow layer sits outside the crossfade so growth
 *    persists across stages.
 *
 * TWO DELIBERATE DEPARTURES FROM THE BRIEF:
 *
 *  1. **No microphone.** The brief asks for breath detection. `expo-audio` is a
 *     dependency and the amplitude approach would work, but shipping a mic
 *     permission in a menstrual-health app is a real privacy and store-review
 *     cost: it must be declared in App Store/Play data-safety labels, and it
 *     sits awkwardly beside a product whose selling point is that nothing
 *     leaves the device. The brief itself says both inputs must be equal and
 *     that mic is optional — so touch is the whole experience, not a fallback.
 *     `applyBreath()` below is the single seam a mic would feed if that call is
 *     ever made deliberately.
 *  2. **No Skia**, for the reasons the other scenes already documented.
 */

const SEED_COUNT = 96;
const MAX_GROWN = 26;

/* -------------------------------- Palettes -------------------------------- */

interface Stage {
  sky: [string, string, string];
  far: string;
  mid: string;
  near: string;
  seed: string;
  glow: string;
  /** Sun/moon disc colour, or null for none. */
  disc: string | null;
  discY: number;
  stars: boolean;
  fireflies: boolean;
}

/** Keyed by MEADOW_STAGES ids so the palettes cannot drift from the thresholds. */
const STAGES: Record<string, Stage> = {
  morning: {
    sky: ['#CFE4EE', '#E8F0E4', '#FBF6E6'],
    far: '#9DBFA3', mid: '#7FA684', near: '#5E8566',
    seed: '#FFFDF6', glow: 'rgba(255,246,214,0.5)',
    disc: '#FFF3D0', discY: 0.16, stars: false, fireflies: false,
  },
  late: {
    sky: ['#BDDCEC', '#DCEBE0', '#F7F2DE'],
    far: '#A3C4A4', mid: '#84AB86', near: '#628A68',
    seed: '#FFFDF6', glow: 'rgba(255,244,206,0.55)',
    disc: '#FFEFC2', discY: 0.12, stars: false, fireflies: false,
  },
  golden: {
    sky: ['#E9D9B8', '#F2E2C0', '#F8ECCE'],
    far: '#B2B884', mid: '#96A46F', near: '#6E8459',
    seed: '#FFF8E4', glow: 'rgba(255,224,160,0.6)',
    disc: '#FFE1A0', discY: 0.2, stars: false, fireflies: false,
  },
  sunset: {
    sky: ['#F0B79A', '#F2C7A8', '#EFD6BC'],
    far: '#A08A78', mid: '#87735F', near: '#5F5344',
    seed: '#FFF0DC', glow: 'rgba(255,180,130,0.6)',
    disc: '#FFB98A', discY: 0.32, stars: false, fireflies: false,
  },
  twilight: {
    sky: ['#8E7FA8', '#B490A2', '#D3A99C'],
    far: '#6B6076', mid: '#544C60', near: '#3A3545',
    seed: '#F6ECEC', glow: 'rgba(214,168,190,0.5)',
    disc: '#F0C7B0', discY: 0.42, stars: false, fireflies: true,
  },
  blue: {
    sky: ['#3E4A76', '#5A6490', '#8A7FA0'],
    far: '#3C4260', mid: '#2E3350', near: '#1F2338',
    seed: '#EAE6F4', glow: 'rgba(150,170,230,0.45)',
    disc: '#DCE2F0', discY: 0.2, stars: true, fireflies: true,
  },
  starry: {
    sky: ['#10162E', '#1A2144', '#2A2C50'],
    far: '#232742', mid: '#1A1D34', near: '#101223',
    seed: '#EDEAF6', glow: 'rgba(180,190,240,0.4)',
    disc: '#E8ECF6', discY: 0.14, stars: true, fireflies: true,
  },
};

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------------------------------- Seed ---------------------------------- */

/**
 * One dandelion seed. At rest it sits on the head; released, it rides a drift
 * worklet with its own frequencies so no two flights match. Weight, flutter and
 * spiral are per-seed constants rather than a simulation.
 */
function Seed({
  index,
  homeX,
  homeY,
  angle,
  released,
  wind,
  tint,
  reduced,
  h,
}: {
  index: number;
  homeX: number;
  homeY: number;
  angle: number;
  released: SharedValue<number>;
  wind: SharedValue<number>;
  tint: string;
  reduced: boolean;
  h: number;
}) {
  const drift = useSharedValue(0);
  const rand = useMemo(() => seeded(index * 7919 + 13), [index]);
  const cfg = useMemo(
    () => ({
      // Heavier seeds fall behind; lighter ones ride the wind further.
      weight: 0.5 + rand() * 0.9,
      swayAmp: 14 + rand() * 34,
      swayFreq: 0.7 + rand() * 1.5,
      spin: (rand() - 0.5) * 260,
      lateral: (rand() - 0.5) * 2.2,
      rise: 0.55 + rand() * 0.7,
    }),
    [rand]
  );

  useEffect(() => {
    if (reduced) {
      drift.value = 0.5;
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: 7000 + index * 37, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(drift);
  }, [drift, index, reduced]);

  const style = useAnimatedStyle(() => {
    const r = released.value;
    if (r <= 0) {
      // At rest on the head.
      return {
        opacity: 1,
        transform: [{ translateX: homeX }, { translateY: homeY }, { rotate: `${angle}rad` }],
      };
    }

    const phase = drift.value * Math.PI * 2;
    // Rise accelerates then eases as the seed loses the gust.
    const lift = (1 - Math.pow(1 - r, 2)) * h * cfg.rise;
    const sway = Math.sin(phase * cfg.swayFreq + index) * cfg.swayAmp * r;
    const push = wind.value * r * 60 * cfg.lateral;

    return {
      opacity: Math.max(0, 1 - Math.pow(r, 3)),
      transform: [
        { translateX: homeX + sway + push },
        { translateY: homeY - lift / cfg.weight + Math.sin(phase * 0.6) * 8 * r },
        { rotate: `${angle + (r * cfg.spin * Math.PI) / 180}rad` },
        { scale: 1 + r * 0.25 },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.seed, style]}>
      <Svg width={18} height={18}>
        {/* Pappus — a tiny parachute of filaments, not a dot */}
        <G opacity={0.95}>
          {[0, 30, 60, 90, 120, 150].map((a) => (
            <Path
              key={a}
              d={`M9 12 L${9 + Math.cos(((a - 90) * Math.PI) / 180) * 7} ${
                12 + Math.sin(((a - 90) * Math.PI) / 180) * 7
              }`}
              stroke={tint}
              strokeWidth={0.9}
              strokeLinecap="round"
            />
          ))}
          <Circle cx={9} cy={12} r={1.5} fill={tint} opacity={0.9} />
          <Circle cx={9} cy={15} r={0.9} fill="#C7B48E" />
        </G>
      </Svg>
    </Animated.View>
  );
}

/* --------------------------------- Flower --------------------------------- */

/** A bloom grown where a seed landed. Fades in as scenery — never pops. */
function Bloom({ x, y, hue, delay }: { x: number; y: number; hue: string; delay: number }) {
  const sway = useSharedValue(0);
  useEffect(() => {
    sway.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(sway);
  }, [sway, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-3 + sway.value * 6}deg` }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(1400)}
      pointerEvents="none"
      style={[{ position: 'absolute', left: x - 9, top: y - 20 }, style]}
    >
      <Svg width={18} height={26}>
        <Path d="M9 26 L9 12" stroke="#5C7A54" strokeWidth={1.3} strokeLinecap="round" />
        {[0, 72, 144, 216, 288].map((a) => (
          <Ellipse
            key={a}
            cx={9 + Math.cos((a * Math.PI) / 180) * 4}
            cy={10 + Math.sin((a * Math.PI) / 180) * 4}
            rx={3}
            ry={2.2}
            fill={hue}
            transform={`rotate(${a} ${9 + Math.cos((a * Math.PI) / 180) * 4} ${
              10 + Math.sin((a * Math.PI) / 180) * 4
            })`}
          />
        ))}
        <Circle cx={9} cy={10} r={1.8} fill="#F7E3A8" />
      </Svg>
    </Animated.View>
  );
}

/* -------------------------------- Butterfly ------------------------------- */

function Butterfly({ w, h, delay, reduced }: { w: number; h: number; delay: number; reduced: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 22000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(t);
  }, [t, delay, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.05 || t.value > 0.95 ? 0 : 0.85,
    transform: [
      { translateX: -40 + t.value * (w + 80) },
      { translateY: h * 0.5 + Math.sin(t.value * Math.PI * 6) * 46 },
      { scale: 0.9 + Math.sin(t.value * Math.PI * 4) * 0.1 },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.abs, style]}>
      <Svg width={16} height={12}>
        <Ellipse cx={5} cy={6} rx={4.5} ry={3} fill="#E8B7C6" opacity={0.9} />
        <Ellipse cx={11} cy={6} rx={4.5} ry={3} fill="#DCA6B8" opacity={0.9} />
        <Path d="M8 3 L8 9" stroke="#6B5A4E" strokeWidth={1} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/* ---------------------------------- Scene --------------------------------- */

interface Grown {
  id: number;
  x: number;
  y: number;
  hue: string;
}

const BLOOM_HUES = ['#E8A9BD', '#CDB6E4', '#F2C9A2', '#F0DCA0', '#C9DCC0'];

const DandelionWishes = () => {
  const { width: w, height: h } = useWindowDimensions();
  const reduced = useReducedMotion();

  /**
   * Two counters, deliberately separate:
   *  - `total` never resets. It drives the light, so a session's journey from
   *    morning to starry night only ever moves forward.
   *  - `onHead` is how many of the current head's seeds have gone, and resets
   *    when the head regrows. Conflating them would send the sky back to
   *    morning every time the flower refilled.
   */
  const [total, setTotal] = useState(0);
  const [onHead, setOnHead] = useState(0);
  const [grown, setGrown] = useState<Grown[]>([]);

  const stage = stageForSeeds(total);
  const pal = STAGES[stage.id];

  // Previous palette for the crossfade, tracked without setting state in an
  // effect cleanup (which fires at the wrong time and fights StrictMode).
  const prevRef = useRef<string | null>(null);
  const prevPal = prevRef.current && prevRef.current !== stage.id ? STAGES[prevRef.current] : null;
  useEffect(() => {
    prevRef.current = stage.id;
  }, [stage.id]);

  const wind = useSharedValue(0);
  const breath = useSharedValue(0);
  const grownId = useRef(0);
  const lastHaptic = useRef(0);

  // Seed geometry: a rough sphere of pappus on the stem's head.
  const stemX = w * 0.5;
  const headY = h * 0.52;

  const seeds = useMemo(() => {
    const rand = seeded(20260721);
    return Array.from({ length: SEED_COUNT }, (_, i) => {
      // Fibonacci-ish scatter so the head reads as a sphere, not a ring.
      const a = i * 2.399963;
      const rr = Math.sqrt(i / SEED_COUNT) * 42;
      return {
        i,
        x: stemX + Math.cos(a) * rr - 9,
        y: headY + Math.sin(a) * rr * 0.88 - 9,
        angle: a,
        tintJitter: rand(),
      };
    });
  }, [stemX, headY]);

  const released = Array.from({ length: SEED_COUNT }, () => useSharedValue(0));

  /** Ambient breathing of the whole meadow — 4-2-6-2, visual guidance only. */
  useEffect(() => {
    if (reduced) {
      breath.value = 0.5;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      false
    );
    return () => cancelAnimation(breath);
  }, [breath, reduced]);

  /**
   * A bloom takes root. Capped and FIFO — the meadow fills without the scene
   * ever accumulating unbounded nodes.
   */
  const plant = useCallback(
    (x: number, y: number) => {
      const id = grownId.current++;
      setGrown((g) => {
        const next = [
          ...g,
          { id, x, y, hue: BLOOM_HUES[id % BLOOM_HUES.length] },
        ];
        return next.length > MAX_GROWN ? next.slice(next.length - MAX_GROWN) : next;
      });
    },
    []
  );

  /**
   * Release seeds. **This is the single seam a microphone would feed** — a
   * breath detector would call exactly this with a strength derived from
   * amplitude, and nothing else in the scene would change. See the note at the
   * top of the file for why touch is the shipped input.
   *
   * @param x       gesture x, in screen space
   * @param y       gesture y
   * @param strength 0→1; a stronger gust reaches further seeds
   */
  const applyBreath = useCallback(
    (x: number, y: number, strength: number) => {
      const reach = 70 + strength * 130;
      let freed = 0;

      seeds.forEach((s) => {
        if (released[s.i].value > 0) return;
        const dx = s.x + 9 - x;
        const dy = s.y + 9 - y;
        if (Math.hypot(dx, dy) > reach) return;

        freed++;
        // Stagger so the head empties like a puff, not a switch.
        released[s.i].value = withDelay(
          freed * 26,
          withTiming(1, { duration: 5200 + Math.random() * 2600, easing: Easing.out(Easing.quad) })
        );

        // Roughly every fourth seed puts down roots somewhere below.
        if (freed % 4 === 0) {
          const lx = Math.max(16, Math.min(w - 16, x + (Math.random() - 0.5) * w * 0.8));
          const ly = h * (0.74 + Math.random() * 0.2);
          setTimeout(() => plant(lx, ly), 2200 + Math.random() * 2600);
        }
      });

      if (freed > 0) {
        setTotal((c) => c + freed);
        setOnHead((c) => c + freed);
        const now = Date.now();
        if (now - lastHaptic.current > 200) {
          lastHaptic.current = now;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }
    },
    [seeds, released, w, h, plant]
  );

  /**
   * Upward swipe = a gust. Downward and sideways do nothing, so the gesture is
   * "lifting" rather than "flicking" — the brief's distinction, and it matters:
   * a lift is a slow motion and a flick is a fast one.
   */
  const gust = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      wind.value = e.velocityX / 900;
      if (e.velocityY < -120) {
        const strength = Math.min(1, -e.velocityY / 1600);
        runOnJS(applyBreath)(e.x, e.y, strength);
      }
    })
    .onEnd(() => {
      'worklet';
      wind.value = withTiming(0, { duration: 2200 });
    });

  /** The head shrinks as it empties. */
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.98 + breath.value * 0.03 }],
  }));

  const grassStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -breath.value * 3 }, { scaleY: 1 + breath.value * 0.02 }],
  }));

  const remaining = SEED_COUNT - onHead;

  const Sky = ({ p }: { p: Stage }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={p.sky} style={StyleSheet.absoluteFill} />
      {p.stars && (
        <Svg style={StyleSheet.absoluteFill}>
          {Array.from({ length: 40 }, (_, i) => {
            const r = seeded(i * 977);
            return (
              <Circle
                key={i}
                cx={r() * w}
                cy={r() * h * 0.55}
                r={0.6 + r() * 1.1}
                fill="#FFF8E8"
                opacity={0.35 + r() * 0.5}
              />
            );
          })}
        </Svg>
      )}
      {p.disc && (
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`disc-${p.discY}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0.35" stopColor={p.disc} stopOpacity={0.4} />
              <Stop offset="1" stopColor={p.disc} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={w * 0.74} cy={h * p.discY} r={70} fill={`url(#disc-${p.discY})`} />
          <Circle cx={w * 0.74} cy={h * p.discY} r={24} fill={p.disc} opacity={0.9} />
        </Svg>
      )}
      {/* Hills */}
      <Svg style={StyleSheet.absoluteFill}>
        <Path d={`M0 ${h} L0 ${h * 0.66} Q ${w * 0.3} ${h * 0.58}, ${w * 0.62} ${h * 0.66} T ${w} ${h * 0.62} L${w} ${h} Z`} fill={p.far} />
        <Path d={`M0 ${h} L0 ${h * 0.76} Q ${w * 0.45} ${h * 0.69}, ${w} ${h * 0.77} L${w} ${h} Z`} fill={p.mid} />
        <Path d={`M0 ${h} L0 ${h * 0.88} Q ${w * 0.5} ${h * 0.82}, ${w} ${h * 0.88} L${w} ${h} Z`} fill={p.near} />
      </Svg>
    </View>
  );

  return (
    <GestureDetector gesture={gust}>
      <View style={[styles.root, { backgroundColor: pal.sky[0] }]}>
        {/* Two-layer crossfade: old light lingers beneath the new */}
        {prevPal ? <Sky p={prevPal} /> : null}
        <Animated.View key={stage.id} entering={FadeIn.duration(2000)} style={StyleSheet.absoluteFill}>
          <Sky p={pal} />
        </Animated.View>

        {/* Meadow growth sits outside the crossfade so it persists */}
        {grown.map((g, i) => (
          <Bloom key={g.id} x={g.x} y={g.y} hue={g.hue} delay={i * 90} />
        ))}

        {/* Grass, breathing */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, grassStyle]}>
          <Svg style={StyleSheet.absoluteFill}>
            {Array.from({ length: 34 }, (_, i) => {
              const r = seeded(i * 5171);
              const gx = r() * w;
              const gh = 16 + r() * 26;
              const gy = h * (0.86 + r() * 0.12);
              return (
                <Path
                  key={i}
                  d={`M${gx} ${gy} Q ${gx + 5} ${gy - gh * 0.6}, ${gx + 2} ${gy - gh}`}
                  stroke={pal.near}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.7}
                />
              );
            })}
          </Svg>
        </Animated.View>

        {pal.fireflies &&
          Array.from({ length: 8 }, (_, i) => (
            <Butterfly key={`ff-${i}`} w={w} h={h * (0.6 + i * 0.03)} delay={i * 2400} reduced={reduced} />
          ))}
        {!pal.fireflies && (
          <>
            <Butterfly w={w} h={h * 0.58} delay={0} reduced={reduced} />
            <Butterfly w={w} h={h * 0.66} delay={9000} reduced={reduced} />
          </>
        )}

        {/* Stem + head */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, headStyle]}>
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id="stem" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#7FA070" />
                <Stop offset="1" stopColor="#4E6B48" />
              </SvgLinearGradient>
              <RadialGradient id="head-glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0.2" stopColor={pal.glow} stopOpacity={0.8} />
                <Stop offset="1" stopColor={pal.glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={stemX} cy={headY} r={70} fill="url(#head-glow)" />
            <Path
              d={`M${stemX} ${h * 0.92} Q ${stemX - 6} ${headY + 60}, ${stemX} ${headY + 6}`}
              stroke="url(#stem)"
              strokeWidth={3.2}
              strokeLinecap="round"
              fill="none"
            />
            {/* Receptacle */}
            <Ellipse cx={stemX} cy={headY + 5} rx={5} ry={3.4} fill="#8A9C6B" />
          </Svg>
        </Animated.View>

        {/* Seeds — the whole point */}
        {seeds.map((s) => (
          <Seed
            key={s.i}
            index={s.i}
            homeX={s.x}
            homeY={s.y}
            angle={s.angle}
            released={released[s.i]}
            wind={wind}
            tint={pal.seed}
            reduced={reduced}
            h={h}
          />
        ))}

        {/* When the head is bare, a new one quietly grows — never a dead end */}
        {remaining <= 0 ? (
          <Regrow
            onDone={() => {
              // Only the head refills. `total` is untouched, so the light keeps
              // walking forward instead of resetting to morning.
              released.forEach((r) => {
                r.value = 0;
              });
              setOnHead(0);
            }}
          />
        ) : null}
      </View>
    </GestureDetector>
  );
};

/**
 * The head refills after a pause. The brief says there is no ending; an empty
 * stem with nothing to do would be one.
 */
function Regrow({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 3400);
    return () => clearTimeout(id);
  }, [onDone]);
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  abs: { position: 'absolute', left: 0, top: 0 },
  seed: { position: 'absolute', left: 0, top: 0, width: 18, height: 18 },
});

export default DandelionWishes;
