import { Platform, TextStyle, ViewStyle } from 'react-native';
import { fontScale, scale } from '../utils/responsive';

/**
 * Design tokens — the single source of truth for the editorial design language.
 *
 * Principles encoded here:
 * - Space is the primary design material. The scale is generous and 4-based.
 * - Type carries hierarchy (size + weight + optical letter-spacing), not color.
 * - Depth comes from large, soft, low-opacity shadows — never from borders.
 * - Color is an accent. Screens are ~80% neutral by construction.
 */

/** SF Pro on Apple platforms, the closest system equivalent elsewhere. */
export const FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}) as string;

/** 4-based spacing scale. Prefer the larger step when unsure — things should breathe. */
export const SPACE = {
  xxs: scale(2),
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
  h1: scale(32),
  h2: scale(40),
  h3: scale(48),
  h4: scale(64),
  /** Gutter from the screen edge to content. */
  gutter: scale(20),
  /** Space reserved at the bottom of scrollviews so the tab bar never overlaps. */
  tabSafe: scale(112),
};

export const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  card: 24,
  sheet: 28,
  pill: 999,
};

/**
 * Type scale, SF Pro Display style: tight optical tracking on large sizes,
 * neutral on body, slightly open on small uppercase labels.
 */
export const TYPE = {
  /** Hero numerals and screen-defining statements. */
  display: {
    fontFamily: FONT,
    fontSize: fontScale(40),
    lineHeight: fontScale(44),
    fontWeight: '700',
    letterSpacing: -1,
  } as TextStyle,
  title1: {
    fontFamily: FONT,
    fontSize: fontScale(32),
    lineHeight: fontScale(38),
    fontWeight: '700',
    letterSpacing: -0.6,
  } as TextStyle,
  title2: {
    fontFamily: FONT,
    fontSize: fontScale(26),
    lineHeight: fontScale(32),
    fontWeight: '700',
    letterSpacing: -0.4,
  } as TextStyle,
  title3: {
    fontFamily: FONT,
    fontSize: fontScale(21),
    lineHeight: fontScale(27),
    fontWeight: '600',
    letterSpacing: -0.3,
  } as TextStyle,
  /** Card headings and list rows. */
  headline: {
    fontFamily: FONT,
    fontSize: fontScale(17),
    lineHeight: fontScale(22),
    fontWeight: '600',
    letterSpacing: -0.2,
  } as TextStyle,
  body: {
    fontFamily: FONT,
    fontSize: fontScale(16),
    lineHeight: fontScale(24),
    fontWeight: '400',
    letterSpacing: -0.1,
  } as TextStyle,
  callout: {
    fontFamily: FONT,
    fontSize: fontScale(15),
    lineHeight: fontScale(21),
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
    lineHeight: fontScale(18),
    fontWeight: '400',
    letterSpacing: 0,
  } as TextStyle,
  /** Small uppercase eyebrow labels — the only place we open tracking up. */
  overline: {
    fontFamily: FONT,
    fontSize: fontScale(11),
    lineHeight: fontScale(14),
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  button: {
    fontFamily: FONT,
    fontSize: fontScale(16),
    lineHeight: fontScale(21),
    fontWeight: '600',
    letterSpacing: -0.2,
  } as TextStyle,
};

/**
 * Tabular figures keep animated counters from jittering as digits change.
 * RN maps fontVariant to font-variant-numeric on web and to the real
 * OpenType feature on native.
 */
export const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

/**
 * Premium elevation: wide, soft, barely-there. Shadows are warm (tinted with
 * the text color) rather than pure black, which reads as grey sludge on a
 * warm off-white canvas.
 */
const shadow = (y: number, blur: number, opacity: number, elevation: number): ViewStyle => ({
  shadowColor: '#1E1E22',
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: blur,
  elevation,
});

export const SHADOW = {
  /** Resting state for small controls. */
  xs: shadow(1, 3, 0.04, 1),
  /** Default card. */
  sm: shadow(2, 10, 0.05, 2),
  /** Raised card, sheets. */
  md: shadow(8, 24, 0.07, 6),
  /** Hero surfaces and floating actions. */
  lg: shadow(16, 40, 0.09, 12),
  none: {} as ViewStyle,
};

/** Dark mode needs deeper, tighter shadows or they vanish entirely. */
export const SHADOW_DARK = {
  xs: { ...shadow(1, 3, 0.3, 1), shadowColor: '#000' },
  sm: { ...shadow(2, 10, 0.35, 2), shadowColor: '#000' },
  md: { ...shadow(8, 24, 0.45, 6), shadowColor: '#000' },
  lg: { ...shadow(16, 40, 0.55, 12), shadowColor: '#000' },
  none: {} as ViewStyle,
};

/**
 * Motion. Durations are short; the personality lives in the spring, not in
 * long fades. Stagger is the unit of delay between sibling cards revealing.
 */
export const MOTION = {
  instant: 120,
  fast: 220,
  base: 320,
  slow: 480,
  /** Ambient/looping motion (breathing glows, ring sweeps). */
  ambient: 4000,
  stagger: 60,
  /** Springs tuned to feel settled, never bouncy-toy. */
  spring: { damping: 18, stiffness: 180, mass: 0.9 },
  springSoft: { damping: 22, stiffness: 120, mass: 1 },
  springSnap: { damping: 15, stiffness: 260, mass: 0.7 },
};

/** Minimum interactive size — Apple HIG is 44pt, we don't go below it. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TAP = 44;
