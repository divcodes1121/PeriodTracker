/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TODAY'S GARDEN — the reward loop, as arithmetic.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every log you make plants something. Over weeks the strip of soil at the
 * bottom of Home fills in: bare earth → one sprout → a row of sprouts → buds →
 * flowers → a garden with grass and a butterfly.
 *
 * ── Why this instead of a streak ──────────────────────────────────────────
 *
 * The obvious mechanic is a streak counter, and it is the wrong one for this
 * app. A streak **punishes** — it has a number that can go to zero, and the
 * one week someone is too unwell to open a period tracker is exactly the week
 * it resets. That turns a health app into a source of guilt.
 *
 * A garden only ever accumulates. Miss a month and it is still there, exactly
 * as you left it. The incentive to return is that returning *adds* something,
 * not that staying away destroys something. Same retention mechanic, opposite
 * emotional sign.
 *
 * That is also why there is no decay, no wilting, and no "your garden misses
 * you" copy anywhere in this module. Those were all considered and all of them
 * reintroduce the punishment through the back door.
 *
 * ── Why it is RN-free ─────────────────────────────────────────────────────
 *
 * Same reason as `utils/aquarium.ts` and `utils/tinyEscapes.ts`: every bug
 * these scene modules have ever had was arithmetic that typecheck could not
 * see. Layout maths lives here and gets unit-tested; only drawing lives in the
 * component.
 */

/** What a single plant looks like. Drawn by `components/TodaysGarden`. */
export type PlantKind = 'grass' | 'sprout' | 'bud' | 'flower';

export interface Plant {
  kind: PlantKind;
  /** Horizontal position, 0..1 across the strip. */
  x: number;
  /** Height as a fraction of the strip height, 0..1. */
  height: number;
  /** Index into the garden's hue rotation. Resolved to a colour by the view. */
  hue: number;
  /** Slight per-plant lean, degrees. Nothing in a garden is perfectly vertical. */
  lean: number;
}

export interface GardenStage {
  /** 0-based stage index. */
  index: number;
  /** Shown under the garden. Warm, never a score. */
  label: string;
  /** Logs needed to reach this stage. */
  at: number;
}

/**
 * The six stages.
 *
 * Thresholds are deliberately front-loaded: the *first* log must visibly
 * change something, or the mechanic never gets a chance to teach itself. After
 * that they stretch out, so the garden keeps having somewhere to go for months
 * without ever demanding daily attendance.
 */
export const GARDEN_STAGES: GardenStage[] = [
  { index: 0, at: 0, label: 'Your garden is waiting' },
  { index: 1, at: 1, label: 'Something is growing' },
  { index: 2, at: 4, label: 'Finding its feet' },
  { index: 3, at: 10, label: 'Getting ready to bloom' },
  { index: 4, at: 20, label: 'In bloom' },
  { index: 5, at: 40, label: 'A garden of your own' },
];

/** Which stage a given log count sits in. */
export function stageForLogs(logs: number): GardenStage {
  const n = Math.max(0, Math.floor(logs));
  let found = GARDEN_STAGES[0];
  for (const s of GARDEN_STAGES) {
    if (n >= s.at) found = s;
  }
  return found;
}

/**
 * Progress toward the next stage, 0..1. Returns 1 at the final stage.
 *
 * Used for the thin growth bar under the garden. Kept here rather than in the
 * view so "how close am I" can be tested — an off-by-one in a progress bar is
 * invisible until someone screenshots it at exactly the wrong moment.
 */
export function stageProgress(logs: number): number {
  const n = Math.max(0, Math.floor(logs));
  const current = stageForLogs(n);
  const next = GARDEN_STAGES[current.index + 1];
  if (!next) return 1;
  const span = next.at - current.at;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (n - current.at) / span));
}

/** Deterministic PRNG, so a garden looks the same every time it is opened. */
function seeded(seed: number) {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Plants are capped so a long-time user's garden stays a garden, not a hedge. */
export const MAX_PLANTS = 14;

/**
 * Lay out the garden for a given number of logs.
 *
 * The mix shifts with the stage rather than the count: early gardens are
 * mostly grass and sprouts, late ones mostly flowers. Growing the *count*
 * alone would just make a denser field of the same thing, which stops reading
 * as progress after about a week.
 */
export function gardenFor(logs: number, seed = 20260723): Plant[] {
  const n = Math.max(0, Math.floor(logs));
  if (n === 0) return [];

  const stage = stageForLogs(n).index;
  const count = Math.min(MAX_PLANTS, 1 + Math.floor(n / 2.2));
  const rand = seeded(seed);

  // Odds of each kind, by stage. Rows sum to 1; earlier stages weight small
  // things, later ones weight flowers.
  const MIX: Record<number, [number, number, number, number]> = {
    //        grass  sprout  bud   flower
    0: [1, 0, 0, 0],
    1: [0.45, 0.55, 0, 0],
    2: [0.35, 0.5, 0.15, 0],
    3: [0.3, 0.32, 0.26, 0.12],
    4: [0.24, 0.2, 0.24, 0.32],
    5: [0.2, 0.12, 0.2, 0.48],
  };
  const mix = MIX[stage] ?? MIX[1];

  const plants: Plant[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand();
    let kind: PlantKind = 'grass';
    let acc = 0;
    const kinds: PlantKind[] = ['grass', 'sprout', 'bud', 'flower'];
    for (let k = 0; k < 4; k++) {
      acc += mix[k];
      if (r <= acc) {
        kind = kinds[k];
        break;
      }
    }

    // Spread across the strip with jitter, so plants never form a visible
    // grid — evenly spaced flowers read as a fence.
    const slot = (i + 0.5) / count;
    const x = Math.max(0.03, Math.min(0.97, slot + (rand() - 0.5) * (0.7 / count)));

    const base = kind === 'grass' ? 0.28 : kind === 'sprout' ? 0.42 : kind === 'bud' ? 0.62 : 0.8;
    plants.push({
      kind,
      x,
      height: Math.max(0.15, Math.min(1, base + (rand() - 0.5) * 0.24)),
      hue: Math.floor(rand() * 4),
      lean: (rand() - 0.5) * 14,
    });
  }

  // Draw back-to-front by height so short plants never hide behind tall ones.
  return plants.sort((a, b) => b.height - a.height);
}

/**
 * How many logs a garden counts. One per *day* that has anything on it, not
 * one per symptom — otherwise a bad day with six symptoms grows six flowers
 * and a quiet day grows none, which rewards suffering.
 */
export function countGardenLogs(input: {
  periodDays: number;
  symptomDays: number;
  moodDays: number;
  resetSessions: number;
}): number {
  return (
    Math.max(0, input.periodDays) +
    Math.max(0, input.symptomDays) +
    Math.max(0, input.moodDays) +
    Math.max(0, input.resetSessions)
  );
}
