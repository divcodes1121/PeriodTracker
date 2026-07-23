import { Platform, TextStyle, ViewStyle } from 'react-native';
import { fontScale, scale } from '../utils/responsive';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BLOOMLY — Design tokens. The single source of truth for the language.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Five principles, all of them encoded here rather than described in a wiki:
 *
 * 1. **Space is the material.** The scale is 4-based and deliberately generous.
 *    When unsure, take the larger step. Nothing in Bloomly is ever cramped.
 *
 * 2. **Corners are soft everywhere.** Radii run one to two steps rounder than
 *    a system-default app. A 28pt radius on a 200pt card is the single cheapest
 *    thing that makes an interface feel kind.
 *
 * 3. **Depth is warm light, never a line.** Shadows are rose-tinted, wide and
 *    faint — light falling on paper. A neutral black shadow under a pastel card
 *    reads as grey sludge, which is why `shadowColor` is a plum here.
 *
 * 4. **Type carries hierarchy, colour does not.** Size + weight + optical
 *    tracking. A heading is never "the pink one".
 *
 * 5. **Motion settles, it never bounces.** Springs are damped. The one place
 *    overshoot is allowed is `springBloom`, reserved for things that literally
 *    bloom — petals opening, a mood face popping, a chip filling.
 */

// ───────────────────────────────────────────────────────────────────────────
// Type faces
// ───────────────────────────────────────────────────────────────────────────

/** Body face — the system stack. Optimised for reading at small sizes. */
export const FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}) as string;

/**
 * Display face — headings, hero numerals, the greeting.
 *
 * Bloomly wants a *rounded* face here; roundness in the letterforms is what
 * separates "friendly" from "clinical" faster than any amount of colour. What
 * each platform can actually give us today, honestly:
 *
 *   iOS      SF Pro Rounded ships with the OS and resolves by name. Real win.
 *   Android  no rounded system face exists. `sans-serif-medium` is the closest
 *            and mostly buys optical weight, not roundness.
 *   Web      whatever rounded face the machine happens to have, then system.
 *
 * If the name fails to resolve the platform silently falls back to the system
 * face — degraded, never broken.
 *
 * **The upgrade path is one line.** Bundle a rounded family (Nunito and
 * Quicksand both suit the brand) via `expo-font`, then set this constant to its
 * family name. Nothing else in the app needs to change, because every string
 * goes through `components/Text` and every heading reads `TYPE.*`.
 */
