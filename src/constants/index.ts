/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BLOOMLY — Brand colour.
 * "Gentle care for every cycle."
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The identity is a GARDEN, not a chart. Everything here descends from one
 * decision: the app's four cycle phases are drawn as a **year in a garden**
 * rather than four arbitrary highlighter hues.
 *
 *    Menstrual   Rose      — the bloom at full colour, then letting go
 *    Follicular  Sage      — new growth, first leaves
 *    Ovulation   Gold      — the day the light peaks
 *    Luteal      Lavender  — dusk, cooling, folding inward
 *
 * Bloom → leaf → sun → dusk → back to bloom. It spans plant *and* sky, and it
 * closes on itself, which is what a cycle is. That is the reason this reads as
 * Bloomly and not as "another pink period tracker": the pink is one station on
 * a journey, not the whole map.
 *
 * ── Three hard rules ────────────────────────────────────────────────────────
 *
 * 1. **Never plain white, never plain black.** The light canvas is warm white
 *    falling to blush; the dark canvas is plum ink. A pastel identity on #FFF
 *    looks like an unfinished wireframe, because there is nothing for the
 *    pastel to be soft *against*.
 *
 * 2. **A pastel never carries text.** Blossom is 1.87:1 on cream — beautiful as
 *    a petal fill, illegible as a label background. Every hue therefore ships
 *    in three values:
 *
 *       pastel  the petal      fills, illustrations, dark-mode text
 *       deep    the stem       ≥3:1 on cream — dots, rings, strokes, legends
 *       ink     the soil       ≥4.5:1 on cream — text, glyphs, filled buttons
 *
 *    Reach for the wrong one and `theme/contrast.test.ts` fails. That test is
 *    the enforcement mechanism for this comment.
 *
 * 3. **Phase is never carried by colour alone — see PHASE_GLYPH.** This is not
 *    a courtesy; it is forced by measurement. Running the four phase hues
 *    through a CVD validator gives, for the best on-brand set achievable:
 *
 *        normal vision   dE 15.3 worst adjacent pair   PASS
 *        deuteranopia    dE  3.1 worst adjacent pair   FAIL
 *
 *    Deuteranopia confuses pink and green *by definition*, and no reshuffling
 *    of four soft hues fixes it — the earlier Rose/Peach/Gold/Lavender set was
 *    worse still (dE 0.7 between peach and gold, i.e. literally the same
 *    colour to a deutan reader, and only 6.8 to everyone else).
 *
 *    So colour was demoted to *reinforcement* and **shape was promoted to
 *    carrier**: drop, leaf, sun, moon. Four silhouettes nobody can confuse at
 *    10px, in any vision, in greyscale, in a print-out.
 */

// ───────────────────────────────────────────────────────────────────────────
// The garden — raw hues
// ───────────────────────────────────────────────────────────────────────────

/**
 * Every brand hue in its three values. This is the real palette; `COLORS`
 * below is a flattened view of it kept for the screens that already import it.
 */
export const BLOOM = {
  /** Blossom Pink — the lightest petal. Fills and illustration only. */
  blossom: { pastel: '#F7B3CA', deep: '#C2457A', ink: '#A83E68' },
  /** Rose — the signature. Menstrual phase, primary brand mark. */
  rose: { pastel: '#F291B1', deep: '#C2457A', ink: '#A83E68' },
  /** Peach — warmth. An accent hue, deliberately NOT a phase (see below). */
  peach: { pastel: '#F9B98D', deep: '#C0692F', ink: '#A34B34' },
  /** Soft Coral — the accent that stops the palette going saccharine. */
  coral: { pastel: '#F79079', deep: '#C86243', ink: '#A34B34' },
  /** Muted Gold — ovulation, achievements, premium. Never yellow-neon. */
  gold: { pastel: '#EFC55E', deep: '#B08322', ink: '#7E5B0C' },
  /** Lavender — luteal, calm, Self-Care. */
  lavender: { pastel: '#BFA0EE', deep: '#8A63C4', ink: '#64438F' },
  /** Lilac — the palest cool. Backgrounds and tints, never a stroke. */
  lilac: { pastel: '#DDC9F5', deep: '#8A63C4', ink: '#64438F' },
  /** Sage — new growth. The follicular phase, streaks, "you're doing fine". */
  sage: { pastel: '#6FC494', deep: '#3A8A5E', ink: '#2E6B49' },
  /** Sky — hydration and sleep only. Borrowed, not brand. */
  sky: { pastel: '#9DBEE8', deep: '#5B84BC', ink: '#3F6699' },
} as const;

