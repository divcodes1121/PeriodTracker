/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BLOOMLY — Atmosphere. The ambient state of the app.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * One question, answered once: **what does the app feel like right now?**
 *
 * Three inputs:
 *   cycle phase    the slow tide  — changes over days
 *   time of day    the fast tide  — changes over hours
 *   reduced motion accessibility  — changes everything
 *
 * and one record out, which the visual layer consumes wholesale. A single
 * function, so a phase change re-tints the entire app coherently instead of via
 * conditionals scattered across eleven screens.
 *
 * ── Why this got rebuilt ──────────────────────────────────────────────────
 *
 * The previous version was zeroed out to plain #FFF / #000 after device
 * feedback that phase tinting read as *a coloured cast over the app*. That
 * feedback was correct, and the diagnosis was wrong. The problem was never
 * that the canvas had colour — it was that the canvas had colour **uniformly**:
 * a flat 8% rose over the entire screen has no light source, so the eye reads
 * it as a broken white balance rather than as atmosphere.
 *
 * Three things fix it, and all three are encoded below:
 *
 *   1. **The canvas is already warm before phase touches it.** Bloomly's
 *      resting light canvas is warm-white falling to blush. Phase then shifts
 *      that ramp a few percent. Shifting a warm canvas reads as *weather*;
 *      tinting a white canvas reads as *a filter*.
 *
 *   2. **Tint pools downward.** `PHASE_LIFT` rises from ~0.15 at the top of
 *      the screen to 1.0 at the bottom. Colour gathers where the light would
 *      settle, which gives the gradient a direction and therefore a cause.
 *      This is the single change that made phase colour stop looking broken.
 *
 *   3. **Day is nearly clean.** Midday is the reference white. The phase is
 *      most visible at dawn, dusk and night — the hours the app is actually
 *      opened, and the hours the eye forgives colour.
 *
 * RN-free on purpose (like `utils/tinyEscapes.ts` and `utils/aquarium.ts`) so
 * every grading decision is unit-tested rather than eyeballed on a simulator.
 */

export type PhaseKey = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

/** Coarse time bands. Deliberately not 24 buckets — the eye reads four. */
export type TimeBand = 'dawn' | 'day' | 'dusk' | 'night';

/**
 * What ambient particles look like.
 *
 * `petal` is Bloomly's signature and the default in light mode: soft, slow,
 * falling. `pollen` is its lighter cousin for high-energy phases, `star` is
 * night only, `dust` is the neutral fallback.
 */
export type MoteKind = 'none' | 'petal' | 'pollen' | 'dust' | 'star';

