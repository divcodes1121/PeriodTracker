import { useEffect, useMemo, useRef } from 'react';
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
import { useAppStore } from '../store/appStore';
import { useAtmosphere } from '../theme/useAtmosphere';
import {
  daysSince,
  growthFor,
  lightingFor,
  rng,
  rosterFor,
  seedFrom,
  type FishSpec,
  type Lighting,
  type Species,
} from '../utils/aquarium';

/**
 * Aquarium — "Watch life swim by."
 *
 * A living ecosystem rather than a game. Nothing to complete, nothing to grind.
 * It should be calm enough to leave open for half an hour while doing something
 * else, and rewarding enough that after thirty seconds of staring you notice
 * something you had not seen.
 *
 * OWNERSHIP. The tank is generated from `seedFrom(user.id)`, so it is stable
 * for life and different for every user — rock placement, plants, and which
 * fish live here, including whether you happen to have a Koi. There is no way
 * to obtain one; that is what makes having one mean anything. Growth comes from
 * account age via `growthFor`, so plants are genuinely further along when you
 * come back next week and cannot be hurried by playing more. Both live in
 * utils/aquarium.ts, RN-free and node-tested (20 tests).
 *
 * LIGHTING follows the app's real time-of-day bands (`useAtmosphere`), so
 * opening the tank at midnight shows a moonlit tank, not a bright afternoon —
 * and it agrees with the atmosphere on every other screen.
 *
 * FISH AI — procedural, and deliberately **not** a boids solver. Neighbour
 * checks are O(n²) and buy very little here. Instead every fish samples three
 * shared values in its own worklet:
 *
 *   schoolX/schoolY  a single wandering "shoal attractor"
 *   touchX/touchY/touchT  where the last touch was, and how fresh
 *   foodX/foodY/foodT     where food was dropped, and how fresh
 *
 * and steers toward them weighted by its own `social`, `curiosity` and hunger.
 * Schooling, curiosity and feeding therefore cost **one write and zero
 * neighbour comparisons**, which is the same trick the shimmer wave in
 * BubbleTherapy uses. Fish still never share a path because each carries its
 * own phase, lane, speed jitter and two sine frequencies.
 *
 * A touch is felt tank-wide and **every** fish answers it. Temperament sets how
 * eagerly and how closely, not whether — an aquarium where shy species ignore
 * you is more truthful but reads as an unresponsive control, since a fish that
 * is ignoring you looks identical to a fish that never got the event.
 *
 * NO SKIA. The brief asks for it — and for caustics, subsurface scattering and
 * 50+ fish. It is not a dependency, needs a native prebuild, and would break
 * the web preview. Caustics here are two crossing translucent gradient sheets
 * on long unrelated loops, which reads convincingly at this scale. The honest
 * budget is ~22 fish plus ambient life, not 50+; the other scenes made the same
 * trade and are the better for it.
 */

const FISH_COUNT = 34;
const FOOD_COUNT = 14;
const MOTE_COUNT = 30;
const BUBBLE_COUNT = 16;

/* --------------------------------- Fish ----------------------------------- */