export type BloomHue = keyof typeof BLOOM;

/** Cream and blush — the surfaces the whole palette is tuned against. */
export const PAPER = {
  /** Warm White — the top of the canvas. */
  warmWhite: '#FFFAF7',
  /** Cream — card surface. Barely warmer than white, never grey. */
  cream: '#FFFDFB',
  /** Blush — the bottom of the canvas, where the gradient lands. */
  blush: '#FBEFF1',
  /** Petal — the deepest light tint, for recessed wells. */
  petal: '#F7E9EC',
  /** Plum Ink — the dark canvas. Warm, never neutral charcoal. */
  plumInk: '#120E14',
  /** Plum Card — a card on plum ink. */
  plumCard: '#1C161F',
  /** Plum Raised — a card on a card. */
  plumRaised: '#251E29',
} as const;

// ───────────────────────────────────────────────────────────────────────────
// Flattened view — every screen already imports COLORS, so the names stay.
// ───────────────────────────────────────────────────────────────────────────

export const COLORS = {
  /**
   * Rose. Decorative fills that carry no text — rings, petals, dots, meters.
   * White on this is 2.9:1, so a filled control uses `primaryDark` instead.
   */
  primary: BLOOM.rose.pastel,
  primaryLight: BLOOM.blossom.pastel,
  /** Rose ink. The accessible workhorse: 5.6:1 on cream, and white sits on it. */
  primaryDark: BLOOM.rose.ink,
  /** Rose at 3:1 — strokes and dots on a light card. */
  primaryDeep: BLOOM.rose.deep,
  primarySoft: 'rgba(242,145,177,0.14)',
  /** The palest rose wash, for tinted tiles under a rose glyph. */
  primaryTint: 'rgba(242,145,177,0.16)',

  secondary: BLOOM.lavender.pastel,
  /** Lavender. */
  accent: BLOOM.lavender.pastel,
  accentLight: BLOOM.lilac.pastel,
  accentDark: BLOOM.lavender.ink,
  accentDeep: BLOOM.lavender.deep,
  accentSoft: 'rgba(191,160,238,0.16)',

  /** Soft Coral. */
  coral: BLOOM.coral.pastel,
  coralDark: BLOOM.coral.ink,
  /** Muted Gold — achievements, premium, ovulation. */
  gold: BLOOM.gold.pastel,
  goldDark: BLOOM.gold.ink,
  /** Peach. */
  peach: BLOOM.peach.pastel,
  peachDark: BLOOM.peach.ink,

  // Cycle phases — the garden year. Pastels are tuned for DARK surfaces and
  // for tinted fills; on cream they reach only ~1.6–2.2:1, so anything drawn
  // on a light surface uses PHASE_DEEP (see usePhaseColor). Follicular is sage
  // rather than peach because peach and gold measured 0.7 dE apart under
  // deuteranopia — the same colour. See the note at the top of this file.
  menstrual: BLOOM.rose.pastel,
  follicular: BLOOM.sage.pastel,
  ovulation: BLOOM.gold.pastel,
  luteal: BLOOM.lavender.pastel,

  background: PAPER.warmWhite,
  backgroundDark: PAPER.blush,
  surface: PAPER.cream,
  surfaceDark: PAPER.petal,

  /** Warm near-black. Pure #000 on a blush canvas reads as a hole punched in it. */
  text: '#241A20',
  textSecondary: '#6E5F67',
  textTertiary: '#9A8A92',

  error: '#B0405C',
  /** Sage. */
  success: BLOOM.sage.pastel,
  successDark: BLOOM.sage.ink,
  /** Peach. */
  warning: BLOOM.peach.pastel,
  warningDark: BLOOM.peach.ink,
  info: BLOOM.sky.pastel,
  infoDark: BLOOM.sky.ink,

  divider: 'rgba(36,26,32,0.07)',
  border: 'rgba(36,26,32,0.08)',

  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

/**
 * Pastel → its AA ink, for a glyph or label drawn on that pastel's own ~14%
 * tint. Every tinted icon tile in the app goes through `inkFor`.
 */
export const INK: Record<string, string> = {
  [BLOOM.blossom.pastel]: BLOOM.blossom.ink,
  [BLOOM.rose.pastel]: BLOOM.rose.ink,
  [BLOOM.peach.pastel]: BLOOM.peach.ink,
  [BLOOM.coral.pastel]: BLOOM.coral.ink,
  [BLOOM.gold.pastel]: BLOOM.gold.ink,
  [BLOOM.lavender.pastel]: BLOOM.lavender.ink,
  [BLOOM.lilac.pastel]: BLOOM.lilac.ink,
  [BLOOM.sage.pastel]: BLOOM.sage.ink,
  [BLOOM.sky.pastel]: BLOOM.sky.ink,
};

export const inkFor = (color: string): string => INK[color] ?? color;

/**
 * Pastel → its 3:1 stroke value, for a ring or dot on a light card. Same idea
 * as `inkFor` but one step lighter — ink is for text, deep is for geometry.
 */
export const DEEP: Record<string, string> = {
  [BLOOM.blossom.pastel]: BLOOM.blossom.deep,
  [BLOOM.rose.pastel]: BLOOM.rose.deep,
  [BLOOM.peach.pastel]: BLOOM.peach.deep,
  [BLOOM.coral.pastel]: BLOOM.coral.deep,
  [BLOOM.gold.pastel]: BLOOM.gold.deep,
  [BLOOM.lavender.pastel]: BLOOM.lavender.deep,
  [BLOOM.lilac.pastel]: BLOOM.lilac.deep,
  [BLOOM.sage.pastel]: BLOOM.sage.deep,
  [BLOOM.sky.pastel]: BLOOM.sky.deep,
};

export const deepFor = (color: string): string => DEEP[color] ?? color;

// ───────────────────────────────────────────────────────────────────────────
// Gradients
// ───────────────────────────────────────────────────────────────────────────

/**
 * Two-stop ramps for filled surfaces. Tonal — one hue, two values — so a
 * gradient reads as a *lit object* rather than as a rainbow. The moment a
 * gradient crosses more than ~40° of hue it stops looking soft and starts
 * looking like a 2014 app icon.
 */
export const GRADIENT = {
  /** The signature. Blossom falling to Rose — the brand mark, the FAB, splash. */
  bloom: [BLOOM.blossom.pastel, BLOOM.rose.pastel],
  /** Filled CTA. Deep enough that white labels clear AA across the whole ramp. */
  bloomInk: ['#C2457A', '#A83E68'],
  primary: [BLOOM.blossom.pastel, BLOOM.rose.pastel],
  /** Ovulation / fertility / achievement. */
  golden: ['#F6D98D', BLOOM.gold.pastel],
  fertility: [BLOOM.lilac.pastel, BLOOM.lavender.pastel],
  /** Self-Care, meditation, Reset. */
  calm: [BLOOM.lilac.pastel, BLOOM.lavender.pastel],
  /** Growth, streaks, the garden. */
  wellness: ['#A5DCBC', BLOOM.sage.pastel],
  sunset: ['#FCD6B6', BLOOM.peach.pastel],
  /** Cards that need to glow without shouting — 8% over whatever is beneath. */
  veil: ['rgba(255,255,255,0.70)', 'rgba(255,255,255,0.40)'],
  veilDark: ['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.03)'],
};

/**
 * Per-phase ramps used by the Bloom Ring sweep and phase headers. Three values
 * of one hue: light lip, body, shadow — the lighting model of a real petal.
 */
export const PHASE_GRADIENTS: Record<string, string[]> = {
  Menstrual: ['#F7B3CA', '#F291B1', '#C2457A'],
  Follicular: ['#A5DCBC', '#6FC494', '#3A8A5E'],
  Ovulation: ['#F6D98D', '#EFC55E', '#B08322'],
  Luteal: ['#DDC9F5', '#BFA0EE', '#8A63C4'],
};

/**
 * Phase hues at ≥3:1 on cream — the only phase values allowed to draw a dot,
 * ring, stroke or legend swatch in light mode.
 */
export const PHASE_DEEP: Record<string, string> = {
  menstrual: '#C2457A',
  follicular: '#3A8A5E',
  ovulation: '#B08322',
  luteal: '#8A63C4',
};

/**
 * Phase hues at ≥4.5:1 for white text — the only ones allowed under a white
 * label (selected calendar day, filled phase chip).
 */
export const PHASE_INK: Record<string, string> = {
  menstrual: '#A83E68',
  follicular: '#2E6B49',
  ovulation: '#7E5B0C',
  luteal: '#64438F',
};

/**
 * ── The accessibility backbone ───────────────────────────────────────
 *
 * Phase identity as a **silhouette**. Rendered by `components/PhaseMark`.
 *
 * This exists because measurement said colour cannot do the job (see the note
 * at the top of this file): four soft hues are indistinguishable to a deutan
 * reader no matter how they are chosen. Rather than accept that a colour-blind
 * user reads a worse app, phase is carried by four shapes that survive *any*
 * vision, greyscale printing, and a 10px calendar dot:
 *
 *     drop   menstrual    a shed petal / a drop
 *     leaf   follicular   first growth
 *     sun    ovulation    the light peaking
 *     moon   luteal       folding into dusk
 *
 * Colour then *agrees* with the shape rather than carrying it alone. Anywhere
 * a phase appears — ring, calendar, legend, chart, chip — the mark comes from
 * here.
 */
export const PHASE_GLYPH = {
  menstrual: 'drop',
  follicular: 'leaf',
  ovulation: 'sun',
  luteal: 'moon',
} as const;

export type PhaseGlyph = (typeof PHASE_GLYPH)[keyof typeof PHASE_GLYPH];

/**
 * Ambient canvas fallback. The live values come from `theme/atmosphere.ts`,
 * which grades these by phase and hour; this is the resting state.
 */
export const AURORA = {
  backdrop: [PAPER.warmWhite, '#FEF6F4', '#FDF2F2', PAPER.blush],
  orbs: ['rgba(231,115,151,0.13)', 'rgba(188,163,222,0.11)', 'rgba(247,181,142,0.09)'],
};

/**
 * Glass. Used sparingly and only where content passes *behind* the surface —
 * the tab bar, the FAB, sheet headers, the escape-player chrome. Glass on a
 * static card is decoration pretending to be depth.
 */
export const GLASS = {
  tint: 'rgba(255,253,251,0.72)',
  tintStrong: 'rgba(255,253,251,0.88)',
  tintDark: 'rgba(28,22,31,0.72)',
  tintDarkStrong: 'rgba(28,22,31,0.88)',
  border: 'rgba(36,26,32,0.06)',
  borderDark: 'rgba(255,255,255,0.10)',
  highlight: 'rgba(255,255,255,0.92)',
  intensity: 28,
};

// ───────────────────────────────────────────────────────────────────────────
// Legacy scales — superseded by theme/tokens.ts. Kept so nothing breaks.
// ───────────────────────────────────────────────────────────────────────────

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const BORDER_RADIUS = { xs: 6, sm: 10, md: 14, lg: 20, xl: 26, full: 999 };

export const SHADOWS = {
  sm: {
    shadowColor: '#7A4356',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#7A4356',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  lg: {
    shadowColor: '#7A4356',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.13,
    shadowRadius: 36,
    elevation: 10,
  },
};

export const TYPOGRAPHY = {
  h1: { fontSize: 34, fontWeight: '700' as const, lineHeight: 41 },
  h2: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  h3: { fontSize: 24, fontWeight: '600' as const, lineHeight: 30 },
  h4: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
  body1: { fontSize: 17, fontWeight: '400' as const, lineHeight: 26 },
  body2: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 21 },
};

