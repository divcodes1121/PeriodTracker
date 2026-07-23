import { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { BLOOM } from '../constants';
import { MOTION } from '../theme/tokens';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BLOOMLY — Illustrations.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Flat, pastel, soft-curved, minimal. Every scene is built from the same four
 * moves, and that shared construction — not the subject matter — is what makes
 * a butterfly and a shield read as the same brand:
 *
 *   1. **A ground.** One wide, very faint ellipse under the subject. Without it
 *      a flat illustration floats in a void; with it the object is *resting on
 *      something*. This is the cheapest craft signal in the whole set.
 *   2. **Two values per shape.** A pastel body and one darker facet, never a
 *      gradient mesh. Flat means flat.
 *   3. **A single accent.** Exactly one element in a warmer or cooler hue than
 *      the rest, to give the eye somewhere to land.
 *   4. **No outlines.** Shapes are separated by value, not by stroke. An
 *      outlined flat illustration is a colouring book; an unoutlined one is a
 *      paper cut-out, which is the register Bloomly wants.
 *
 * ── Why these are code and not PNGs ───────────────────────────────────────
 *
 * They re-tint per theme (a lavender that works on cream is invisible on plum
 * ink), they scale to any size without a @3x set, they animate their own
 * ambient loop, and they add zero bytes to the bundle. A raster set would need
 * all of that solved twice.
 *
 * ── Motion budget ─────────────────────────────────────────────────────────
 *
 * At most **one** animated node per illustration, and it is always a slow
 * whole-object sway or breath — never per-petal. These sit inside cards that
 * are already animating; a second competing rhythm makes a page feel nervous
 * rather than alive. Reduced motion renders the still frame.
 */

export type IllustrationName =
  /** The brand mark. A flower in full bloom. Splash, onboarding, achievements. */
  | 'bloom'
  /** A seedling. Growth, empty states, "nothing here yet — but it will be". */
  | 'sprout'
  /** Crescent moon and stars. Sleep, night, rest, the luteal phase. */
  | 'moon'
  /** Sun behind a cloud. Mornings, energy, the follicular phase. */
  | 'sunrise'
  /** A butterfly. Mood, delight, change. */
  | 'butterfly'
  /** A small bird. Community, encouragement, someone else out there. */
  | 'bird'
  /** A shield with a flower inside. Privacy — protection that isn't a padlock. */
  | 'shield'
  /** Flowers in a vase. Journal, self-care, tending. */
  | 'vase'
  /** A calendar page sprouting. Tracking, the calendar's empty state. */
  | 'calendar'
  /** Drifting petals. Loading, transitions, the quiet in-between. */
  | 'petals'
  /** A teacup with steam. Reset, breathing, taking a minute. */
  | 'teacup'
  /** A soft rainbow. Errors and empty states that must never feel like failure. */
  | 'rainbow';

interface IllustrationProps {
  name: IllustrationName;
  size?: number;
  /** Ambient sway/breath. Default on — these are meant to feel alive. */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Decorative by default; pass a label when the image carries meaning. */
  accessibilityLabel?: string;
}

/**
 * Per-theme ink for the illustrations.
 *
 * Dark mode does **not** simply darken: pastels that read as soft on cream go
 * muddy on plum, so the dark set lifts saturation and drops the ground shadow
 * to a highlight instead. Same drawings, re-lit.
 */
function usePalette() {
  const { isDark } = useTheme();
  return {
    isDark,
    rose: BLOOM.rose.pastel,
    roseDeep: isDark ? BLOOM.rose.deep : '#D8628A',
    blossom: BLOOM.blossom.pastel,
    peach: BLOOM.peach.pastel,
    peachDeep: '#EE9E6E',
    gold: BLOOM.gold.pastel,
    goldDeep: '#CE9C3E',
    lavender: BLOOM.lavender.pastel,
    lilac: BLOOM.lilac.pastel,
    sage: BLOOM.sage.pastel,
    sageDeep: '#7FAE8A',
    coral: BLOOM.coral.pastel,
    sky: BLOOM.sky.pastel,
    cream: isDark ? '#2A2230' : '#FFF6F0',
    /** The ground ellipse. A shadow in light, a pool of light in dark. */
    ground: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,67,86,0.07)',
  };
}

/** A five-petal flower around (cx, cy). The set's most reused primitive. */
function Flower({
  cx,
  cy,
  r,
  fill,
  core,
  petals = 5,
  rotate = 0,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  core: string;
  petals?: number;
  rotate?: number;
}) {
  return (
    <G transform={`translate(${cx} ${cy}) rotate(${rotate})`}>
      {Array.from({ length: petals }, (_, i) => {
        const a = (i / petals) * 360;
        return (
          <Ellipse
            key={i}
            cx={0}
            cy={-r * 0.62}
            rx={r * 0.36}
            ry={r * 0.62}
            fill={fill}
            transform={`rotate(${a})`}
          />
        );
      })}
      <Circle cx={0} cy={0} r={r * 0.3} fill={core} />
    </G>
  );
}