export interface Atmosphere {
  /** 4-stop vertical canvas wash, top → bottom. Never flat, never pure white. */
  canvas: [string, string, string, string];
  /**
   * Three large soft blooms that drift on unrelated periods. Colours carry
   * their own alpha. Three rather than two because two blobs read as two
   * blobs — a third breaks the symmetry into something that looks like moving
   * light instead.
   */
  orbs: [string, string, string];
  /** Colour of the ambient glow behind hero elements (the Bloom Ring halo). */
  glow: string;
  /** Solid phase hue, for anything that needs the colour without the alpha. */
  hue: string;
  /** Particle character. */
  mote: MoteKind;
  /** Particle count. Already reduced-motion aware — 0 means draw nothing. */
  moteCount: number;
  /**
   * Direction the light comes from, in degrees (0 = from the top, clockwise).
   * Card rim highlights and the ring sweep align to this, so lighting across
   * the app agrees with itself instead of every gradient picking its own angle.
   */
  lightAngle: number;
  /** 0..1 — how warm the hour is. Drives the greeting and the mote tint. */
  warmth: number;
  /** Seconds for one full ambient drift cycle. Long. Subconscious. */
  driftSec: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Colour maths (pure, tiny, testable)
// ───────────────────────────────────────────────────────────────────────────

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

/** Linear blend, `t` of `b` over `a`. Good enough at these tiny amounts. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const k = Math.max(0, Math.min(1, t));
  return toHex([ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k]);
}

/** Hour → band. Exported so the greeting can't invent its own cutoffs. */
export function timeBand(hour: number): TimeBand {
  if (hour < 5) return 'night';
  if (hour < 9) return 'dawn';
  if (hour < 17) return 'day';
  if (hour < 21) return 'dusk';
  return 'night';
}

// ───────────────────────────────────────────────────────────────────────────
// The garden year — per-phase character
// ───────────────────────────────────────────────────────────────────────────

/**
 * Rose → Peach → Gold → Lavender. Warm to cool, closing on itself.
 *
 * `hue` is what the canvas mixes toward; `glow` is the (lighter) halo behind
 * the Bloom Ring. They differ because a glow sits on top of the canvas and
 * needs to out-value it, or the hero has no light of its own.
 */
const PHASE_ATMOS: Record<
  PhaseKey,
  { hue: string; glow: string; mote: MoteKind; drift: number }
> = {
  /** Letting go. Rose, slow, petals falling. */
  menstrual: { hue: '#F291B1', glow: 'rgba(242,145,177,', mote: 'petal', drift: 38 },
  /** New growth. Sage, brisker, pollen rising. */
  follicular: { hue: '#6FC494', glow: 'rgba(111,196,148,', mote: 'pollen', drift: 30 },
  /** Full bloom. Gold, liveliest. */
  ovulation: { hue: '#EFC55E', glow: 'rgba(239,197,94,', mote: 'pollen', drift: 26 },
  /** Winding down. Lavender, slowest — luteal settles inward. */
  luteal: { hue: '#BFA0EE', glow: 'rgba(191,160,238,', mote: 'petal', drift: 46 },
};

/**
 * Light-mode base ramps, before phase. Already warm — this is the point.
 *
 * `tint` is how strongly the phase is allowed to colour this hour. Day sits at
 * 0.35 (the reference white); night runs highest, because a dim screen can
 * carry far more colour before it reads as a cast, and because 11pm is when
 * someone actually wants the app to feel like a lamp rather than a form.
 */
const BAND_LIGHT: Record<
  TimeBand,
  { ramp: [string, string, string, string]; tint: number; lightAngle: number; warmth: number }
> = {
  dawn: {
    ramp: ['#FFFCF8', '#FFF7F3', '#FDF1EF', '#FAEBEB'],
    tint: 0.7,
    lightAngle: 65,
    warmth: 0.7,
  },
  day: {
    ramp: ['#FFFCFA', '#FFF9F7', '#FEF5F4', '#FCF0F1'],
    tint: 0.35,
    lightAngle: 15,
    warmth: 0.35,
  },
  dusk: {
    ramp: ['#FFFAF6', '#FEF3F1', '#FBEBEE', '#F6E4EE'],
    tint: 0.85,
    lightAngle: 295,
    warmth: 0.85,
  },
  night: {
    ramp: ['#FDF8F7', '#FAF1F3', '#F6EAF1', '#F2E5F0'],
    tint: 1,
    lightAngle: 340,
    warmth: 0.5,
  },
};

/** Dark-mode base ramps. Plum ink, never neutral charcoal. */
const BAND_DARK: Record<
  TimeBand,
  { ramp: [string, string, string, string]; tint: number }
> = {
  dawn: { ramp: ['#140F16', '#17111A', '#1A131E', '#1D1522'], tint: 0.8 },
  day: { ramp: ['#130E15', '#151018', '#18121B', '#1A141E'], tint: 0.5 },
  dusk: { ramp: ['#150F18', '#19121D', '#1D1522', '#211827'], tint: 1 },
  night: { ramp: ['#110D13', '#140F17', '#17111C', '#1A1420'], tint: 1.1 },
};

/**
 * How much of the phase hue reaches each of the four canvas stops.
 *
 * Rising downward is the whole trick. Colour pooling at the bottom of the
 * screen gives the gradient a light source; colour spread evenly gives it a
 * broken white balance. Same pigment, completely different read.
 */
const PHASE_LIFT = [0.15, 0.45, 0.75, 1] as const;

/** Base tint strength before the band multiplier. Dark carries more. */
const TINT_BASE = { light: 0.075, dark: 0.13 };

/** Base particle counts before reduced-motion scaling. Sparse on purpose. */
const MOTE_COUNT: Record<MoteKind, number> = {
  none: 0,
  petal: 11,
  pollen: 15,
  dust: 12,
  star: 20,
};

export interface AtmosphereInput {
  phase: PhaseKey;
  /** 0–23. */
  hour: number;
  isDark: boolean;
  /** When true all drift stops and particle counts fall to zero. */
  reducedMotion?: boolean;
}

/**
 * The whole visual mood of the app, from three inputs.
 *
 * Reduced motion is resolved here rather than at each call site so there is
 * exactly one place that can get it wrong: motes go to 0 and `driftSec` goes to
 * Infinity, which the renderer reads as "draw the static frame". Crucially it
 * removes **motion only** — the colour grading survives, because someone who
 * gets motion sick still deserves the app to feel like evening at 9pm.
 */
export function atmosphere({
  phase,
  hour,
  isDark,
  reducedMotion = false,
}: AtmosphereInput): Atmosphere {
  const p = PHASE_ATMOS[phase] ?? PHASE_ATMOS.menstrual;
  const band = timeBand(hour);

  const light = BAND_LIGHT[band];
  const dark = BAND_DARK[band];
  const base = isDark ? dark.ramp : light.ramp;
  const strength = (isDark ? TINT_BASE.dark : TINT_BASE.light) * (isDark ? dark.tint : light.tint);

  // Mix the base ramp toward the phase hue, more strongly further down.
  const canvas = base.map((stop, i) => mix(stop, p.hue, strength * PHASE_LIFT[i])) as [
    string,
    string,
    string,
    string,
  ];

  // Orbs. Dark needs more alpha to lift light off a near-black canvas; light
  // needs less, because a wash on warm paper has far less headroom before it
  // stops being atmosphere and starts being a stain.
  const orbA = isDark ? 0.17 : 0.1;
  const orbB = isDark ? 0.15 : 0.085;
  const orbC = isDark ? 0.1 : 0.06;
  const bandScale = isDark ? dark.tint : light.tint;

  const rgba = (alpha: number) => `${p.glow}${(alpha * bandScale).toFixed(3)})`;

  // Night overrides the phase particle: moonlight wins over petals. Dark mode
  // gets stars at night too — that is the one time a crisp point of light is
  // the literal subject rather than grit on the screen.
  const mote: MoteKind = band === 'night' && isDark ? 'star' : p.mote;

  return {
    canvas,
    orbs: [rgba(orbA), rgba(orbB), rgba(orbC)],
    glow: rgba(isDark ? 0.3 : 0.22),
    hue: p.hue,
    mote: reducedMotion ? 'none' : mote,
    moteCount: reducedMotion ? 0 : MOTE_COUNT[mote],
    lightAngle: light.lightAngle,
    warmth: light.warmth,
    driftSec: reducedMotion ? Infinity : p.drift,
  };
}

/**
 * Greeting that matches the atmosphere rather than inventing its own cutoffs.
 * Home previously hardcoded 12/18 boundaries that disagreed with the visual
 * grading — the canvas went dusk while the copy still said "afternoon".
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
