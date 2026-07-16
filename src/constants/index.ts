/**
 * Brand & semantic color. Mature, natural, low-saturation — used as an accent
 * on a neutral canvas, never as the canvas itself. Surface/text colors that
 * change between light and dark live in theme/palette.ts instead.
 */
export const COLORS = {
  /**
   * Rose Quartz. Use for rings, dots, meters and tints — decorative fills that
   * carry no text. White on this is only 2.87:1, so it must NOT back a label:
   * filled controls use `primaryDark` instead.
   */
  primary: '#D97C9B',
  primaryLight: '#F0D3DD',
  /**
   * Deep rose. The accessible workhorse: text/icons on light surfaces (5.4:1)
   * and the fill behind white button labels (5.3:1).
   */
  primaryDark: '#A84A6B',
  /** Very low-alpha rose for tinted backgrounds. */
  primarySoft: 'rgba(217,124,155,0.12)',

  secondary: '#B89AD8',
  /** Lavender. */
  accent: '#B89AD8',
  accentLight: '#E4D9F2',
  accentDark: '#6F4E96',
  accentSoft: 'rgba(184,154,216,0.12)',

  /**
   * Cycle phases map onto the four brand hues — natural, never neon.
   * These pastels are tuned for DARK surfaces and for tinted fills. On a white
   * card they only reach ~1.8–2.9:1, so any phase indicator drawn on a light
   * surface must use PHASE_DEEP instead (see usePhaseColor).
   */
  menstrual: '#D97C9B',
  follicular: '#8DB596',
  ovulation: '#F5B17A',
  luteal: '#B89AD8',

  background: '#FCFBFA',
  backgroundDark: '#F7F4F6',
  surface: '#FFFFFF',
  surfaceDark: '#F7F4F6',

  text: '#1E1E22',
  textSecondary: '#70707A',
  textTertiary: '#A0A0AA',

  error: '#B04A62',
  /** Soft Sage. */
  success: '#8DB596',
  successDark: '#4F7A5A',
  /** Warm Peach. */
  warning: '#F5B17A',
  warningDark: '#9A5B22',
  info: '#7C9BD9',

  divider: 'rgba(30,30,34,0.07)',
  border: 'rgba(30,30,34,0.08)',

  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};

/**
 * Maps a brand pastel to its AA-accessible ink, for icons/text drawn on a light
 * tinted tile (where the pastel itself is only ~2–3:1). Pass-through for colors
 * that are already dark enough. Used wherever a colored glyph sits on `${c}1F`.
 */
export const INK: Record<string, string> = {
  '#D97C9B': '#A84A6B', // primary  → primaryDark
  '#B89AD8': '#6F4E96', // accent   → accentDark
  '#8DB596': '#4F7A5A', // success  → successDark
  '#F5B17A': '#9A5B22', // warning  → warningDark
};

export const inkFor = (color: string): string => INK[color] ?? color;

export const GRADIENT = {
  primary: [COLORS.primaryLight, COLORS.primary],
  fertility: [COLORS.accentLight, COLORS.accent],
  wellness: ['#A8C9AF', COLORS.success],
  sunset: ['#F8C79C', COLORS.warning],
  calm: [COLORS.accentLight, COLORS.accent],
};

/**
 * Ambient canvas tokens. Deliberately near-neutral: the backdrop should read as
 * a single warm off-white, with color only perceptible as a faint bloom.
 */
export const AURORA = {
  backdrop: ['#FCFBFA', '#FBF8F9', '#F9F6F8', '#F7F4F6'],
  orbs: ['rgba(217,124,155,0.10)', 'rgba(184,154,216,0.09)', 'rgba(141,181,150,0.06)'],
};

/**
 * Per-phase ramps. Tonal (one hue, three values) rather than rainbow — they
 * read as a material, not as a highlighter.
 */
export const PHASE_GRADIENTS: Record<string, string[]> = {
  Menstrual: ['#E5A0B6', '#D97C9B', '#C06585'],
  Follicular: ['#A8C9AF', '#8DB596', '#6F9A79'],
  Ovulation: ['#F8C79C', '#F5B17A', '#E39355'],
  Luteal: ['#CDB6E4', '#B89AD8', '#9A78C0'],
};