// ───────────────────────────────────────────────────────────────────────────
// Cycle content
// ───────────────────────────────────────────────────────────────────────────

/**
 * Per-phase metadata: colour, copy, expected symptoms. The day ranges here are
 * legacy and unused — real boundaries come from cycleCalculations.getCyclePhase().
 *
 * Copy rule: Bloomly speaks like a kind friend who happens to know biology. It
 * never diagnoses, never instructs, and never uses the word "should".
 */
export const CYCLE_PHASES = {
  menstrual: {
    name: 'Menstrual',
    days: { start: 1, end: 5 },
    color: COLORS.menstrual,
    /** One-line season name shown under the Bloom Ring. */
    season: 'Letting go',
    description: 'A time to slow down and be gentle with yourself.',
    symptoms: ['Cramps', 'Fatigue', 'Mood changes'],
    recommendations: ['Rest', 'Warm compress', 'Light movement'],
  },
  follicular: {
    name: 'Follicular',
    days: { start: 6, end: 14 },
    color: COLORS.follicular,
    season: 'Budding',
    description: 'Energy is building. A good week to begin things.',
    symptoms: ['Energy boost', 'Confidence', 'Creativity'],
    recommendations: ['Start something', 'Move your body', 'See people'],
  },
  ovulation: {
    name: 'Ovulation',
    days: { start: 15, end: 17 },
    color: COLORS.ovulation,
    season: 'In full bloom',
    description: 'Peak energy and fertility. You may feel your most social.',
    symptoms: ['High energy', 'Increased libido', 'Confidence'],
    recommendations: ['Say the hard thing', 'Gather', 'Make plans'],
  },
  luteal: {
    name: 'Luteal',
    days: { start: 18, end: 28 },
    color: COLORS.luteal,
    season: 'Winding down',
    description: 'Winding down. Rest is productive too.',
    symptoms: ['Fatigue', 'Mood shifts', 'Cravings'],
    recommendations: ['Self-care', 'Journal', 'Gentle movement'],
  },
};