/** The ground ellipse every scene sits on. */
function Ground({ cx, cy, rx, fill }: { cx: number; cy: number; rx: number; fill: string }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.16} fill={fill} />;
}

const Illustration = ({
  name,
  size = 160,
  animated = true,
  style,
  accessibilityLabel,
}: IllustrationProps) => {
  const p = usePalette();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  const alive = animated && !reduced;

  useEffect(() => {
    if (!alive) {
      t.value = 0;
      return;
    }
    // One slow loop, shared by every scene. Each scene reads it differently
    // (sway, breath, bob) but they all inhale on the same clock — which is why
    // a screen with three illustrations feels calm instead of busy.
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: MOTION.ambient, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: MOTION.ambient, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(t);
  }, [alive, t]);

  // Scenes with a stem sway; scenes without one breathe. Both are the same
  // node — the difference is only which channel it drives.
  const sways = name === 'bloom' || name === 'sprout' || name === 'vase' || name === 'calendar';

  const anim = useAnimatedStyle(() => {
    if (sways) {
      return { transform: [{ rotate: `${(t.value - 0.5) * 3}deg` }] };
    }
    return {
      transform: [{ translateY: (t.value - 0.5) * 5 }, { scale: 1 + t.value * 0.014 }],
    };
  });

  const S = 100; // every scene is authored on a 100×100 grid

  return (
    <Animated.View
      style={[{ width: size, height: size }, anim, style]}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`}>
        <Defs>
          <LinearGradient id={`ill-sky-${name}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.gold} stopOpacity={p.isDark ? 0.3 : 0.45} />
            <Stop offset="1" stopColor={p.peach} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* ── bloom ─────────────────────────────────────────────────────── */}
        {name === 'bloom' && (
          <>
            <Ground cx={50} cy={88} rx={26} fill={p.ground} />
            <Path d="M50 88V46" stroke={p.sage} strokeWidth={4} strokeLinecap="round" />
            <Path
              d="M50 68C42 68 36 63 35 56c8-2 14 2 15 12z"
              fill={p.sage}
              opacity={0.85}
            />
            <Path d="M50 60c8 0 14-5 15-12-8-2-14 2-15 12z" fill={p.sageDeep} opacity={0.6} />
            {/* Back layer offset so the flower has depth without a gradient. */}
            <Flower cx={50} cy={40} r={26} fill={p.blossom} core={p.gold} petals={6} rotate={30} />
            <Flower cx={50} cy={40} r={21} fill={p.rose} core={p.gold} petals={6} />
            <Circle cx={50} cy={40} r={5} fill={p.goldDeep} />
          </>
        )}

        {/* ── sprout ────────────────────────────────────────────────────── */}
        {name === 'sprout' && (
          <>
            <Ground cx={50} cy={84} rx={28} fill={p.ground} />
            <Path
              d="M28 84c0-8 10-13 22-13s22 5 22 13z"
              fill={p.peach}
              opacity={p.isDark ? 0.5 : 0.7}
            />
            <Path d="M50 78V50" stroke={p.sageDeep} strokeWidth={3.5} strokeLinecap="round" />
            <Path d="M50 62C40 62 33 56 32 47c10-2 17 4 18 15z" fill={p.sage} />
            <Path d="M50 56c9 0 15-6 16-14-9-2-15 4-16 14z" fill={p.sageDeep} opacity={0.75} />
            <Circle cx={50} cy={46} r={5.5} fill={p.rose} />
            <Circle cx={50} cy={46} r={2} fill={p.gold} />
          </>
        )}

        {/* ── moon ──────────────────────────────────────────────────────── */}
        {name === 'moon' && (
          <>
            <Circle cx={52} cy={48} r={30} fill={p.lilac} opacity={p.isDark ? 0.28 : 0.35} />
            {/* Crescent by subtraction: two circles, the second in canvas colour.
                Cheaper and crisper than a masked path, and it stays flat. */}
            <Circle cx={48} cy={46} r={24} fill={p.lavender} />
            <Circle cx={60} cy={38} r={21} fill={p.cream} />
            <Circle cx={22} cy={26} r={2.6} fill={p.gold} />
            <Circle cx={78} cy={68} r={2} fill={p.gold} opacity={0.8} />
            <Circle cx={30} cy={72} r={1.6} fill={p.blossom} />
            <Path
              d="M74 20l1.6 4.4L80 26l-4.4 1.6L74 32l-1.6-4.4L68 26l4.4-1.6z"
              fill={p.gold}
              opacity={0.9}
            />
          </>
        )}

        {/* ── sunrise ───────────────────────────────────────────────────── */}
        {name === 'sunrise' && (
          <>
            <Circle cx={50} cy={52} r={34} fill={`url(#ill-sky-${name})`} />
            <Circle cx={50} cy={50} r={18} fill={p.gold} />
            <Path
              d="M26 70c0-6 5-10 11-10 2-6 8-10 15-10s13 4 15 10c6 0 10 4 10 10z"
              fill={p.cream}
              opacity={p.isDark ? 0.22 : 0.92}
            />
            <Path d="M22 76h56" stroke={p.peachDeep} strokeWidth={3.5} strokeLinecap="round" />
            <Path d="M32 84h36" stroke={p.peach} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
          </>
        )}

        {/* ── butterfly ─────────────────────────────────────────────────── */}
        {name === 'butterfly' && (
          <>
            <Ground cx={50} cy={86} rx={18} fill={p.ground} />
            <Ellipse cx={34} cy={40} rx={18} ry={22} fill={p.lavender} transform="rotate(-18 34 40)" />
            <Ellipse cx={66} cy={40} rx={18} ry={22} fill={p.lavender} transform="rotate(18 66 40)" />
            <Ellipse cx={37} cy={64} rx={13} ry={15} fill={p.blossom} transform="rotate(-12 37 64)" />
            <Ellipse cx={63} cy={64} rx={13} ry={15} fill={p.blossom} transform="rotate(12 63 64)" />
            <Circle cx={33} cy={38} r={4} fill={p.lilac} />
            <Circle cx={67} cy={38} r={4} fill={p.lilac} />
            <Ellipse cx={50} cy={52} rx={4} ry={20} fill={p.roseDeep} />
            <Path
              d="M48 33c-3-6-8-9-13-9M52 33c3-6 8-9 13-9"
              stroke={p.roseDeep}
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
            />
          </>
        )}

        {/* ── bird ──────────────────────────────────────────────────────── */}
        {name === 'bird' && (
          <>
            <Path d="M14 78h72" stroke={p.sageDeep} strokeWidth={3.5} strokeLinecap="round" />
            <Path d="M62 78c6-3 10-8 11-14" stroke={p.sage} strokeWidth={3} strokeLinecap="round" fill="none" />
            <Circle cx={74} cy={62} r={4} fill={p.sage} />
            <Ellipse cx={46} cy={56} rx={22} ry={17} fill={p.sky} />
            <Circle cx={64} cy={45} r={11} fill={p.sky} />
            <Path d="M38 54c6-6 15-6 21 0-5 8-16 8-21 0z" fill={p.cream} opacity={0.55} />
            <Path d="M73 45l9 3-9 4z" fill={p.gold} />
            <Circle cx={67} cy={43} r={1.9} fill={p.isDark ? '#120E14' : '#3A2A32'} />
            <Path d="M42 70l-3 10M52 71l1 10" stroke={p.goldDeep} strokeWidth={2.4} strokeLinecap="round" />
          </>
        )}

        {/* ── shield ────────────────────────────────────────────────────── */}
        {name === 'shield' && (
          <>
            <Ground cx={50} cy={92} rx={22} fill={p.ground} />
            <Path
              d="M50 12l30 11v24c0 20-13 33-30 39-17-6-30-19-30-39V23z"
              fill={p.lilac}
              opacity={p.isDark ? 0.42 : 0.6}
            />
            <Path
              d="M50 20l23 8.5v18c0 15.5-10 25.5-23 30.5-13-5-23-15-23-30.5v-18z"
              fill={p.cream}
              opacity={p.isDark ? 0.16 : 0.95}
            />
            <Flower cx={50} cy={45} r={16} fill={p.lavender} core={p.gold} petals={5} />
          </>
        )}

        {/* ── vase ──────────────────────────────────────────────────────── */}
        {name === 'vase' && (
          <>
            <Ground cx={50} cy={90} rx={26} fill={p.ground} />
            <Path d="M50 62V40M50 58l-13-12M50 54l13-14" stroke={p.sage} strokeWidth={3} strokeLinecap="round" fill="none" />
            <Flower cx={50} cy={34} r={14} fill={p.rose} core={p.gold} />
            <Flower cx={35} cy={42} r={11} fill={p.blossom} core={p.gold} rotate={20} />
            <Flower cx={65} cy={36} r={11} fill={p.lavender} core={p.gold} rotate={-25} />
            <Path
              d="M36 62h28l-4 26a4 4 0 0 1-4 3.5H44a4 4 0 0 1-4-3.5z"
              fill={p.peach}
            />
            <Path d="M36 62h28l-1.4 9H37.4z" fill={p.peachDeep} opacity={0.55} />
          </>
        )}

        {/* ── calendar ──────────────────────────────────────────────────── */}
        {name === 'calendar' && (
          <>
            <Ground cx={50} cy={90} rx={28} fill={p.ground} />
            <Path
              d="M20 30a6 6 0 0 1 6-6h48a6 6 0 0 1 6 6v50a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6z"
              fill={p.cream}
              opacity={p.isDark ? 0.2 : 1}
            />
            <Path d="M20 30a6 6 0 0 1 6-6h48a6 6 0 0 1 6 6v9H20z" fill={p.rose} />
            <Path d="M33 18v10M67 18v10" stroke={p.roseDeep} strokeWidth={4} strokeLinecap="round" />
            <Circle cx={33} cy={52} r={3.4} fill={p.blossom} />
            <Circle cx={50} cy={52} r={3.4} fill={p.blossom} opacity={0.55} />
            <Circle cx={67} cy={52} r={3.4} fill={p.blossom} opacity={0.55} />
            <Circle cx={33} cy={68} r={3.4} fill={p.blossom} opacity={0.55} />
            <Flower cx={58} cy={68} r={13} fill={p.lavender} core={p.gold} />
          </>
        )}

        {/* ── petals ────────────────────────────────────────────────────── */}
        {name === 'petals' && (
          <>
            <Ellipse cx={30} cy={30} rx={9} ry={15} fill={p.blossom} transform="rotate(-30 30 30)" />
            <Ellipse cx={62} cy={22} rx={7} ry={12} fill={p.rose} opacity={0.8} transform="rotate(25 62 22)" />
            <Ellipse cx={72} cy={54} rx={10} ry={16} fill={p.lavender} opacity={0.75} transform="rotate(-15 72 54)" />
            <Ellipse cx={38} cy={62} rx={8} ry={13} fill={p.peach} opacity={0.85} transform="rotate(40 38 62)" />
            <Ellipse cx={56} cy={80} rx={6} ry={10} fill={p.blossom} opacity={0.6} transform="rotate(-40 56 80)" />
            <Circle cx={20} cy={62} r={2.4} fill={p.gold} opacity={0.7} />
            <Circle cx={84} cy={34} r={2} fill={p.gold} opacity={0.6} />
          </>
        )}

        {/* ── teacup ────────────────────────────────────────────────────── */}
        {name === 'teacup' && (
          <>
            <Ground cx={50} cy={84} rx={26} fill={p.ground} />
            <Path
              d="M32 30c6-8 6-13 0-20M50 30c6-8 6-13 0-20M68 30c6-8 6-13 0-20"
              stroke={p.lilac}
              strokeWidth={3.2}
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />
            <Path d="M24 42h52l-5 30a8 8 0 0 1-8 7H37a8 8 0 0 1-8-7z" fill={p.cream} opacity={p.isDark ? 0.25 : 1} />
            <Path d="M24 42h52l-1.6 10H25.6z" fill={p.lavender} />
            <Path
              d="M76 48c8 0 12 5 12 11s-5 10-12 10"
              stroke={p.lavender}
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
            />
            <Ellipse cx={50} cy={42} rx={26} ry={5} fill={p.lavender} opacity={0.5} />
          </>
        )}

        {/* ── rainbow ───────────────────────────────────────────────────── */}
        {name === 'rainbow' && (
          <>
            <Path d="M14 74a36 36 0 0 1 72 0" stroke={p.rose} strokeWidth={9} fill="none" strokeLinecap="round" />
            <Path d="M25 74a25 25 0 0 1 50 0" stroke={p.peach} strokeWidth={9} fill="none" strokeLinecap="round" />
            <Path d="M36 74a14 14 0 0 1 28 0" stroke={p.lavender} strokeWidth={9} fill="none" strokeLinecap="round" />
            <Ellipse cx={20} cy={78} rx={13} ry={8} fill={p.cream} opacity={p.isDark ? 0.2 : 0.95} />
            <Ellipse cx={80} cy={78} rx={13} ry={8} fill={p.cream} opacity={p.isDark ? 0.2 : 0.95} />
            <Circle cx={50} cy={22} r={2.6} fill={p.gold} />
          </>
        )}
      </Svg>
    </Animated.View>
  );
};

export default Illustration;

/**
 * Convenience wrapper for the common case: an illustration centred above a
 * message. Used by every empty state, error state and onboarding page, so the
 * vertical rhythm around illustrations is decided once instead of eleven times.
 */
export function IllustrationBlock({
  name,
  size = 150,
  children,
  style,
}: {
  name: IllustrationName;
  size?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <Illustration name={name} size={size} />
      {children}
    </View>
  );
}