function Fish({
  spec,
  index,
  w,
  h,
  schoolX,
  schoolY,
  touchX,
  touchY,
  touchT,
  foodX,
  foodY,
  foodT,
  clock,
  breath,
  restful,
  reduced,
}: {
  spec: FishSpec;
  index: number;
  w: number;
  h: number;
  schoolX: SharedValue<number>;
  schoolY: SharedValue<number>;
  touchX: SharedValue<number>;
  touchY: SharedValue<number>;
  touchT: SharedValue<number>;
  foodX: SharedValue<number>;
  foodY: SharedValue<number>;
  foodT: SharedValue<number>;
  /** Shared seconds counter. The ONE timebase all freshness is measured against. */
  clock: SharedValue<number>;
  breath: SharedValue<number>;
  restful: boolean;
  reduced: boolean;
}) {
  const t = useSharedValue(spec.phase);
  const s = spec.species;

  // Nocturnal fish invert the day: active when the tank is resting.
  const asleep = restful ? !s.nocturnal : !!s.nocturnal;

  useEffect(() => {
    if (reduced) {
      t.value = spec.phase;
      return;
    }
    // Long, prime-ish periods so the tank never visibly loops.
    const dur = (26000 / (s.speed * spec.speedJitter)) * (asleep ? 2.6 : 1);
    t.value = withRepeat(withTiming(spec.phase + 1, { duration: dur, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [t, spec.phase, spec.speedJitter, s.speed, asleep, reduced]);

  const style = useAnimatedStyle(() => {
    const p = t.value % 1;
    const a = p * Math.PI * 2;

    // Base path: a long horizontal traverse with two unrelated vertical sines,
    // so the fish wanders rather than tracing a lane.
    let x = ((p + spec.phase) % 1) * (w + 140) - 70;
    let y =
      spec.lane * h * 0.82 +
      h * 0.06 +
      Math.sin(a * 1.7 + index) * 22 +
      Math.sin(a * 0.6 + index * 2.1) * 34;

    // Schooling: social fish drift toward the shoal attractor.
    if (s.social > 0.2) {
      const k = s.social * 0.34;
      x += (schoolX.value - x) * k;
      y += (schoolY.value - y) * k;
    }

    // Curiosity. Freshness is measured against `clock` — the one shared
    // timebase — because it is what stamped touchT in the first place.
    const now = clock.value;
    const elapsed = now - touchT.value;

    // Interest decays over ~7s, so they gather, mill around, then drift off.
    const touchAge = Math.max(0, Math.min(1, 1 - elapsed / 7));
    let engage = 0;

    if (touchAge > 0 && touchT.value > 0) {
      /**
       * EVERY fish comes when you touch the glass.
       *
       * Two earlier versions of this were wrong in different ways, and both are
       * worth recording because the second is the subtle one:
       *
       *  1. Freshness compared each fish's own 0→1 swim loop against `clock`,
       *     which counts seconds — so the multiplier reached the hundreds and
       *     fish crossed the tank in one frame.
       *  2. The fix replaced that with a per-frame nudge, `x += (touch - x) *
       *     0.05`. That reads like it should accumulate, but this position is
       *     recomputed from scratch every frame from `t.value` — there is no
       *     state to accumulate *into*. So the fish sat permanently 5% of the
       *     way to your finger and barely appeared to react.
       *
       * Because the position is stateless, the *blend factor itself* has to
       * carry the passage of time. `arrive` ramps 0→1 over the fish's approach
       * window, so the lerp toward the touch strengthens smoothly — that is
       * what actually makes a fish swim over. It also cannot overshoot: the
       * blend is clamped below 1, so the worst case is a fish that reaches your
       * finger, never one that flies past it.
       *
       * Temperament now sets how *fast* and how *close*, not *whether*: a Betta
       * takes ~2.6s and hangs back, a Clownfish is there in under a second. An
       * aquarium where shy species ignore you is more truthful, but it reads as
       * an unresponsive control — a fish ignoring you looks identical to a fish
       * that never received the event.
       */
      const eagerness = 0.45 + s.curiosity * 0.55;
      const arriveSec = 0.8 + (1 - s.curiosity) * 1.8;
      const arrive = Math.min(1, elapsed / arriveSec);

      // Capped below 1 so they crowd around the finger rather than onto it.
      const blend = arrive * eagerness * touchAge * 0.88;
      engage = blend;

      x += (touchX.value - x) * blend;
      y += (touchY.value - y) * blend;

      // The stunt, once they have arrived: they stop bearing down on your
      // finger and orbit it, banking into the turn. Swimming straight at a
      // point is what a cursor does; fish investigating something circle it.
      // Shy fish orbit wider, so the crowd has depth instead of one tight ring.
      const ring = 30 + (1 - s.curiosity) * 34;
      const orbit = now * 1.5 + index * 1.3;
      x += Math.cos(orbit) * ring * arrive * touchAge;
      y += Math.sin(orbit) * (ring * 0.7) * arrive * touchAge;
    }

    // Food: same ramped blend as the touch, so a scatter actually draws a
    // crowd. Faster species get there first, which is what makes feeding look
    // like feeding rather than everything arriving at once.
    const foodElapsed = now - foodT.value;
    const foodAge = Math.max(0, Math.min(1, 1 - foodElapsed / 9));
    if (foodAge > 0 && foodT.value > 0 && !asleep) {
      const foodArrive = Math.min(1, foodElapsed / (1.1 + (1 - s.speed) * 2.2));
      const blend = foodArrive * foodAge * 0.8;
      x += (foodX.value - x) * blend;
      y += (foodY.value - y) * blend;
    }

    // Breathing mode lifts the whole population very slightly on the inhale.
    y -= breath.value * 10;

    // Sleeping fish sink toward the plants and slow to a hover.
    if (asleep) y += 26;

    // Facing follows travel direction; the body tilts into vertical movement.
    // An engaged fish banks harder into its orbit, which is what makes the
    // circling read as a manoeuvre rather than a drift.
    const dir = Math.cos(a) >= 0 ? 1 : -1;
    const tilt = Math.sin(a * 0.6 + index * 2.1) * 8 + Math.cos(clock.value * 1.6 + index * 1.3) * 22 * engage;

    return {
      opacity: asleep ? 0.55 : 1,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotateZ: `${tilt}deg` },
        // A small eager lean forward when investigating.
        { scaleX: dir * spec.scale * (1 + engage * 0.06) },
        { scaleY: spec.scale * (1 + engage * 0.06) },
      ],
    };
  });

  return <FishBody species={s} index={index} style={style} />;
}

/**
 * Draws a fish by body plan.
 *
 * Silhouette does the recognition work. The first pass gave every species the
 * same ellipse and varied only colour, which reads as one fish in eight paint
 * jobs — a disc and a ribbon look like different animals across the tank even
 * at the same size and hue. All plans share the same top-lit gradient, so the
 * population still reads as one aquarium rather than a sticker sheet.
 */
function FishBody({
  species: s,
  index,
  style,
}: {
  species: Species;
  index: number;
  style: ReturnType<typeof useAnimatedStyle>;
}) {
  const L = s.size;
  const g = `url(#fb-${index})`;
  const band = s.palette[1];
  const fin = s.palette[2];

  // Canvas is generous so trailing fins are never clipped.
  const W = L * 2.2;
  const HT = L * 2;
  const cx = W * 0.5;
  const cy = HT * 0.5;

  let art: React.ReactNode;

  if (s.shape === 'disc') {
    // Tall coin. Fins are short; the body is the whole statement.
    art = (
      <>
        <Path d={`M${cx - L * 0.46} ${cy} l${-L * 0.34} ${-L * 0.3} l0 ${L * 0.6} Z`} fill={fin} opacity={0.9} />
        <Ellipse cx={cx} cy={cy} rx={L * 0.48} ry={L * 0.62} fill={g} />
        <Path d={`M${cx - L * 0.1} ${cy - L * 0.6} q${L * 0.3} ${-L * 0.16}, ${L * 0.42} ${L * 0.1} Z`} fill={fin} opacity={0.75} />
        <Path d={`M${cx - L * 0.1} ${cy + L * 0.6} q${L * 0.3} ${L * 0.16}, ${L * 0.42} ${-L * 0.1} Z`} fill={fin} opacity={0.75} />
        {/* Vertical bar — the marking that makes tangs and butterflyfish read. */}
        <Ellipse cx={cx - L * 0.06} cy={cy} rx={L * 0.07} ry={L * 0.55} fill={band} opacity={0.42} />
        <Circle cx={cx + L * 0.3} cy={cy - L * 0.16} r={L * 0.075} fill="#14202C" />
      </>
    );
  } else if (s.shape === 'sail') {
    // Tall body drawn out into long dorsal and ventral streamers.
    art = (
      <>
        <Path d={`M${cx - L * 0.42} ${cy} l${-L * 0.4} ${-L * 0.26} l0 ${L * 0.52} Z`} fill={fin} opacity={0.85} />
        {/* Broad triangular sails swept BACK from the body. The first pass drew
            these as near-vertical slivers, which read as antennae rather than
            finnage — an angelfish's fins are wide where they meet the body and
            trail behind it, not straight up. */}
        <Path
          d={`M${cx + L * 0.24} ${cy - L * 0.34} L${cx - L * 0.3} ${cy - L * 0.38} L${cx - L * 0.62} ${cy - L * 1.0} Z`}
          fill={fin}
          opacity={0.6}
        />
        <Path
          d={`M${cx + L * 0.24} ${cy + L * 0.34} L${cx - L * 0.3} ${cy + L * 0.38} L${cx - L * 0.62} ${cy + L * 1.0} Z`}
          fill={fin}
          opacity={0.6}
        />
        <Ellipse cx={cx} cy={cy} rx={L * 0.42} ry={L * 0.5} fill={g} />
        <Ellipse cx={cx - L * 0.12} cy={cy} rx={L * 0.06} ry={L * 0.46} fill={band} opacity={0.4} />
        <Circle cx={cx + L * 0.26} cy={cy - L * 0.12} r={L * 0.07} fill="#14202C" />
      </>
    );
  } else if (s.shape === 'veil') {
    // Compact body behind large flowing finnage.
    art = (
      <>
        <Path d={`M${cx - L * 0.3} ${cy} q${-L * 0.55} ${-L * 0.55}, ${-L * 0.75} ${-L * 0.12} q${L * 0.12} ${L * 0.2}, ${L * 0.04} ${L * 0.34} q${L * 0.2} ${L * 0.3}, ${L * 0.71} ${-L * 0.22} Z`} fill={fin} opacity={0.72} />
        <Path d={`M${cx - L * 0.08} ${cy - L * 0.24} q${L * 0.3} ${-L * 0.5}, ${L * 0.44} ${-L * 0.16} q${-L * 0.2} ${L * 0.16}, ${-L * 0.3} ${L * 0.3} Z`} fill={fin} opacity={0.65} />
        <Path d={`M${cx - L * 0.06} ${cy + L * 0.22} q${L * 0.24} ${L * 0.48}, ${L * 0.4} ${L * 0.2} q${-L * 0.2} ${-L * 0.14}, ${-L * 0.28} ${-L * 0.28} Z`} fill={fin} opacity={0.6} />
        <Ellipse cx={cx + L * 0.02} cy={cy} rx={L * 0.36} ry={L * 0.27} fill={g} />
        <Circle cx={cx + L * 0.26} cy={cy - L * 0.06} r={L * 0.065} fill="#14202C" />
      </>
    );
  } else if (s.shape === 'ribbon') {
    // Long and slim, with a forked tail.
    art = (
      <>
        <Path d={`M${cx - L * 0.6} ${cy} l${-L * 0.28} ${-L * 0.2} l${L * 0.1} ${L * 0.2} l${-L * 0.1} ${L * 0.2} Z`} fill={fin} opacity={0.9} />
        <Ellipse cx={cx} cy={cy} rx={L * 0.62} ry={L * 0.15} fill={g} />
        <Path d={`M${cx - L * 0.5} ${cy} h${L * 0.95}`} stroke={band} strokeWidth={L * 0.07} opacity={0.55} strokeLinecap="round" />
        <Path d={`M${cx - L * 0.1} ${cy - L * 0.14} q${L * 0.2} ${-L * 0.2}, ${L * 0.34} ${-L * 0.02} Z`} fill={fin} opacity={0.7} />
        <Circle cx={cx + L * 0.44} cy={cy - L * 0.03} r={L * 0.055} fill="#14202C" />
      </>
    );
  } else if (s.shape === 'round') {
    // Nearly spherical, with small busy fins.
    art = (
      <>
        <Path d={`M${cx - L * 0.42} ${cy} l${-L * 0.24} ${-L * 0.2} l0 ${L * 0.4} Z`} fill={fin} opacity={0.85} />
        <Circle cx={cx} cy={cy} r={L * 0.44} fill={g} />
        <Ellipse cx={cx} cy={cy + L * 0.24} rx={L * 0.3} ry={L * 0.12} fill="#FFFFFF" opacity={0.16} />
        <Ellipse cx={cx - L * 0.05} cy={cy - L * 0.1} rx={L * 0.4} ry={L * 0.08} fill={band} opacity={0.35} />
        <Path d={`M${cx + L * 0.06} ${cy - L * 0.42} q${L * 0.14} ${-L * 0.18}, ${L * 0.24} ${L * 0.02} Z`} fill={fin} opacity={0.8} />
        <Circle cx={cx + L * 0.26} cy={cy - L * 0.1} r={L * 0.08} fill="#14202C" />
        <Circle cx={cx + L * 0.29} cy={cy - L * 0.13} r={L * 0.028} fill="#FFFFFF" opacity={0.85} />
      </>
    );
  } else if (s.shape === 'seahorse') {
    // Vertical, snouted, with a curled prehensile tail.
    art = (
      <>
        <Path
          d={`M${cx + L * 0.1} ${cy - L * 0.55} q${L * 0.26} ${L * 0.06}, ${L * 0.24} ${L * 0.2} q${-L * 0.02} ${L * 0.16}, ${-L * 0.24} ${L * 0.2} q${-L * 0.3} ${L * 0.1}, ${-L * 0.26} ${L * 0.44} q${L * 0.04} ${L * 0.3}, ${L * 0.26} ${L * 0.3}`}
          stroke={g}
          strokeWidth={L * 0.3}
          strokeLinecap="round"
          fill="none"
        />
        <Path d={`M${cx + L * 0.34} ${cy - L * 0.5} l${L * 0.22} ${L * 0.05}`} stroke={band} strokeWidth={L * 0.1} strokeLinecap="round" />
        <Path d={`M${cx - L * 0.02} ${cy - L * 0.2} q${-L * 0.24} ${L * 0.16}, ${-L * 0.02} ${L * 0.3}`} stroke={fin} strokeWidth={L * 0.07} fill="none" opacity={0.8} />
        <Circle cx={cx + L * 0.2} cy={cy - L * 0.44} r={L * 0.06} fill="#14202C" />
      </>
    );
  } else if (s.shape === 'carp') {
    // Heavy body, broad flowing tail, koi patterning.
    art = (
      <>
        <Path d={`M${cx - L * 0.42} ${cy} q${-L * 0.4} ${-L * 0.4}, ${-L * 0.6} ${-L * 0.1} q${L * 0.1} ${L * 0.16}, ${L * 0.04} ${L * 0.24} q${L * 0.16} ${L * 0.3}, ${L * 0.56} ${-L * 0.14} Z`} fill={fin} opacity={0.8} />
        <Ellipse cx={cx} cy={cy} rx={L * 0.46} ry={L * 0.24} fill={g} />
        <Ellipse cx={cx - L * 0.1} cy={cy - L * 0.08} rx={L * 0.16} ry={L * 0.1} fill={band} opacity={0.9} />
        <Ellipse cx={cx + L * 0.2} cy={cy + L * 0.05} rx={L * 0.1} ry={L * 0.07} fill={band} opacity={0.75} />
        <Path d={`M${cx - L * 0.06} ${cy - L * 0.23} q${L * 0.2} ${-L * 0.2}, ${L * 0.34} ${-L * 0.02} Z`} fill={fin} opacity={0.7} />
        <Circle cx={cx + L * 0.34} cy={cy - L * 0.04} r={L * 0.06} fill="#14202C" />
      </>
    );
  } else {
    // torpedo — the classic dart.
    art = (
      <>
        <Path d={`M${cx - L * 0.44} ${cy} l${-L * 0.32} ${-L * 0.24} l${L * 0.08} ${L * 0.24} l${-L * 0.08} ${L * 0.24} Z`} fill={fin} opacity={0.9} />
        <Ellipse cx={cx} cy={cy} rx={L * 0.48} ry={L * 0.2} fill={g} />
        <Path d={`M${cx - L * 0.32} ${cy + L * 0.02} h${L * 0.68}`} stroke={band} strokeWidth={L * 0.09} opacity={0.6} strokeLinecap="round" />
        <Path d={`M${cx - L * 0.02} ${cy - L * 0.19} q${L * 0.16} ${-L * 0.18}, ${L * 0.28} ${-L * 0.02} Z`} fill={fin} opacity={0.7} />
        <Ellipse cx={cx + L * 0.06} cy={cy + L * 0.12} rx={L * 0.24} ry={L * 0.06} fill="#FFFFFF" opacity={0.18} />
        <Circle cx={cx + L * 0.33} cy={cy - L * 0.04} r={L * 0.06} fill="#14202C" />
      </>
    );
  }

  return (
    <Animated.View pointerEvents="none" style={[styles.fish, style]}>
      <Svg width={W} height={HT}>
        <Defs>
          <SvgLinearGradient id={`fb-${index}`} x1="0" y1="0" x2="0" y2="1">
            {/* Lit from above — the single cue that sells depth underwater. */}
            <Stop offset="0" stopColor={s.palette[2]} />
            <Stop offset="0.45" stopColor={s.palette[0]} />
            <Stop offset="1" stopColor={s.palette[1]} />
          </SvgLinearGradient>
        </Defs>
        {art}
      </Svg>
    </Animated.View>
  );
}

/* -------------------------------- Plants ---------------------------------- */

/** A stalk that bends with the current. Sway is shared, so a bed moves as one. */
function Plant({
  x,
  base,
  height,
  hue,
  index,
  current,
}: {
  x: number;
  base: number;
  height: number;
  hue: string;
  index: number;
  current: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    // Phase offset by position, so the bend travels along the bed like a real
    // current rather than every blade leaning in unison.
    const bend = Math.sin(current.value * Math.PI * 2 + index * 0.7) * 9;
    return { transform: [{ rotateZ: `${bend}deg` }] };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x, top: base - height, width: 22, height }, style, { transformOrigin: 'bottom center' } as any]}
    >
      <Svg width={22} height={height}>
        <Path
          d={`M11 ${height} Q ${11 + (index % 2 ? 7 : -7)} ${height * 0.5}, 11 0`}
          stroke={hue}
          strokeWidth={3.2}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={`M11 ${height * 0.7} Q ${11 + (index % 2 ? 12 : -12)} ${height * 0.45}, ${
            11 + (index % 2 ? 6 : -6)
          } ${height * 0.16}`}
          stroke={hue}
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
          opacity={0.8}
        />
      </Svg>
    </Animated.View>
  );
}

