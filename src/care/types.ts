import { SourceId, Strength } from './evidence';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TODAY'S CARE — data model.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * RN-free on purpose, like `utils/garden.ts` and `theme/atmosphere.ts`: the
 * whole recommendation engine is pure functions over these types, so the
 * clinical logic is unit-tested rather than eyeballed in a simulator.
 */

// ───────────────────────────────────────────────────────────────────────────
// The check-in
// ───────────────────────────────────────────────────────────────────────────

/**
 * Ordinal scales are stored as *words*, not numbers.
 *
 * A tempting shortcut is `pain: 1 | 2 | 3 | 4`. It ages badly: nobody reading
 * `pain > 2` six months later knows whether that means moderate-or-worse, and
 * inserting a level renumbers every rule. Words are self-documenting at every
 * call site, and `PAIN_RANK` below gives ordering where ordering is genuinely
 * needed.
 */
export type PainLevel = 'none' | 'mild' | 'moderate' | 'severe';
export type EnergyLevel = 'veryHigh' | 'high' | 'normal' | 'low' | 'veryLow';
export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy' | 'veryHeavy';
export type SleepQuality = 'excellent' | 'good' | 'okay' | 'poor' | 'veryPoor';

export type CareMood =
  | 'happy'
  | 'calm'
  | 'emotional'
  | 'anxious'
  | 'irritable'
  | 'low'
  | 'stressed'
  | 'overwhelmed';

export type CareSymptom =
  | 'cramps'
  | 'backPain'
  | 'headache'
  | 'migraine'
  | 'bloating'
  | 'nausea'
  | 'fatigue'
  | 'tenderBreasts'
  | 'acne'
  | 'digestive'
  | 'cravings'
  | 'none';

/**
 * The safety check. Only asked when something in the main check-in already
 * suggests it might matter (see `needsSafetyCheck`), so the common path stays
 * under twenty seconds and the uncommon path gets asked properly.
 *
 * These are deliberately phrased as *observations*, never as conditions. The
 * user reports what is happening; `safety.ts` decides what it means.
 */
export interface SafetyAnswers {
  /** Soaking through a pad or tampon every hour or two, for several hours. */
  soakingHourly?: boolean;
  /** Clots larger than about 2.5cm / a 10p coin / a quarter. */
  largeClots?: boolean;
  /** Pain that over-the-counter painkillers have not touched. */
  painkillersNotHelping?: boolean;
  /** Fever, or feeling flu-like and suddenly unwell. */
  fever?: boolean;
  /** Fainted, or close to it. */
  faintness?: boolean;
  /** Breathless doing ordinary things. */
  breathless?: boolean;
  /** Currently using a tampon or menstrual cup. Only relevant alongside fever. */
  usingInternalProduct?: boolean;
}

export interface CheckIn {
  id: string;
  userId: string;
  /** The day this check-in describes. One per calendar day; re-doing it replaces. */
  date: Date;
  pain: PainLevel;
  moods: CareMood[];
  symptoms: CareSymptom[];
  energy: EnergyLevel;
  flow: FlowLevel;
  sleep: SleepQuality;
  /** Free text. Influences the plan only through the conservative rules in the engine. */
  notes: string;
  safety?: SafetyAnswers;
  createdAt: Date;
}

// ───────────────────────────────────────────────────────────────────────────
// Ordering
// ───────────────────────────────────────────────────────────────────────────

export const PAIN_RANK: Record<PainLevel, number> = {
  none: 0,
  mild: 1,
  moderate: 2,
  severe: 3,
};

export const ENERGY_RANK: Record<EnergyLevel, number> = {
  veryLow: 0,
  low: 1,
  normal: 2,
  high: 3,
  veryHigh: 4,
};

export const FLOW_RANK: Record<FlowLevel, number> = {
  spotting: 0,
  light: 1,
  medium: 2,
  heavy: 3,
  veryHeavy: 4,
};

export const SLEEP_RANK: Record<SleepQuality, number> = {
  veryPoor: 0,
  poor: 1,
  okay: 2,
  good: 3,
  excellent: 4,
};

// ───────────────────────────────────────────────────────────────────────────
// Safety
// ───────────────────────────────────────────────────────────────────────────