/**
 * Deepened phase hues that clear the 3:1 UI-component threshold on a WHITE
 * card (dots, rings, legend swatches in light mode). Keyed by phase key.
 */
export const PHASE_DEEP: Record<string, string> = {
  menstrual: '#C06585',
  follicular: '#6F9A79',
  ovulation: '#C97A3E',
  luteal: '#9A78C0',
};

/**
 * Darkest phase variants — the only ones white text clears AA (4.5:1) on. Use
 * for any filled surface carrying a white label (e.g. the selected calendar
 * day). These are the same inks as the semantic *Dark colors above.
 */
export const PHASE_INK: Record<string, string> = {
  menstrual: '#A84A6B',
  follicular: '#4F7A5A',
  ovulation: '#9A5B22',
  luteal: '#6F4E96',
};

/** Glass is now a rare accent (nav chrome only), not the default surface. */
export const GLASS = {
  tint: 'rgba(255,255,255,0.72)',
  tintStrong: 'rgba(255,255,255,0.85)',
  tintDark: 'rgba(29,29,34,0.72)',
  border: 'rgba(30,30,34,0.06)',
  highlight: 'rgba(255,255,255,0.9)',
  intensity: 24,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

/**
 * Per-phase metadata only — color, copy, expected symptoms. The day ranges here
 * are legacy and unused: real boundaries are derived from the user's cycle in
 * cycleCalculations.getCyclePhase(). Copy is deliberately short and plain.
 */
export const CYCLE_PHASES = {
  menstrual: {
    name: 'Menstrual',
    days: { start: 1, end: 5 },
    color: COLORS.menstrual,
    description: 'A time to slow down and be gentle with yourself.',
    symptoms: ['Cramps', 'Fatigue', 'Mood changes'],
    recommendations: ['Rest', 'Warm compress', 'Light exercise'],
  },
  follicular: {
    name: 'Follicular',
    days: { start: 6, end: 14 },
    color: COLORS.follicular,
    description: 'Energy is building. A good week to begin things.',
    symptoms: ['Energy boost', 'Confidence', 'Creativity'],
    recommendations: ['Start new projects', 'Exercise', 'Social time'],
  },
  ovulation: {
    name: 'Ovulation',
    days: { start: 15, end: 17 },
    color: COLORS.ovulation,
    description: 'Peak energy and fertility. You may feel your most social.',
    symptoms: ['High energy', 'Increased libido', 'Confidence'],
    recommendations: ['Plan important meetings', 'Social activities'],
  },
  luteal: {
    name: 'Luteal',
    days: { start: 18, end: 28 },
    color: COLORS.luteal,
    description: 'Winding down. Rest is productive too.',
    symptoms: ['Fatigue', 'Mood shifts', 'Cravings'],
    recommendations: ['Self-care', 'Journaling', 'Gentle exercise'],
  },
};

export const SYMPTOMS = {
  cramps: { label: 'Cramps', emoji: '🤕' },
  headache: { label: 'Headache', emoji: '🤕' },
  fatigue: { label: 'Fatigue', emoji: '😴' },
  bloating: { label: 'Bloating', emoji: '💨' },
  acne: { label: 'Acne', emoji: '🔴' },
  nausea: { label: 'Nausea', emoji: '🤢' },
  backpain: { label: 'Back Pain', emoji: '🔙' },
  anxiety: { label: 'Anxiety', emoji: '😰' },
  mood_swings: { label: 'Mood Swings', emoji: '🎭' },
  cravings: { label: 'Cravings', emoji: '🍫' },
};

export const FLOW_INTENSITY = {
  light: { label: 'Light', emoji: '🟢' },
  medium: { label: 'Medium', emoji: '🟡' },
  heavy: { label: 'Heavy', emoji: '🔴' },
};

export const ONBOARDING_STEPS = [
  'Welcome',
  'Health Info',
  'Cycle Details',
  'Preferences',
  'Privacy',
  'Ready!',
];

export const NOTIFICATION_TYPES = {
  periodReminder: 'Period Starting Soon',
  ovulationReminder: 'Ovulation Window',
  healthTip: 'Wellness Tip',
  symptomCheck: 'Daily Check-in',
  aiInsight: 'Personalized Insight',
};
