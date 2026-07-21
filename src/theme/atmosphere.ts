/**
 * Atmosphere — the ambient state of the app.
 *
 * The old design language kept ~80% of every screen neutral, which made colour
 * purely decorative: luteal Tuesday and ovulation Saturday rendered as the same
 * beige. This module makes colour *semantic* instead. It answers one question —
 * "what does the app feel like right now?" — from three inputs:
 *
 *   cycle phase  · the slow tide, changes over days
 *   time of day  · the fast tide, changes over hours
 *   reduced motion · accessibility, changes everything
 *
 * and returns a record the visual layer consumes wholesale. One function, so a
 * phase change re-tints the entire app coherently rather than via conditionals
 * scattered across eleven screens.
 *
 * RN-free on purpose (same as utils/tinyEscapes.ts and utils/kintsugi.ts) so the
 * grading is unit-tested in the node test project rather than eyeballed.
 */

export type PhaseKey = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

/** Coarse time bands. Deliberately not 24 buckets — the eye reads four. */
export type TimeBand = 'dawn' | 'day' | 'dusk' | 'night';

/** What ambient particles look like. Rendered by <Atmosphere/>. */
export type MoteKind = 'none' | 'dust' | 'pollen' | 'spark' | 'star';

export interface Atmosphere {
  /** 4-stop vertical canvas wash, top → bottom. */
  canvas: [string, string, string, string];
  /** Two large blurred orbs that drift. Colours already carry their alpha. */
  orbs: [string, string];
  /** Colour of the ambient glow behind hero elements. */
  glow: string;
  /** Particle character for this atmosphere. */
  mote: MoteKind;
  /** Particle count. Already reduced-motion aware — 0 means draw nothing. */
  moteCount: number;
  /**
   * Direction the light comes from, in degrees (0 = from the top, clockwise).
   * Card highlights and the hero ring sweep align to this, so lighting across
   * the app agrees with itself instead of every gradient picking its own angle.
   */
  lightAngle: number;
  /**
   * 0..1 — how much the atmosphere should tint neutral surfaces. Night and
   * menstrual run warmer/heavier; day runs almost clear.
   */
  warmth: number;
  /** Seconds for one full ambient drift cycle. Long. Subconscious. */
  driftSec: number;
}

/** Hour → band. Exported for tests and for the greeting logic to share. */
export function timeBand(hour: number): TimeBand {
  if (hour < 5) return 'night';
  if (hour < 9) return 'dawn';
  if (hour < 17) return 'day';
  if (hour < 21) return 'dusk';
  return 'night';
}

/**
 * Per-phase character. These are *atmosphere* hues — low alpha, meant to be
 * layered over the canvas — not the brand pastels in constants/COLORS, which
 * stay as-is for rings, dots and meters.
 */
const PHASE_ATMOS: Record<
  PhaseKey,
  { hue: string; glow: string; mote: MoteKind; warmth: number }
> = {
  // A warm protective cocoon — deep rose, the heaviest tint of the four.
  menstrual: { hue: 'rgba(196,86,110,', glow: 'rgba(217,124,155,', mote: 'dust', warmth: 1 },
  // Rising, green, aerated. Pollen drifting upward.
  follicular: { hue: 'rgba(141,181,150,', glow: 'rgba(141,181,150,', mote: 'pollen', warmth: 0.45 },
  // Peak. Golden, luminous — the only phase that gets sparks.
  ovulation: { hue: 'rgba(245,177,122,', glow: 'rgba(245,177,122,', mote: 'spark', warmth: 0.7 },
  // Settling inward. Lavender, quiet, slowest drift.
  luteal: { hue: 'rgba(184,154,216,', glow: 'rgba(184,154,216,', mote: 'dust', warmth: 0.6 },
};

/**
 * Per-band grading applied on top of the phase. Light mode only here; dark mode
 * inverts the ramp in `atmosphere()` since a dark canvas needs the tint to *add*
 * light rather than subtract it.
 */
const BAND: Record<
  TimeBand,
  { top: string; bottom: string; lightAngle: number; lift: number; mote: MoteKind | null }
