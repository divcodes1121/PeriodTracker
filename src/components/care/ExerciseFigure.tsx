import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import Animated, {
  SharedValue,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  useReducedMotion,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';
import { BLOOM } from '../../constants';
import { BONES, easeInOut } from '../../care/poses';
import { Exercise, Joint, Pose } from '../../care/types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXERCISE FIGURE — thirty animations, one component, zero assets.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Interpolates a figure between the keyframe poses in `care/exercises.ts`.
 *
 * ── How it hits the performance brief ─────────────────────────────────────
 *
 * The requirement was: smooth, offline, 60fps, battery-efficient, lazy-loaded,
 * cached. Every one of those is satisfied by the *absence* of an asset
 * pipeline rather than by optimising one:
 *
 *   offline        there is nothing to fetch — the animation is 12 numbers
 *                  per keyframe in a TS file that is already in the bundle
 *   lazy-load      nothing to load
 *   cache          nothing to cache
 *   battery        one timing loop and ten animated props; no decoder, no
 *                  offscreen buffer, no per-frame JS
 *   60fps          the whole interpolation runs in a worklet on the UI
 *                  thread, so it does not compete with React
 *
 * ── The single clock ──────────────────────────────────────────────────────
 *
 * One shared value runs 0 → 1 over the *total* cycle. Everything else derives
 * from it inside worklets: which keyframe pair we are between, the eased
 * fraction, each bone's endpoints, the breath ring's radius. Adding a limb
 * costs one more `useAnimatedProps`, never another timer.
 *
 * Bones are `Line`s rather than one `Path`, because `x1/y1/x2/y2` are animatable
 * props on `react-native-svg` and a `d` string is not — building a path string
 * per frame would put the work back on the JS thread, which is exactly what
 * this design exists to avoid.
 *
 * ── Reduced motion ────────────────────────────────────────────────────────
 *
 * Holds the first keyframe. Still a clean, readable illustration of the pose,
 * still labelled — the user loses the movement, not the information.
 */

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ExerciseFigureProps {
  exercise: Exercise;
  size?: number;
  /** Pause the loop (e.g. while a player is paused). */
  paused?: boolean;
  /** Draw the breathing ring behind the figure. */
  showBreath?: boolean;
  /** Override the figure colour. Defaults to a brand hue. */
  color?: string;
}

/**
 * Cumulative keyframe boundaries, as fractions of the whole loop.
 *
 * Precomputed on the JS side so the worklet only does arithmetic — a worklet
 * that allocates arrays every frame is a worklet that stutters.
 */
function timeline(exercise: Exercise) {
  const total = exercise.frames.reduce((t, f) => t + f.ms, 0);
  let acc = 0;
  const bounds = exercise.frames.map((f) => {
    acc += f.ms;
    return acc / total;
  });
  return { total, bounds };
}

const ExerciseFigure = ({
  exercise,
  size = 220,
  paused = false,
  showBreath = true,
  color,
}: ExerciseFigureProps) => {
  const { colors: c, isDark } = useTheme();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  const { total, bounds } = useMemo(() => timeline(exercise), [exercise]);
  const poses = useMemo(() => exercise.frames.map((f) => f.pose), [exercise]);
  // Breath direction per frame, as numbers — worklets cannot read strings from
  // a captured array cheaply, and a number comparison is free.
  const breaths = useMemo(
    () => exercise.frames.map((f) => (f.breath === 'in' ? 1 : f.breath === 'out' ? -1 : 0)),
    [exercise]
  );

  useEffect(() => {
    if (reduced || paused) {
      cancelAnimation(t);
      if (reduced) t.value = 0;
      return;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: total, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [exercise.id, total, reduced, paused, t]);

  /**
   * The current pose, derived once per frame and shared by every bone.
   *
   * Doing this in a single `useDerivedValue` rather than inside each bone's
   * `useAnimatedProps` matters: ten bones each recomputing the same
   * interpolation would be ten times the work for identical output.
   */
  const pose = useDerivedValue<Pose>(() => {
    'worklet';
    if (poses.length === 1) return poses[0];
    const k = t.value;
    let i = 0;
    while (i < bounds.length - 1 && k > bounds[i]) i++;
    const from = i === 0 ? 0 : bounds[i - 1];
    const span = bounds[i] - from || 1;
    const local = easeInOut((k - from) / span);
    // Frame i eases *into* pose i from pose i-1; the last frame wraps to the
    // first, which is what makes every exercise a seamless loop.
    const a = poses[i === 0 ? poses.length - 1 : i - 1];
    const b = poses[i];
    const out = {} as Pose;
    const keys = Object.keys(a) as Joint[];
    for (let n = 0; n < keys.length; n++) {
      const j = keys[n];
      out[j] = [
        a[j][0] + (b[j][0] - a[j][0]) * local,
        a[j][1] + (b[j][1] - a[j][1]) * local,
      ];
    }
    return out;
  }, [poses, bounds]);

  /** Breath phase, −1 (out) → 1 (in). Drives the ring only. */
  const breath = useDerivedValue(() => {
    'worklet';
    const k = t.value;
    let i = 0;
    while (i < bounds.length - 1 && k > bounds[i]) i++;
    const from = i === 0 ? 0 : bounds[i - 1];
    const span = bounds[i] - from || 1;
    const local = easeInOut((k - from) / span);
    const dir = breaths[i];
    // "hold" keeps whatever the previous frame reached, so a square-breathing
    // pattern visibly pauses rather than drifting back.
    if (dir === 0) return 0.5;
    return dir > 0 ? local : 1 - local;
  }, [bounds, breaths]);

  const ink = color ?? (isDark ? BLOOM.blossom.pastel : BLOOM.rose.deep);
  const S = 100;
  const scale = size / S;

  const strokeFor = (depth: number) => Math.max(3.6, size * 0.036) * (depth < 1 ? 0.86 : 1);

  const breathProps = useAnimatedProps(() => ({
    r: 34 + breath.value * 7,
    opacity: 0.1 + breath.value * 0.14,
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={`${exercise.title}: ${exercise.description}`}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
        {/* Breathing ring. Expands on the in-breath, settles on the out —
            the rhythm the user is meant to follow, without a word of text. */}
        {showBreath ? (
          <AnimatedCircle cx={50} cy={48} fill={ink} animatedProps={breathProps} />
        ) : null}

        {/* Ground line. Same trick as the illustrations: without something to
            rest on, a figure floats in a void. */}
        <Ellipse
          cx={52}
          cy={94}
          rx={40}
          ry={2.6}
          fill={c.textTertiary}
          opacity={isDark ? 0.16 : 0.13}
        />

        {BONES.map((b) => (
          <Bone key={`${b.a}-${b.b}`} pose={pose} a={b.a} bJoint={b.b} depth={b.depth} color={ink} width={strokeFor(b.depth) / scale} />
        ))}

        <Head pose={pose} color={ink} />
      </Svg>
    </View>
  );
};

/** One limb segment. Four animated props, no allocation. */
function Bone({
  pose,
  a,
  bJoint,
  depth,
  color,
  width,
}: {
  pose: SharedValue<Pose>;
  a: Joint;
  bJoint: Joint;
  depth: number;
  color: string;
  width: number;
}) {
  const props = useAnimatedProps(() => {
    'worklet';
    const p = pose.value;
    return { x1: p[a][0], y1: p[a][1], x2: p[bJoint][0], y2: p[bJoint][1] };
  });

  return (
    <AnimatedLine
      animatedProps={props}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      opacity={depth < 1 ? 0.42 : 1}
    />
  );
}

function Head({ pose, color }: { pose: SharedValue<Pose>; color: string }) {
  const props = useAnimatedProps(() => {
    'worklet';
    return { cx: pose.value.head[0], cy: pose.value.head[1] };
  });
  return <AnimatedCircle animatedProps={props} r={6.4} fill={color} />;
}

export default ExerciseFigure;

/**
 * Static thumbnail — the first keyframe, no animation, no clock.
 *
 * Used in list rows. A grid of twelve animating figures would blow the whole
 * budget this component was designed to protect, and a still pose is a
 * perfectly good thumbnail.
 */
export function ExerciseThumb({
  exercise,
  size = 56,
  color,
}: {
  exercise: Exercise;
  size?: number;
  color?: string;
}) {
  const { isDark } = useTheme();
  const pose = exercise.frames[0].pose;
  const ink = color ?? (isDark ? BLOOM.blossom.pastel : BLOOM.rose.deep);
  const w = Math.max(2.6, size * 0.05);

  /**
   * Frame the pose to its own bounding box.
   *
   * Poses are authored in a shared 0–100 space so that *animation* between
   * them is coherent — a figure must not jump around the canvas mid-movement.
   * That is right for the player and wrong for a 46px thumbnail: a curled-up
   * pose like Knees to Chest occupies one corner of that space and renders as
   * a tiny squiggle in the bottom-left with two thirds of the tile empty.
   *
   * So the thumbnail — and only the thumbnail — fits the viewBox to the actual
   * extent of the pose. Every row then reads at the same visual weight
   * regardless of how compact the shape is.
   */
  const box = (() => {
    const pts = Object.values(pose);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const pad = 12;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    // Square, so the figure is never stretched in one axis.
    const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) + pad;
    return { minX, minY, span };
  })();

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg
        width={size}
        height={size}
        viewBox={`${box.minX} ${box.minY} ${box.span} ${box.span}`}
      >
        {BONES.map((b) => (
          <Line
            key={`${b.a}-${b.b}`}
            x1={pose[b.a][0]}
            y1={pose[b.a][1]}
            x2={pose[b.b][0]}
            y2={pose[b.b][1]}
            stroke={ink}
            strokeWidth={(w * box.span) / size}
            strokeLinecap="round"
            opacity={b.depth < 1 ? 0.42 : 1}
          />
        ))}
        <Circle cx={pose.head[0]} cy={pose.head[1]} r={box.span * 0.075} fill={ink} />
      </Svg>
    </View>
  );
}