export const FONT_DISPLAY = Platform.select({
  ios: 'SF Pro Rounded',
  android: 'sans-serif-medium',
  default:
    'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", Quicksand, Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}) as string;

// ───────────────────────────────────────────────────────────────────────────
// Space
// ───────────────────────────────────────────────────────────────────────────

/**
 * 4-based spacing scale.
 *
 * The named steps above `xxl` are *composition* steps, not sizes: `h1`–`h4` are
 * the gaps that separate ideas from each other. Using `lg` where `h2` belongs
 * is how a page turns into an undifferentiated list — the failure this scale
 * exists to prevent.
 */
export const SPACE = {
  xxs: scale(2),
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
  /** Between related blocks. */
  h1: scale(32),
  /** Between clusters — the workhorse section break. */
  h2: scale(44),
  /** Between major regions of a long page. */
  h3: scale(56),
  /** Hero breathing room. */
  h4: scale(72),
  /** Gutter from the screen edge to content. Wide — the app has room. */
  gutter: scale(22),
  /** Reserved at the bottom of scrollviews so the tab bar never overlaps. */
  tabSafe: scale(124),
};

/**
 * Radii. Everything is rounder than a system default by design.
 *
 * `card` at 28 and `hero` at 34 are the two that carry the brand. Going below
 * ~20 on anything larger than a chip makes the surface read as a dialog.
 */
export const RADIUS = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 22,
  /** The default card. */
  card: 28,
  /** Hero surfaces and the Bloom Ring plate. */
  hero: 34,
  /** Bottom sheets — top corners only. */
  sheet: 32,
  pill: 999,
};

// ───────────────────────────────────────────────────────────────────────────
// Type scale
// ───────────────────────────────────────────────────────────────────────────

/**
 * Line heights run generous (~1.4–1.5 on body) because Bloomly is read while
 * tired, in bed, one-handed. Tracking tightens as size grows, which is what
 * keeps a 40pt heading from looking like it has gaps in it.
 *
 * Display sizes use FONT_DISPLAY; everything from `headline` down uses FONT,
 * because a rounded face at 13pt loses more legibility than it gains warmth.
 */
export const TYPE = {
  /** Hero numerals — the cycle day, a big stat. Nothing else. */
  display: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontScale(46),
    lineHeight: fontScale(50),
    fontWeight: '700',
    letterSpacing: -1.4,
  } as TextStyle,
  /** Screen titles. */
  title1: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontScale(33),
    lineHeight: fontScale(40),
    fontWeight: '700',
    letterSpacing: -0.7,
  } as TextStyle,
  /** Section heroes, phase names. */
  title2: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontScale(27),
    lineHeight: fontScale(34),
    fontWeight: '700',
    letterSpacing: -0.5,
  } as TextStyle,
  /** Card titles that need presence, the greeting. */
  title3: {
    fontFamily: FONT_DISPLAY,
    fontSize: fontScale(22),
    lineHeight: fontScale(29),
    fontWeight: '600',
    letterSpacing: -0.35,
  } as TextStyle,
  /** Card headings and list rows. */
  headline: {
    fontFamily: FONT,
    fontSize: fontScale(17),
    lineHeight: fontScale(23),
    fontWeight: '600',
    letterSpacing: -0.2,
  } as TextStyle,
  body: {
    fontFamily: FONT,
    fontSize: fontScale(16),
    lineHeight: fontScale(25),
    fontWeight: '400',
    letterSpacing: -0.1,
  } as TextStyle,
  callout: {
    fontFamily: FONT,
    fontSize: fontScale(15),
    lineHeight: fontScale(22),
    fontWeight: '400',
    letterSpacing: -0.1,
  } as TextStyle,
  subhead: {
    fontFamily: FONT,
    fontSize: fontScale(14),
    lineHeight: fontScale(20),
    fontWeight: '500',
    letterSpacing: 0,
  } as TextStyle,
  caption: {
    fontFamily: FONT,
    fontSize: fontScale(13),
    lineHeight: fontScale(19),
    fontWeight: '400',
    letterSpacing: 0,
  } as TextStyle,
  /**
   * Eyebrow labels. Bloomly uses *sentence case with open tracking* rather than
   * SCREAMING CAPS — all-caps is the single most institutional thing a soft app
   * can do, and it costs legibility at 11pt for nothing.
   */
  overline: {
    fontFamily: FONT,
    fontSize: fontScale(12),
    lineHeight: fontScale(16),
    fontWeight: '600',
    letterSpacing: 0.4,
  } as TextStyle,
  button: {
    fontFamily: FONT,
    fontSize: fontScale(16),
    lineHeight: fontScale(21),
    fontWeight: '600',
    letterSpacing: -0.1,
  } as TextStyle,
};

/**
 * Tabular figures keep animated counters from jittering as digits change. RN
 * maps this to font-variant-numeric on web and the real OpenType feature on
 * native.
 */
export const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

// ───────────────────────────────────────────────────────────────────────────
// Elevation
// ───────────────────────────────────────────────────────────────────────────

/**
 * Warm light, not black fog.
 *
 * `shadowColor` is a desaturated plum. Black shadow under a blush card turns
 * the halo grey and instantly cheapens the surface — the shadow has to belong
 * to the same world as the thing casting it.
 *
 * Offsets are large relative to opacity: wide and faint reads as *daylight in a
 * room*; tight and dark reads as a drop-shadow filter.
 */
