import { Dimensions } from 'react-native';

/**
 * Responsive scaling helpers.
 *
 * Sizes in the design were drawn against a 375pt-wide reference (iPhone).
 * `scale` grows/shrinks a value with the screen width, but the width is
 * clamped so phones scale naturally while tablets/desktop-web don't blow up.
 */
const GUIDELINE_BASE_WIDTH = 375;

const { width, height } = Dimensions.get('window');
const shortEdge = Math.min(width, height);
// Clamp so very wide screens (tablet, web) stop scaling text into giant sizes.
const clampedWidth = Math.min(shortEdge, 480);

export const scale = (size: number): number =>
  Math.round((clampedWidth / GUIDELINE_BASE_WIDTH) * size * 100) / 100;

/** Softer scaling for fonts — only applies a fraction of the size delta. */
export const fontScale = (size: number, factor = 0.5): number =>
  Math.round((size + (scale(size) - size) * factor) * 100) / 100;

/** Content column cap so screens stay centered and readable on wide displays. */
export const CONTENT_MAX_WIDTH = 520;

export const screen = { width, height, shortEdge };

export const isTablet = shortEdge >= 600;