/**
 * Symptoms. Every entry carries a stroke `Icon` name and a brand hue, because
 * the old emoji map couldn't inherit colour, couldn't match stroke weight and
 * rendered differently on every platform. `group` drives the section headers
 * in the Symptom Logger so the sheet reads as four small decisions rather than
 * one wall of ten chips.
 */
export const SYMPTOMS = {
  cramps: { label: 'Cramps', icon: 'spark', hue: 'rose', group: 'Body' },
  headache: { label: 'Headache', icon: 'headache', hue: 'coral', group: 'Body' },
  backpain: { label: 'Back pain', icon: 'back', hue: 'coral', group: 'Body' },
  bloating: { label: 'Bloating', icon: 'bloat', hue: 'peach', group: 'Body' },
  nausea: { label: 'Nausea', icon: 'wave', hue: 'sage', group: 'Body' },
  acne: { label: 'Acne', icon: 'acne', hue: 'blossom', group: 'Skin' },
  fatigue: { label: 'Fatigue', icon: 'moon', hue: 'lavender', group: 'Energy' },
  cravings: { label: 'Cravings', icon: 'cherry', hue: 'gold', group: 'Energy' },
  anxiety: { label: 'Anxiety', icon: 'wind', hue: 'lavender', group: 'Feelings' },
  mood_swings: { label: 'Mood swings', icon: 'petal', hue: 'lilac', group: 'Feelings' },
} as const;

