/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BLOOMLY — Surface palette.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Brand hue lives in `constants` (BLOOM / COLORS). This file owns only the
 * things that change between light and dark: canvas, card, ink, fills, chrome.
 *
 * ── The rule that shapes everything here ──────────────────────────────────
 *
 * **Never plain white. Never plain black.**
 *
 * A previous pass set `bg: '#FFFFFF'` and `bg: '#000000'`, which forced a
 * second mistake: with a pure-white canvas and a pure-white card, the two are
 * literally the same colour, so shadow alone can't separate them and every
 * card had to grow a hairline border. Borders on soft pastel cards read as
 * *outlines around stickers* — the exact opposite of a premium surface.
 *
 * Bloomly separates surfaces the way paper does: the canvas is warm white
 * falling to blush, and the card is cream — a touch *lighter and cooler* than
 * the blush it sits on. That ~2% luminance step plus a wide warm shadow is
 * enough. No card in the app carries a border.
 *
 * Dark mode is plum ink, not charcoal. Neutral grey drains the warmth out of
 * every pastel laid on it; a red-violet undertone keeps rose and lavender
 * feeling like the same brand at night.
 *
 * ── Contrast ─────────────────────────────────────────────────────────────
 *
 * Enforced by `theme/contrast.test.ts`, not by good intentions. Text values
 * are measured against BOTH ends of the canvas gradient, because a body label
 * that clears AA at the top of the page and fails at the bottom is still a
 * failure — it just fails somewhere you weren't looking.
 */

export interface ThemePalette {
  // ---- Canvas & surfaces -------------------------------------------------
  /** App background — the flat fallback. The live gradient comes from atmosphere. */
  bg: string;
  /** The bottom stop of the canvas gradient. Text must clear AA here too. */
  bgDeep: string;
  /** Recessed background for grouped/inset sections. */
  bgSecondary: string;
  /** Card surface. Cream in light, plum in dark. */
  card: string;
  /** A card sitting on top of another card. */
  cardElevated: string;
  /**
   * Semi-transparent card. Lets the live atmosphere read through so secondary
   * cards sit *in* the canvas rather than punching an opaque hole in it.
   */
  cardQuiet: string;
  /**
   * Real glass — used only where content passes behind the surface (tab bar,
   * FAB, sheet headers). Pair with a BlurView; the colour alone is not glass.
   */
  cardGlass: string;
  /** Hairline highlight along a card's lit edge, aligned to atmosphere.lightAngle. */
  cardRim: string;
  /**
   * Card outline. **Transparent by design.** Kept in the type because a few
   * components still reference it, and because leaving it here documents the
   * decision: if this ever becomes visible, the canvas has gone flat white
   * again and the real fix is upstream.
   */
  cardBorder: string;
  /** Very subtle wash tinted toward the current phase, used behind the hero. */
  canvasTint: string;

  // ---- Text --------------------------------------------------------------
  /** Warm near-black. Never #000 — pure black on blush reads as a hole. */
  text: string;
  textSecondary: string;
  /** Decorative only: chevrons, dots, placeholders. Below the 4.5:1 text bar. */
  textTertiary: string;
  /** Text drawn on top of a filled brand-color surface. */
  onAccent: string;

  // ---- Fills & lines -----------------------------------------------------
  /** Subtle fill: unselected pills, progress tracks, chart grids. Rose-tinted. */
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
  switchTrack: string;

  // ---- Chrome ------------------------------------------------------------
  tabBarBg: string;
  tabBarBorder: string;
  blurTint: 'light' | 'dark';

  /** Scrim behind modals and bottom sheets. Warm, so it dims without greying. */
  scrim: string;

  // ---- Ambient -----------------------------------------------------------
  /** Fallback canvas ramp. Live values come from theme/atmosphere.ts. */
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
  // Warm white → blush. The canvas is the first thing that tells you this app
  // is soft, and it does that before a single card has rendered.
  bg: '#FFFAF7',
  bgDeep: '#FBEFF1',
  bgSecondary: '#F9EEF0',
  // Cream: lighter and slightly cooler than the blush beneath it, which is
  // what lets a card float without an outline.
  card: '#FFFDFB',
  cardElevated: '#FFFFFF',
  cardQuiet: 'rgba(255,253,251,0.66)',
  cardGlass: 'rgba(255,253,251,0.72)',
  cardRim: 'rgba(255,255,255,0.95)',
  // Deliberately invisible — see the note in the interface.
  cardBorder: 'transparent',
  canvasTint: 'rgba(231,115,151,0.05)',