const shadow = (y: number, blur: number, opacity: number, elevation: number): ViewStyle => ({
  shadowColor: '#7A4356',
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: blur,
  elevation,
});

export const SHADOW = {
  /** Resting state for small controls, chips. */
  xs: shadow(2, 6, 0.06, 1),
  /** Default card. */
  sm: shadow(6, 18, 0.08, 3),
  /** Raised card, sheets, the FAB at rest. */
  md: shadow(12, 30, 0.11, 7),
  /** Hero surfaces, the FAB, floating actions. */
  lg: shadow(20, 48, 0.14, 14),
  /** The Bloom Ring plate only. */
  xl: shadow(28, 64, 0.17, 20),
  none: {} as ViewStyle,
};

/**
 * Dark mode needs deeper, tighter shadows or they vanish entirely — and it
 * needs a near-black colour, because a plum shadow on a plum canvas is
 * invisible.
 */
export const SHADOW_DARK = {
  xs: { ...shadow(2, 6, 0.34, 1), shadowColor: '#000' },
  sm: { ...shadow(6, 18, 0.42, 3), shadowColor: '#000' },
  md: { ...shadow(12, 30, 0.52, 7), shadowColor: '#000' },
  lg: { ...shadow(20, 48, 0.6, 14), shadowColor: '#000' },
  xl: { ...shadow(28, 64, 0.68, 20), shadowColor: '#000' },
  none: {} as ViewStyle,
};

// ───────────────────────────────────────────────────────────────────────────
// Motion
// ───────────────────────────────────────────────────────────────────────────

/**
 * Durations are short; the personality lives in the spring, not in long fades.
 *
 * The scale below is the whole motion vocabulary of the app. If a screen wants
 * a number that isn't here, the answer is almost always that it wants one of
 * these and hasn't decided which.
 */
export const MOTION = {
  /** Press feedback, selection ticks. Below this the eye reads it as instant. */
  instant: 120,
  /** Chips filling, toggles, small state changes. */
  fast: 220,
  /** The default: cards entering, sheets, cross-fades. */
  base: 340,
  /** Big transitions — phase change, environment cross-fade. */
  slow: 520,
  /** A bloom opening. Slow enough to watch, short enough not to block. */
  bloom: 900,
  /** Ambient/looping motion — breathing glows, ring sweeps, drifting petals. */
  ambient: 4200,
  /** Delay between sibling cards revealing. Reveal multiplies by its index. */
  stagger: 70,

  /** Settled, never bouncy. The default for anything that moves. */
  spring: { damping: 18, stiffness: 180, mass: 0.9 },
  /** Slow and heavy — sheets, large surfaces. */
  springSoft: { damping: 22, stiffness: 120, mass: 1 },
  /** Quick and tight — press states, marker dots. */
  springSnap: { damping: 15, stiffness: 260, mass: 0.7 },
  /**
   * The one spring allowed to overshoot. Reserved for things that literally
   * bloom: petals opening, a mood face landing, a chip filling, confetti. Used
   * anywhere else it turns the app into a toy.
   */
  springBloom: { damping: 11, stiffness: 150, mass: 0.8 },
};

/**
 * Breathing rhythm shared by the ambient glow, the Bloom Ring halo and the
 * breathing exercise, so the whole app inhales together rather than each
 * component picking its own tempo. 4s in, 6s out — a real calming ratio,
 * borrowed from box breathing.
 */
export const BREATH = { inSec: 4, outSec: 6 };

// ───────────────────────────────────────────────────────────────────────────
// Touch
// ───────────────────────────────────────────────────────────────────────────

export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
/** Apple HIG minimum. Bloomly's own floor is higher — see MIN_TAP_COMFORT. */
export const MIN_TAP = 44;
/**
 * The size Bloomly actually uses for anything a user taps while tired,
 * one-handed, in low light. Chips, mood faces and quick actions all sit here.
 */
export const MIN_TAP_COMFORT = 56;