/** Section order for the Symptom Logger. */
export const SYMPTOM_GROUPS = ['Body', 'Skin', 'Energy', 'Feelings'] as const;

/**
 * Flow. Drawn as one, two or three petals rather than coloured dots — a count
 * is readable without colour, which is the colour-blind requirement met by
 * construction rather than by a legend.
 */
export const FLOW_INTENSITY = {
  light: { label: 'Light', petals: 1, hue: 'blossom' },
  medium: { label: 'Medium', petals: 2, hue: 'rose' },
  heavy: { label: 'Heavy', petals: 3, hue: 'rose' },
} as const;

/**
 * Moods. Nine feelings, each with its own aura hue — the Mood Tracker tints
 * the whole card to the chosen feeling, so choosing a mood changes the room
 * rather than ticking a box.
 */
export const MOODS = [
  { key: 'happy', label: 'Happy', hue: 'gold', value: 5 },
  { key: 'loved', label: 'Loved', hue: 'blossom', value: 5 },
  { key: 'excited', label: 'Excited', hue: 'coral', value: 5 },
  { key: 'calm', label: 'Calm', hue: 'sage', value: 4 },
  { key: 'relaxed', label: 'Relaxed', hue: 'lilac', value: 4 },
  { key: 'tired', label: 'Tired', hue: 'lavender', value: 3 },
  { key: 'anxious', label: 'Anxious', hue: 'sky', value: 2 },
  { key: 'sad', label: 'Sad', hue: 'sky', value: 2 },
  { key: 'angry', label: 'Angry', hue: 'coral', value: 1 },
] as const;

export type MoodKey = (typeof MOODS)[number]['key'];

export const ONBOARDING_STEPS = [
  'Welcome',
  'Your cycle',
  'Your body',
  'Mood & symptoms',
  'Privacy',
  'A moment for you',
];

export const NOTIFICATION_TYPES = {
  periodReminder: 'Period Starting Soon',
  ovulationReminder: 'Ovulation Window',
  healthTip: 'Wellness Tip',
  symptomCheck: 'Daily Check-in',
  aiInsight: 'Personalized Insight',
};

/** The one-line promise. Splash, onboarding, store listing. */
export const TAGLINE = 'Gentle care for every cycle.';
export const APP_NAME = 'Bloomly';