  text: '#241A20',
  textSecondary: '#6E5F67',
  textTertiary: '#9A8A92',
  onAccent: '#FFFFFF',

  // Rose-tinted rather than neutral grey: a grey fill on a blush canvas looks
  // like a dead pixel region, a rose fill looks like a lighter petal.
  fill: 'rgba(168,68,106,0.055)',
  fillStrong: 'rgba(168,68,106,0.11)',
  separator: 'rgba(168,68,106,0.09)',
  divider: 'rgba(168,68,106,0.08)',
  trackNeutral: 'rgba(168,68,106,0.08)',

  inputBg: 'rgba(255,255,255,0.78)',
  inputBorder: 'rgba(168,68,106,0.10)',
  pillBg: 'rgba(255,255,255,0.72)',
  pillBorder: 'transparent',
  switchTrack: 'rgba(168,68,106,0.16)',

  // 0.88, not 0.80. At the lower value the blurred content scrolling behind
  // the bar stayed legible enough to read as a *smudge* rather than as frosted
  // glass — a label sliding under the bar looked like dirt on the screen.
  tabBarBg: 'rgba(255,251,249,0.88)',
  tabBarBorder: 'rgba(168,68,106,0.07)',
  blurTint: 'light',

  scrim: 'rgba(48,28,38,0.34)',

  auroraBackdrop: ['#FFFAF7', '#FEF6F4', '#FDF2F2', '#FBEFF1'],
  auroraOrbs: [
    'rgba(231,115,151,0.13)',
    'rgba(188,163,222,0.11)',
    'rgba(247,181,142,0.09)',
  ],
  waveA: 'rgba(188,163,222,0.07)',
  waveB: 'rgba(231,115,151,0.07)',
  droplet: 'rgba(255,255,255,0.55)',
  dropletBorder: 'rgba(255,255,255,0.75)',
  glassTint: 'rgba(255,253,251,0.72)',
  glassBorder: 'rgba(36,26,32,0.06)',
  glassHighlight: 'rgba(255,255,255,0.92)',
};

export const darkPalette: ThemePalette = {
  // Plum ink. Night in the garden, not a server room.
  bg: '#120E14',
  bgDeep: '#17111A',
  bgSecondary: '#181219',
  card: '#1C161F',
  cardElevated: '#251E29',
  cardQuiet: 'rgba(28,22,31,0.66)',
  cardGlass: 'rgba(28,22,31,0.74)',
  cardRim: 'rgba(255,255,255,0.08)',
  cardBorder: 'transparent',
  canvasTint: 'rgba(231,115,151,0.08)',

  text: '#F7F1F4',
  textSecondary: '#ABA0A8',
  textTertiary: '#776C74',
  onAccent: '#FFFFFF',

  fill: 'rgba(255,255,255,0.065)',
  fillStrong: 'rgba(255,255,255,0.13)',
  separator: 'rgba(255,255,255,0.10)',
  divider: 'rgba(255,255,255,0.08)',
  trackNeutral: 'rgba(255,255,255,0.11)',

  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.09)',
  pillBg: 'rgba(255,255,255,0.07)',
  pillBorder: 'transparent',
  switchTrack: 'rgba(255,255,255,0.17)',

  tabBarBg: 'rgba(18,14,20,0.88)',
  tabBarBorder: 'rgba(255,255,255,0.08)',
  blurTint: 'dark',

  scrim: 'rgba(9,6,11,0.62)',

  auroraBackdrop: ['#120E14', '#161018', '#1A121D', '#1E1522'],
  auroraOrbs: [
    'rgba(231,115,151,0.16)',
    'rgba(188,163,222,0.15)',
    'rgba(226,180,92,0.09)',
  ],
  waveA: 'rgba(188,163,222,0.09)',
  waveB: 'rgba(231,115,151,0.09)',
  droplet: 'rgba(255,255,255,0.15)',
  dropletBorder: 'rgba(255,255,255,0.22)',
  glassTint: 'rgba(28,22,31,0.74)',
  glassBorder: 'rgba(255,255,255,0.10)',
  glassHighlight: 'rgba(255,255,255,0.12)',
};

export const palettes = { light: lightPalette, dark: darkPalette };
