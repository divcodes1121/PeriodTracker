/**
 * Theme palettes for the editorial design language.
 *
 * The canvas is a warm off-white (never pure #FFF — it reads clinical and makes
 * white cards invisible). Cards are pure white and separate from the canvas by
 * a soft shadow, not a border. Brand color lives in constants/COLORS and is used
 * sparingly: roughly 80% of any screen should be neutral.
 *
 * Components read these through useTheme() so a theme switch re-renders the app.
 */

export interface ThemePalette {
  // ---- Canvas & surfaces -------------------------------------------------
  /** App background. Warm off-white in light, warm charcoal in dark. */
  bg: string;
  /** Recessed background for grouped/inset sections. */
  bgSecondary: string;
  /** Card surface. */
  card: string;
  /** A card sitting on top of another card. */
  cardElevated: string;
  /** Very subtle wash tinted toward the current phase, used behind the hero. */
  canvasTint: string;

  // ---- Text --------------------------------------------------------------
  text: string;
  textSecondary: string;
  textTertiary: string;
  /** Text drawn on top of a filled brand-color surface. */
  onAccent: string;

  // ---- Fills & lines -----------------------------------------------------
  /** Subtle neutral fill: unselected pills, progress tracks, chart grids. */
  fill: string;
  /** A step stronger — pressed states, dividers on colored surfaces. */
  fillStrong: string;
  /** Hairline separator. Used rarely; shadow and space do most of the work. */
  separator: string;
  divider: string;
  trackNeutral: string;

  // ---- Controls ----------------------------------------------------------
  inputBg: string;
  inputBorder: string;
  pillBg: string;
  pillBorder: string;
  /** Off-state track for switches. */
  switchTrack: string;

  // ---- Chrome ------------------------------------------------------------
  tabBarBg: string;
  tabBarBorder: string;
  blurTint: 'light' | 'dark';

  /** Scrim behind modals and bottom sheets. */
  scrim: string;

  // ---- Legacy aurora tokens ----------------------------------------------
  // Retained so the ambient canvas keeps compiling; retuned to be almost
  // invisible. The editorial language does not use heavy gradients or glass.
  auroraBackdrop: string[];
  auroraOrbs: string[];
  waveA: string;
  waveB: string;
  droplet: string;
  dropletBorder: string;
  glassTint: string;
  glassBorder: string;
  glassHighlight: string;
}

export const lightPalette: ThemePalette = {
  bg: '#FCFBFA',
  bgSecondary: '#F7F4F6',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  canvasTint: 'rgba(217,124,155,0.04)',

  text: '#1E1E22',
  textSecondary: '#70707A',
  textTertiary: '#A0A0AA',
  onAccent: '#FFFFFF',

  fill: 'rgba(30,30,34,0.045)',
  fillStrong: 'rgba(30,30,34,0.09)',
  separator: 'rgba(30,30,34,0.08)',
  divider: 'rgba(30,30,34,0.07)',
  trackNeutral: 'rgba(30,30,34,0.06)',

  inputBg: '#F7F4F6',
  inputBorder: 'transparent',
  pillBg: 'rgba(30,30,34,0.04)',
  pillBorder: 'transparent',
  switchTrack: 'rgba(30,30,34,0.12)',

  tabBarBg: 'rgba(252,251,250,0.82)',
  tabBarBorder: 'rgba(30,30,34,0.06)',
  blurTint: 'light',

  scrim: 'rgba(30,30,34,0.32)',

  auroraBackdrop: ['#FCFBFA', '#FBF8F9', '#F9F6F8', '#F7F4F6'],
  auroraOrbs: ['rgba(217,124,155,0.10)', 'rgba(184,154,216,0.09)', 'rgba(141,181,150,0.06)'],
  waveA: 'rgba(184,154,216,0.05)',
  waveB: 'rgba(217,124,155,0.05)',
  droplet: 'rgba(255,255,255,0.5)',
  dropletBorder: 'rgba(255,255,255,0.7)',
  glassTint: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(30,30,34,0.06)',
  glassHighlight: 'rgba(255,255,255,0.9)',
};

export const darkPalette: ThemePalette = {
  // Warm charcoal, not blue-black — it keeps the rose/lavender accents honest.
  bg: '#131316',
  bgSecondary: '#1A1A1E',
  card: '#1D1D22',
  cardElevated: '#26262C',
  canvasTint: 'rgba(217,124,155,0.06)',

  text: '#F4F4F6',
  textSecondary: '#9A9AA6',
  textTertiary: '#6E6E7A',
  onAccent: '#FFFFFF',

  fill: 'rgba(255,255,255,0.06)',
  fillStrong: 'rgba(255,255,255,0.12)',
  separator: 'rgba(255,255,255,0.09)',
  divider: 'rgba(255,255,255,0.08)',
  trackNeutral: 'rgba(255,255,255,0.10)',

  inputBg: '#26262C',
  inputBorder: 'transparent',
  pillBg: 'rgba(255,255,255,0.06)',
  pillBorder: 'transparent',
  switchTrack: 'rgba(255,255,255,0.16)',

  tabBarBg: 'rgba(19,19,22,0.82)',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  blurTint: 'dark',

  scrim: 'rgba(0,0,0,0.55)',

  auroraBackdrop: ['#131316', '#161618', '#18161B', '#1A181D'],
  auroraOrbs: ['rgba(217,124,155,0.14)', 'rgba(184,154,216,0.12)', 'rgba(141,181,150,0.07)'],
  waveA: 'rgba(184,154,216,0.07)',
  waveB: 'rgba(217,124,155,0.07)',
  droplet: 'rgba(255,255,255,0.14)',
  dropletBorder: 'rgba(255,255,255,0.2)',
  glassTint: 'rgba(29,29,34,0.72)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassHighlight: 'rgba(255,255,255,0.10)',
};

export const palettes = { light: lightPalette, dark: darkPalette };