/**
 * What Bloomly should do about what it has been told.
 *
 *   none      carry on, show the wellness plan
 *   routine   worth raising at a normal appointment; plan still shows
 *   urgent    contact a clinician today; plan is demoted below the notice
 *   emergency seek immediate help; **wellness content is suppressed entirely**
 *
 * The last one is the important one. Offering someone a stretching routine
 * while they are describing possible toxic shock is not merely unhelpful, it
 * actively competes for attention with the only thing that matters.
 */
export type CareUrgency = 'none' | 'routine' | 'urgent' | 'emergency';

export interface SafetyFlag {
  id: string;
  urgency: CareUrgency;
  /** What the user told us, reflected back plainly. Never a diagnosis. */
  observation: string;
  /** What to do about it. Always an action, never a label. */
  action: string;
  sources: SourceId[];
}

export interface SafetyResult {
  urgency: CareUrgency;
  flags: SafetyFlag[];
  /** True when wellness content must be suppressed rather than merely demoted. */
  suppressPlan: boolean;
  /** The single sentence shown at the top of the plan. */
  headline: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Exercises
// ───────────────────────────────────────────────────────────────────────────

export type Difficulty = 'restful' | 'gentle' | 'moderate';

/**
 * A named skeleton joint. Poses are expressed as positions for these, in a
 * normalised 0–100 box, so every exercise animation is *data* rather than a
 * bespoke component. See `components/care/ExerciseFigure.tsx`.
 */
export type Joint =
  | 'head'
  | 'neck'
  | 'chest'
  | 'hip'
  | 'kneeL'
  | 'ankleL'
  | 'kneeR'
  | 'ankleR'
  | 'elbowL'
  | 'handL'
  | 'elbowR'
  | 'handR';

export type Pose = Record<Joint, [number, number]>;

export interface Keyframe {
  pose: Pose;
  /** Milliseconds spent easing *into* this pose from the previous one. */
  ms: number;
  /** Breath cue held during this frame. Drives the ring and the voice line. */
  breath: 'in' | 'out' | 'hold';
  /** Optional on-screen cue, e.g. "lengthen through the spine". */
  cue?: string;
}

export interface Exercise {
  id: string;
  title: string;
  /** One sentence. What it is, in plain words. */
  description: string;
  difficulty: Difficulty;
  /** Suggested duration in seconds. */
  seconds: number;
  /** Symptoms this is commonly used for. Drives matching in the engine. */
  helps: CareSymptom[];
  /** Plain-language benefits. Each must be defensible from `sources`. */
  benefits: string[];
  /** Situations to skip it. Always present — an empty array is a smell. */
  avoidIf: string[];
  equipment: string[];
  /** Numbered steps. Short imperative sentences. */
  steps: string[];
  /** One line on breathing, spoken by the optional voice guide. */
  breathing: string;
  /** One safety line, always shown, never buried in a disclosure. */
  safety: string;
  sources: SourceId[];
  /** The animation. Loops. */
  frames: Keyframe[];
}

// ───────────────────────────────────────────────────────────────────────────
// The plan
// ───────────────────────────────────────────────────────────────────────────

export type CareSectionId = 'move' | 'eat' | 'drink' | 'careFor';

export interface Suggestion {
  id: string;
  title: string;
  /** The "why". Always present — a suggestion without a reason is an order. */
  why: string;
  strength: Strength;
  sources: SourceId[];
  /** Optional exercise this suggestion opens. */
  exerciseId?: string;
  /** Brand hue key for the card. */
  hue?: string;
  /** Icon name. */
  icon?: string;
}

export interface CareSection {
  id: CareSectionId;
  title: string;
  /** One line framing the section for today specifically. */
  lead: string;
  items: Suggestion[];
}

export interface CarePlan {
  /** The check-in this plan was generated from. */
  checkInId: string;
  date: Date;
  safety: SafetyResult;
  /** Empty when `safety.suppressPlan` is true. */
  sections: CareSection[];
  /** Exercises to offer, already ordered and filtered for today. */
  exercises: Exercise[];
  /** The closing message. Warm, never performative. */
  encouragement: string;
  /** The single most important thing today, shown at the top. */
  focus: string;
}