/* ---------------------------------- Food ---------------------------------- */

/**
 * One flake of food. The pool is fixed and every flake reads the same drop
 * origin, so scattering costs one write; each carries its own drift and sink
 * rate, so the cloud disperses rather than falling as a block.
 */
function Flake({
  index,
  foodX,
  foodY,
  foodT,
  clock,
  sandTop,
}: {
  index: number;
  foodX: SharedValue<number>;
  foodY: SharedValue<number>;
  foodT: SharedValue<number>;
  clock: SharedValue<number>;
  sandTop: number;
}) {
  const spread = useMemo(() => {
    const r = rng(index * 7717 + 3);
    return { dx: (r() - 0.5) * 90, sway: 8 + r() * 22, rate: 0.5 + r() * 0.7, delay: r() * 0.25 };
  }, [index]);

  const style = useAnimatedStyle(() => {
    // Age in clock units since the drop. Flakes live ~8s, then are gone.
    const age = clock.value - foodT.value - spread.delay;
    if (foodT.value < 0 || age < 0 || age > 8) return { opacity: 0 };

    const fall = age * 34 * spread.rate;
    const y = Math.min(sandTop - 4, foodY.value + fall);
    // Fade as it settles, so leftovers disappear into the sand rather than
    // accumulating — the shrimp are implied, not simulated.
    const o = age > 6 ? 1 - (age - 6) / 2 : Math.min(1, age * 4);

    return {
      opacity: o * 0.9,
      transform: [
        { translateX: foodX.value + spread.dx + Math.sin(age * 1.6 + index) * spread.sway },
        { translateY: y },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.abs, style]}>
      <Svg width={5} height={5}>
        <Circle cx={2.5} cy={2.5} r={2} fill="#D9A867" />
        <Circle cx={2} cy={2} r={0.7} fill="#F0CE96" />
      </Svg>
    </Animated.View>
  );
}

/* -------------------------------- Bubbles --------------------------------- */

function Bubble({ x, h, size, dur, delay, reduced }: { x: number; h: number; size: number; dur: number; delay: number; reduced: boolean }) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    y.value = withDelay(delay, withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(y);
  }, [y, dur, delay, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: y.value < 0.06 ? y.value / 0.06 : y.value > 0.9 ? (1 - y.value) / 0.1 : 0.55,
    transform: [
      { translateX: x + Math.sin(y.value * Math.PI * 5) * 7 },
      { translateY: h - y.value * h },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.abs, style]}>
      <Svg width={size * 2} height={size * 2}>
        <Circle cx={size} cy={size} r={size} fill="rgba(255,255,255,0.28)" />
        <Circle cx={size * 0.7} cy={size * 0.68} r={size * 0.3} fill="rgba(255,255,255,0.6)" />
      </Svg>
    </Animated.View>
  );
}

