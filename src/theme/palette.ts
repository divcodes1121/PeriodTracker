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
  // Blush-cream, not paper-grey: the canvas itself should feel warm before a
  // single accent lands on it.
  bg: '#FBF7F5',
  bgSecondary: '#F6EFEE',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  canvasTint: 'rgba(217,124,155,0.05)',

  text: '#1E1E22',
  textSecondary: '#6C6C76',
  /**
   * Decorative only — chevrons, dots, placeholders, disabled glyphs. At ~3.4:1
   * it clears WCAG 1.4.11 for UI components but NOT the 4.5:1 needed for text,
   * so meaningful labels (including small overlines) must use textSecondary.
   */
  textTertiary: '#8A8A94',
  onAccent: '#FFFFFF',

  fill: 'rgba(30,30,34,0.045)',
  fillStrong: 'rgba(30,30,34,0.09)',
  separator: 'rgba(30,30,34,0.08)',
  divider: 'rgba(30,30,34,0.07)',
  trackNeutral: 'rgba(30,30,34,0.06)',

  inputBg: '#F6EFEE',
  inputBorder: 'transparent',
  pillBg: 'rgba(30,30,34,0.04)',
  pillBorder: 'transparent',
  switchTrack: 'rgba(30,30,34,0.12)',

  tabBarBg: 'rgba(251,247,245,0.82)',
  tabBarBorder: 'rgba(30,30,34,0.06)',
  blurTint: 'light',

  scrim: 'rgba(30,30,34,0.32)',

  /** Dawn wash — the ambient gradient behind onboarding and the Home hero. */
  auroraBackdrop: ['#FDFAF8', '#FBF5F3', '#F9EFF0', '#F7EBEE'],
  auroraOrbs: ['rgba(217,124,155,0.14)', 'rgba(184,154,216,0.12)', 'rgba(245,177,122,0.08)'],
  waveA: 'rgba(184,154,216,0.05)',
  waveB: 'rgba(217,124,155,0.05)',
  droplet: 'rgba(255,255,255,0.5)',
  dropletBorder: 'rgba(255,255,255,0.7)',
  glassTint: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(30,30,34,0.06)',
  glassHighlight: 'rgba(255,255,255,0.9)',
};

export const darkPalette: ThemePalette = {
  // Plum-ink, not neutral black: night mode keeps a rose undertone so the
  // brand pastels feel at home instead of floating on a server-room grey.
  bg: '#151016',
  bgSecondary: '#1C151E',
  card: '#201925',
  cardElevated: '#2A2130',
  canvasTint: 'rgba(217,124,155,0.07)',

  text: '#F6F3F6',
  textSecondary: '#A59DAB',
  textTertiary: '#786F80',
  onAccent: '#FFFFFF',

  fill: 'rgba(255,255,255,0.06)',
  fillStrong: 'rgba(255,255,255,0.12)',
  separator: 'rgba(255,255,255,0.09)',
  divider: 'rgba(255,255,255,0.08)',
  trackNeutral: 'rgba(255,255,255,0.10)',

  inputBg: '#2A2130',
  inputBorder: 'transparent',
  pillBg: 'rgba(255,255,255,0.06)',
  pillBorder: 'transparent',
  switchTrack: 'rgba(255,255,255,0.16)',

  tabBarBg: 'rgba(21,16,22,0.82)',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  blurTint: 'dark',

  scrim: 'rgba(0,0,0,0.55)',

  /** Dusk wash — plum ramp used behind onboarding and the Home hero. */
  auroraBackdrop: ['#171119', '#1A131D', '#1D1521', '#201724'],
  auroraOrbs: ['rgba(217,124,155,0.16)', 'rgba(184,154,216,0.14)', 'rgba(245,177,122,0.07)'],
  waveA: 'rgba(184,154,216,0.07)',
  waveB: 'rgba(217,124,155,0.07)',
  droplet: 'rgba(255,255,255,0.14)',
  dropletBorder: 'rgba(255,255,255,0.2)',
  glassTint: 'rgba(32,25,37,0.72)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassHighlight: 'rgba(255,255,255,0.10)',
};

export const palettes = { light: lightPalette, dark: darkPalette };
