/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TODAY'S CARE — the evidence register.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every health claim Bloomly makes points at a row in this file. Nothing in
 * the recommendation engine, the exercise library or the nutrition data is
 * allowed to assert a benefit without a `sources` entry, and a test enforces
 * that.
 *
 * ── Why this exists as code rather than as a document ─────────────────────
 *
 * Health copy rots silently. Someone tweaks a sentence for tone, the claim
 * drifts a little further than the source supports, and six months later the
 * app is confidently telling people something no guideline says. Putting the
 * citation *in the same object as the copy* means the claim and its warrant
 * move together, and the "why this helps" text a user can open is generated
 * from the same field a reviewer would audit.
 *
 * ── The rules this file encodes ───────────────────────────────────────────
 *
 * 1. **Never diagnose.** Bloomly describes what is often helpful; it never
 *    names a condition someone might have. "This needs a clinician to look at"
 *    is always the right sentence, and "this could be endometriosis" is never
 *    one.
 * 2. **Never claim to treat.** Language is "may help", "many people find",
 *    "tends to". `STRENGTH` below makes the confidence machine-readable so the
 *    UI can phrase weak evidence honestly rather than uniformly.
 * 3. **Prefer conservative when evidence is mixed.** Supplements are the clear
 *    case: the Cochrane review found *no high-quality evidence* for any dietary
 *    supplement in dysmenorrhoea. So Bloomly suggests food, never doses, and
 *    says the evidence is limited where it is.
 * 4. **Safety outranks wellness.** See `safety.ts` — if a red flag fires, the
 *    plan leads with "see someone", and wellness content is demoted below it.
 */

export interface Source {
  id: string;
  /** Publishing organisation, shown to the user. */
  org: string;
  title: string;
  url: string;
}

/**
 * Every source cited in the app. Kept small on purpose: a handful of
 * high-quality guideline bodies beats a long tail of primary studies that
 * nobody has appraised.
 */
export const SOURCES: Record<string, Source> = {
  acogDysmenorrhea: {
    id: 'acogDysmenorrhea',
    org: 'ACOG',
    title: 'Dysmenorrhea: Painful Periods',
    url: 'https://www.acog.org/womens-health/faqs/dysmenorrhea-painful-periods',
  },
  acogHeavyBleeding: {
    id: 'acogHeavyBleeding',
    org: 'ACOG',
    title: 'Heavy Menstrual Bleeding',
    url: 'https://www.acog.org/womens-health/faqs/heavy-menstrual-bleeding',
  },
  nhsPeriodPain: {
    id: 'nhsPeriodPain',
    org: 'NHS',
    title: 'Period pain',
    url: 'https://www.nhs.uk/conditions/period-pain/',
  },
  nhsHeavyPeriods: {
    id: 'nhsHeavyPeriods',
    org: 'NHS',
    title: 'Heavy periods',
    url: 'https://www.nhs.uk/conditions/heavy-periods/',
  },
  nhsTss: {
    id: 'nhsTss',
    org: 'NHS',
    title: 'Toxic shock syndrome',
    url: 'https://www.nhs.uk/conditions/toxic-shock-syndrome/',
  },
  nhsIronAnaemia: {
    id: 'nhsIronAnaemia',
    org: 'NHS',
    title: 'Iron deficiency anaemia',
    url: 'https://www.nhs.uk/conditions/iron-deficiency-anaemia/',
  },
  clevelandDysmenorrhea: {
    id: 'clevelandDysmenorrhea',
    org: 'Cleveland Clinic',
    title: 'Dysmenorrhea: Menstrual Cramps, Causes & Treatments',
    url: 'https://my.clevelandclinic.org/health/diseases/4148-dysmenorrhea',
  },
  mayoHeavyBleeding: {
    id: 'mayoHeavyBleeding',
    org: 'Mayo Clinic',
    title: 'Heavy menstrual bleeding',
    url: 'https://www.mayoclinic.org/diseases-conditions/menorrhagia/symptoms-causes/syc-20352829',
  },
  cochraneExercise: {
    id: 'cochraneExercise',
    org: 'Cochrane',
    title: 'Exercise for dysmenorrhoea',
    url: 'https://www.cochrane.org/CD004142/MENSTR_exercise-dysmenorrhoea',
  },
  cochraneSupplements: {
    id: 'cochraneSupplements',
    org: 'Cochrane',
    title: 'Dietary supplements for pain during menstruation',
    url: 'https://www.cochrane.org/CD002124/MENSTR_dietary-supplements-pain-during-menstruation',
  },
  heatMetaAnalysis: {
    id: 'heatMetaAnalysis',
    org: 'Systematic review',
    title: 'Heat therapy for primary dysmenorrhea: a systematic review and meta-analysis',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12876241/',
  },
};

export type SourceId = keyof typeof SOURCES;

/**
 * How confident the evidence is. Drives the *verb* the UI uses, so a
 * well-supported suggestion and a shaky one never read the same.
 *
 *   good      guideline-backed and consistent      "Heat helps many people"
 *   moderate  reviewed, some inconsistency          "may help"
 *   limited   low-quality or mixed evidence         "evidence is limited, but"
 *
 * `limited` is not a reason to hide something harmless and pleasant. It is a
 * reason to say so out loud.
 */
export type Strength = 'good' | 'moderate' | 'limited';

/** The hedging verb for each strength. One place, so the voice stays uniform. */
export const STRENGTH_PHRASE: Record<Strength, string> = {
  good: 'Well supported',
  moderate: 'May help',
  limited: 'Evidence is limited',
};

/** Resolve source ids to display rows. Unknown ids are dropped, never rendered raw. */
export function resolveSources(ids: readonly string[]): Source[] {
  return ids.map((id) => SOURCES[id]).filter(Boolean);
}

/**
 * The disclaimer. One string, used everywhere the feature surfaces, because a
 * disclaimer that is phrased three different ways reads as boilerplate rather
 * than as a genuine boundary.
 */
export const CARE_DISCLAIMER =
  'Bloomly offers general wellbeing suggestions, not medical advice. It cannot diagnose anything. If something feels wrong or a symptom is new, severe or worrying, please talk to a doctor or midwife.';