/* ---------------------------- Ambient visitors ---------------------------- */

/** A jellyfish or turtle that crosses occasionally and is never announced. */
function Visitor({ w, h, kind, reduced }: { w: number; h: number; kind: 'jelly' | 'turtle'; reduced: boolean }) {
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    const run = () => {
      p.value = 0;
      p.value = withDelay(
        kind === 'turtle' ? 40000 + Math.random() * 70000 : 18000 + Math.random() * 30000,
        withTiming(1, { duration: kind === 'turtle' ? 26000 : 20000, easing: Easing.linear }, (done) => {
          if (done) runOnJS(run)();
        })
      );
    };
    run();
    return () => cancelAnimation(p);
  }, [p, kind, reduced]);

  const style = useAnimatedStyle(() => {
    const edge = p.value < 0.08 ? p.value / 0.08 : p.value > 0.92 ? (1 - p.value) / 0.08 : 1;
    return {
      opacity: p.value === 0 ? 0 : edge * (kind === 'turtle' ? 0.9 : 0.55),
      transform: [
        { translateX: kind === 'turtle' ? -160 + p.value * (w + 320) : w + 80 - p.value * (w + 200) },
        { translateY: (kind === 'turtle' ? h * 0.72 : h * 0.2) + Math.sin(p.value * Math.PI * 4) * 26 },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.abs, style]}>
      {kind === 'turtle' ? (
        <Svg width={150} height={82}>
          <Ellipse cx={78} cy={44} rx={44} ry={28} fill="#4E6B58" />
          <Ellipse cx={78} cy={40} rx={36} ry={21} fill="#63836B" />
          <Ellipse cx={124} cy={36} rx={15} ry={11} fill="#5C7A62" />
          <Circle cx={131} cy={33} r={2} fill="#16221A" />
          <Path d="M52 62 q-22 16 -34 8 q14 -2 22 -16 Z" fill="#4E6B58" />
          <Path d="M56 22 q-20 -16 -32 -8 q14 2 22 16 Z" fill="#4E6B58" />
          <Path d="M36 46 q-24 4 -30 -2 q14 -4 22 -6 Z" fill="#46614F" />
        </Svg>
      ) : (
        <Svg width={64} height={120}>
          <Defs>
            <RadialGradient id="jelly" cx="50%" cy="35%" r="60%">
              <Stop offset="0" stopColor="#E8D6F2" stopOpacity={0.85} />
              <Stop offset="1" stopColor="#A88FD0" stopOpacity={0.2} />
            </RadialGradient>
          </Defs>
          <Path d="M4 34 Q32 -6 60 34 Q46 44 32 38 Q18 44 4 34 Z" fill="url(#jelly)" />
          {[14, 24, 34, 44].map((x, i) => (
            <Path
              key={i}
              d={`M${x} 38 q${i % 2 ? 8 : -8} 28, ${i % 2 ? -4 : 4} 62`}
              stroke="#CBB4E4"
              strokeWidth={1.6}
              fill="none"
              opacity={0.5}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      )}
    </Animated.View>
  );
}

/* --------------------------------- Scene ---------------------------------- */

const Aquarium = () => {
  const { width: w, height: h } = useWindowDimensions();
  const reduced = useReducedMotion();
  const { user } = useAppStore();
  const atmos = useAtmosphere();

  /** The tank is *yours*: seeded from a stable id, never regenerated. */
  const seed = useMemo(() => seedFrom(user?.id ?? 'guest-aquarium'), [user?.id]);
  const light: Lighting = useMemo(() => lightingFor(atmos.band), [atmos.band]);
  const growth = useMemo(
    () => growthFor(user?.createdAt ? daysSince(new Date(user.createdAt)) : 0),
    [user?.createdAt]
  );
  const roster = useMemo(() => rosterFor(seed, FISH_COUNT), [seed]);

  const schoolX = useSharedValue(w * 0.5);
  const schoolY = useSharedValue(h * 0.45);
  const touchX = useSharedValue(-999);
  const touchY = useSharedValue(-999);
  const touchT = useSharedValue(0);
  const foodX = useSharedValue(-999);
  const foodY = useSharedValue(-999);
  const foodT = useSharedValue(0);
  const current = useSharedValue(0);
  const breath = useSharedValue(0);
  const ripple = useSharedValue(0);
  const rippleX = useSharedValue(0);
  const rippleY = useSharedValue(0);
  const clock = useSharedValue(0);
  const lastHaptic = useRef(0);

  /** A master clock so touch/food freshness can be compared against fish time. */
  useEffect(() => {
    if (reduced) return;
    // Counts seconds. Everything time-based in this scene measures against it.
    clock.value = withTiming(86400, { duration: 86400000, easing: Easing.linear });
    return () => cancelAnimation(clock);
  }, [clock, reduced]);

  /** The shoal attractor wanders slowly; social fish trail it. */
  useEffect(() => {
    if (reduced) return;
    current.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1, false);
    const wander = () => {
      schoolX.value = withTiming(80 + Math.random() * (w - 160), {
        duration: 11000,
        easing: Easing.inOut(Easing.sin),
      });
      schoolY.value = withTiming(h * (0.22 + Math.random() * 0.5), {
        duration: 13000,
        easing: Easing.inOut(Easing.sin),
      });
    };
    wander();
    const id = setInterval(wander, 12000);
    return () => {
      clearInterval(id);
      cancelAnimation(current);
    };
  }, [schoolX, schoolY, current, w, h, reduced]);

  /** 4-2-6-2, visual only. Lifts plants, fish and light together. */
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

  const tick = () => {
    const now = Date.now();
    if (now - lastHaptic.current < 220) return;
    lastHaptic.current = now;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  /** Touching the glass. Ripple, then curious fish drift over. */
  const touch = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      touchX.value = e.x;
      touchY.value = e.y;
      touchT.value = clock.value;
      rippleX.value = e.x;
      rippleY.value = e.y;
      ripple.value = 0;
      ripple.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) });
      runOnJS(tick)();
    })
    .onUpdate((e) => {
      'worklet';
      touchX.value = e.x;
      touchY.value = e.y;
      touchT.value = clock.value;
    });

  /** A long press scatters food. */
  const feed = Gesture.LongPress()
    .minDuration(420)
    .onStart((e) => {
      'worklet';
      foodX.value = e.x;
      foodY.value = e.y;
      foodT.value = clock.value;
      runOnJS(tick)();
    });

  const gesture = Gesture.Simultaneous(touch, feed);

  /** Static furniture — rocks, driftwood, plant beds — from the tank's seed. */
  const scape = useMemo(() => {
    const r = rng(seed);
    const sandTop = h * 0.82;
    return {
      sandTop,
      rocks: Array.from({ length: 5 }, () => ({
        x: r() * w,
        y: sandTop + r() * 26,
        rx: 22 + r() * 46,
        ry: 12 + r() * 20,
        tone: r() > 0.5 ? '#3E4A52' : '#4A5259',
      })),
      plants: Array.from({ length: growth.plants }, (_, i) => ({
        x: r() * (w - 24),
        base: sandTop + 6 + r() * 14,
        // Maturity lengthens the bed rather than adding drama.
        height: (34 + r() * 58) * (0.55 + growth.maturity * 0.6),
        hue: ['#4E8A63', '#3F7A57', '#5C9B6E', '#2F6B4C'][i % 4],
      })),
      coral: Array.from({ length: growth.coral }, () => ({
        x: r() * w,
        y: sandTop + 4 + r() * 16,
        s: (6 + r() * 8) * (0.6 + growth.maturity * 0.55),
        hue: ['#C77A6B', '#D4948A', '#A8636B'][Math.floor(r() * 3)],
      })),
      motes: Array.from({ length: MOTE_COUNT }, () => ({
        x: r() * w,
        y: r() * h,
        rr: 0.8 + r() * 1.8,
        dur: 16000 + r() * 22000,
      })),
      bubbles: Array.from({ length: BUBBLE_COUNT }, () => ({
        x: r() * w,
        size: 2 + r() * 4,
        dur: 9000 + r() * 12000,
        delay: r() * 9000,
      })),
    };
  }, [seed, w, h, growth]);

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.4,
    transform: [
      { translateX: rippleX.value - 90 },
      { translateY: rippleY.value - 90 },
      { scale: 0.2 + ripple.value * 1.5 },
    ],
  }));

  const rayStyle = useAnimatedStyle(() => ({
    opacity: light.rayStrength * (0.4 + breath.value * 0.3),
    transform: [{ translateX: Math.sin(current.value * Math.PI * 2) * 22 }],
  }));

  const causticStyle = useAnimatedStyle(() => ({
    opacity: light.rayStrength * 0.5,
    transform: [
      { translateX: Math.sin(current.value * Math.PI * 2 + 1.4) * 40 },
      { translateY: Math.cos(current.value * Math.PI * 2) * 14 },
      { scale: 1.2 },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.root}>
        {/* The room beyond the glass — hinted, never detailed. */}
        <LinearGradient colors={light.room} style={StyleSheet.absoluteFill} />

        {/* Water column */}
        <LinearGradient colors={light.water} locations={[0, 0.55, 1]} style={styles.tank} />

        {/* Volumetric shafts entering from above */}
        <Animated.View pointerEvents="none" style={[styles.tank, rayStyle]}>
          <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={light.rays} stopOpacity={0.9} />
                <Stop offset="1" stopColor={light.rays} stopOpacity={0} />
              </SvgLinearGradient>
            </Defs>
            {[0.12, 0.34, 0.56, 0.78].map((f, i) => (
              <Path
                key={i}
                d={`M${w * f} 0 L${w * f + 34} 0 L${w * f + 96 + i * 12} ${h * 0.8} L${w * f - 26} ${h * 0.8} Z`}
                fill="url(#ray)"
                opacity={0.5 + (i % 2) * 0.25}
              />
            ))}
          </Svg>
        </Animated.View>

        {/* Caustics — dappled light *on the sand*, not shapes in the water.
            The first pass drew opaque ellipses at mid-depth, which read as grey
            blobs suspended in the tank. They now sit below the substrate line
            with a soft radial falloff and warm tint, which is what sunlight
            through a moving surface actually looks like where it lands. */}
        <Animated.View pointerEvents="none" style={[styles.tank, causticStyle]}>
          <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="caustic" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFF6D8" stopOpacity={0.9} />
                <Stop offset="1" stopColor="#FFF6D8" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            {Array.from({ length: 14 }, (_, i) => (
              <Ellipse
                key={i}
                cx={(i * 97) % w}
                cy={h * (0.84 + ((i * 53) % 14) / 100)}
                rx={30 + (i % 3) * 16}
                ry={9 + (i % 2) * 4}
                fill="url(#caustic)"
              />
            ))}
          </Svg>
        </Animated.View>

        {/* Suspended particles */}
        {scape.motes.map((m, i) => (
          <Mote key={i} {...m} h={h} tint={light.motes} reduced={reduced} />
        ))}

        <Visitor w={w} h={h} kind="jelly" reduced={reduced} />

        {/* Fish */}
        {roster.map((spec, i) => (
          <Fish
            key={i}
            spec={spec}
            index={i}
            w={w}
            h={h}
            schoolX={schoolX}
            schoolY={schoolY}
            touchX={touchX}
            touchY={touchY}
            touchT={touchT}
            foodX={foodX}
            foodY={foodY}
            foodT={foodT}
            clock={clock}
            breath={breath}
            restful={light.restful}
            reduced={reduced}
          />
        ))}

        {/* Turtle passes in the foreground, in front of the fish */}
        <Visitor w={w} h={h} kind="turtle" reduced={reduced} />

        {/* Substrate: sand, rocks, coral, planting */}
        <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <SvgLinearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#C9B594" />
              <Stop offset="1" stopColor="#8A7A61" />
            </SvgLinearGradient>
          </Defs>
          <Path
            d={`M0 ${h} L0 ${scape.sandTop + 12} Q ${w * 0.3} ${scape.sandTop - 8}, ${w * 0.62} ${
              scape.sandTop + 8
            } T ${w} ${scape.sandTop} L${w} ${h} Z`}
            fill="url(#sand)"
          />
          {scape.rocks.map((r, i) => (
            <G key={i}>
              <Ellipse cx={r.x} cy={r.y} rx={r.rx} ry={r.ry} fill={r.tone} />
              <Ellipse cx={r.x - r.rx * 0.25} cy={r.y - r.ry * 0.35} rx={r.rx * 0.5} ry={r.ry * 0.34} fill="#5E6A72" opacity={0.5} />
            </G>
          ))}
          {scape.coral.map((c, i) => (
            <G key={i} opacity={0.92}>
              {[-1.4, -0.7, 0, 0.7, 1.4].map((b, bi) => (
                <Path
                  key={bi}
                  d={`M${c.x} ${c.y} q${b * c.s * 0.5} ${-c.s * 0.9}, ${b * c.s * 0.9} ${-c.s * 1.9}`}
                  stroke={c.hue}
                  strokeWidth={Math.max(1.6, c.s * 0.22)}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.9 - Math.abs(b) * 0.15}
                />
              ))}
            </G>
          ))}
        </Svg>

        {scape.plants.map((p, i) => (
          <Plant key={i} {...p} index={i} current={current} />
        ))}

        {/* Food, when it has been scattered */}
        {Array.from({ length: FOOD_COUNT }, (_, i) => (
          <Flake
            key={i}
            index={i}
            foodX={foodX}
            foodY={foodY}
            foodT={foodT}
            clock={clock}
            sandTop={scape.sandTop}
          />
        ))}

        {scape.bubbles.map((b, i) => (
          <Bubble key={i} {...b} h={h} reduced={reduced} />
        ))}

        {/* Touch ripple on the glass */}
        <Animated.View pointerEvents="none" style={[styles.abs, rippleStyle]}>
          <Svg width={180} height={180}>
            <Circle cx={90} cy={90} r={86} stroke="rgba(255,255,255,0.7)" strokeWidth={2} fill="none" />
            <Circle cx={90} cy={90} r={62} stroke="rgba(255,255,255,0.35)" strokeWidth={1.4} fill="none" />
          </Svg>
        </Animated.View>

        {/* Glass: a vignette and a highlight, so the scene reads as *inside* a
            tank rather than as an underwater camera. */}
        <View pointerEvents="none" style={styles.glass}>
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.16)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
    </GestureDetector>
  );
};

/** A single suspended particle drifting on the current. */
function Mote({
  x,
  y,
  rr,
  dur,
  h,
  tint,
  reduced,
}: {
  x: number;
  y: number;
  rr: number;
  dur: number;
  h: number;
  tint: string;
  reduced: boolean;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    p.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [p, dur, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.25 + Math.sin(p.value * Math.PI * 2) * 0.2,
    transform: [
      { translateX: x + Math.sin(p.value * Math.PI * 2) * 26 },
      { translateY: (y + p.value * h * 0.4) % h },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.abs, style]}>
      <Svg width={rr * 2} height={rr * 2}>
        <Circle cx={rr} cy={rr} r={rr} fill={tint} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#12202C', overflow: 'hidden' },
  tank: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  abs: { position: 'absolute', left: 0, top: 0 },
  fish: { position: 'absolute', left: 0, top: 0 },
  glass: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
});

export default Aquarium;