> = {
  // Low warm sun from the east.
  dawn: { top: '#FDF6F0', bottom: '#F9EFEC', lightAngle: 65, lift: 0.9, mote: null },
  // High neutral light. The clearest, least-tinted state.
  day: { top: '#FCFAF8', bottom: '#F7F3F1', lightAngle: 15, lift: 0.55, mote: null },
  // Long shadows, amber cast.
  dusk: { top: '#FBF2EE', bottom: '#F5E9E8', lightAngle: 295, lift: 1, mote: null },
  // Cool moonlight — the one band that overrides phase particles with stars.
  night: { top: '#F6F1F4', bottom: '#F1EAEF', lightAngle: 340, lift: 0.75, mote: 'star' },
};

const BAND_DARK: Record<TimeBand, { top: string; bottom: string }> = {
  dawn: { top: '#1B1418', bottom: '#150F14' },
  day: { top: '#181218', bottom: '#141014' },
  dusk: { top: '#1D1419', bottom: '#160F16' },
  night: { top: '#141017', bottom: '#100C13' },
};

/** Base particle counts before reduced-motion scaling. */
const MOTE_COUNT: Record<MoteKind, number> = {
  none: 0,
  dust: 14,
  pollen: 18,
  spark: 10,
  star: 22,
};

export interface AtmosphereInput {
  phase: PhaseKey;
  /** 0–23. */
  hour: number;
  isDark: boolean;
  /** When true, all drift stops and particle counts fall to zero. */
  reducedMotion?: boolean;
}

/**
 * The whole visual mood of the app, from three inputs.
 *
 * Reduced motion is handled here rather than at each call site so there is
 * exactly one place that can get it wrong: motes go to 0 and driftSec goes to
 * Infinity, which the renderer reads as "draw the static frame".
 */
export function atmosphere({
  phase,
  hour,
  isDark,
  reducedMotion = false,
}: AtmosphereInput): Atmosphere {
  const p = PHASE_ATMOS[phase] ?? PHASE_ATMOS.menstrual;
  const band = timeBand(hour);
  const b = BAND[band];

  // Dark mode needs the tint to add light, not subtract it, so alphas run
  // higher against the near-black canvas or the grading disappears entirely.
  // Light mode needs more alpha than intuition suggests: the same tint that
  // reads clearly against near-black almost vanishes against warm paper, so
  // matching the two by eye rather than by number keeps the themes at parity.
  const a = isDark
    ? { wash: 0.1, orbA: 0.2, orbB: 0.14, glow: 0.26 }
    : { wash: 0.075, orbA: 0.2, orbB: 0.14, glow: 0.22 };

  const lift = b.lift;
  const tint = (alpha: number) => `${p.hue}${(alpha * lift).toFixed(3)})`;

  const base = isDark ? BAND_DARK[band] : b;

  // Night stars override the phase particle — moonlight wins over pollen.
  const mote: MoteKind = b.mote ?? p.mote;

  return {
    canvas: [base.top, base.top, tint(a.wash), base.bottom],
    orbs: [tint(a.orbA), `${p.glow}${(a.orbB * lift).toFixed(3)})`],
    glow: `${p.glow}${(a.glow * lift).toFixed(3)})`,
    mote: reducedMotion ? 'none' : mote,
    moteCount: reducedMotion ? 0 : MOTE_COUNT[mote],
    lightAngle: b.lightAngle,
    warmth: Math.min(1, p.warmth * lift),
    // Luteal settles inward, so it drifts slowest; ovulation is the liveliest.
    // Still measured in tens of seconds — this must stay subconscious.
    driftSec: reducedMotion ? Infinity : phase === 'ovulation' ? 26 : phase === 'luteal' ? 42 : 34,
  };
}

/**
 * Greeting that matches the atmosphere rather than inventing its own cutoffs.
 * HomeScreen previously hardcoded 12/18 boundaries that disagreed with the
 * visual grading — the canvas went dusk while the text still said "afternoon".
 */
export function greetingFor(band: TimeBand): string {
  switch (band) {
    case 'dawn':
      return 'Good morning';
    case 'day':
      return 'Good afternoon';
    case 'dusk':
      return 'Good evening';
    default:
      return 'Still up';
  }
}
