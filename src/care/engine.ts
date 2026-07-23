import { EXERCISES } from './exercises';
import { DRINKS, FOODS, SELF_CARE, CareItem } from './nutrition';
import { triage } from './safety';
import {
  CareMood,
  CarePlan,
  CareSection,
  CareSymptom,
  CheckIn,
  ENERGY_RANK,
  Exercise,
  FLOW_RANK,
  PAIN_RANK,
  SLEEP_RANK,
  Suggestion,
} from './types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE RECOMMENDATION ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Takes a check-in, returns a plan. Pure, deterministic, RN-free, and every
 * rule below is written to be readable by someone who is not a programmer —
 * because the people who should be reviewing clinical logic mostly are not.
 *
 * ── Design constraints, in priority order ─────────────────────────────────
 *
 * 1. **Safety first, structurally.** `triage()` runs before anything else and
 *    can suppress the entire plan. Not reorder it — suppress it. See
 *    `safety.ts` for why.
 * 2. **Never escalate intensity into pain.** The single hardest rule: as
 *    reported pain goes up, the maximum permitted exercise difficulty goes
 *    *down*, and at severe there is nothing above `restful` on offer. An app
 *    that suggests a moderate flow when someone has said "severe" has not
 *    listened, and being ignored while in pain is its own small injury.
 * 3. **Short lists.** Each section is capped. A wellness plan with eighteen
 *    suggestions is a to-do list, and a to-do list is the opposite of care.
 * 4. **Every suggestion carries its reason.** A suggestion without a "why" is
 *    an instruction, and instructions from an app are easy to resent.
 *
 * ── Why the rules are data-shaped rather than a big if-tree ───────────────
 *
 * Each rule is a small named function returning suggestions. That means a test
 * can assert "severe pain never yields a moderate exercise" across *every*
 * combination of the other six inputs by brute force, which is exactly what
 * `engine.test.ts` does. A nested conditional would make that impossible to
 * check and easy to break.
 */

// ───────────────────────────────────────────────────────────────────────────
// Difficulty ceiling — rule 2, in one table
// ───────────────────────────────────────────────────────────────────────────

const DIFFICULTY_RANK = { restful: 0, gentle: 1, moderate: 2 } as const;

/**
 * The hardest thing Bloomly will offer, given how the day is going.
 *
 * Pain sets the ceiling; very low energy and very poor sleep can each lower it
 * further but never raise it. The ceiling is a *maximum*, not a target — a
 * restful option is always in the list even on a good day, because sometimes
 * the right answer to "how are you" is "lying down".
 */
export function difficultyCeiling(c: {
  pain: CheckIn['pain'];
  energy: CheckIn['energy'];
  sleep: CheckIn['sleep'];
  flow: CheckIn['flow'];
}): 'restful' | 'gentle' | 'moderate' {
  // Severe pain: nothing above restful. No exceptions, no combinations.
  if (c.pain === 'severe') return 'restful';

  let ceiling: 'restful' | 'gentle' | 'moderate' =
    c.pain === 'moderate' ? 'gentle' : 'moderate';

  // Running on empty lowers it a step. A "moderate" suggestion to someone who
  // slept two hours reads as a demand.
  if (ENERGY_RANK[c.energy] <= ENERGY_RANK.veryLow) ceiling = 'restful';
  else if (ENERGY_RANK[c.energy] <= ENERGY_RANK.low && ceiling === 'moderate') ceiling = 'gentle';

  if (SLEEP_RANK[c.sleep] <= SLEEP_RANK.veryPoor && ceiling === 'moderate') ceiling = 'gentle';

  // Very heavy flow: keep it restful. Not because movement is unsafe, but
  // because the practical reality of a very heavy day makes anything else an
  // unhelpful suggestion.
  if (FLOW_RANK[c.flow] >= FLOW_RANK.veryHeavy) ceiling = 'restful';

  return ceiling;
}

/**
 * Notes that should quietly lower the ceiling.
 *
 * Deliberately one-directional and deliberately dumb: notes can make the plan
 * gentler, never harder. Someone typing "exams" or "long shift" gets a lighter
 * day; nobody typing "feeling great" gets talked into a back-bend.
 */
const TIRING_CONTEXT = /\b(exam|exams|deadline|travel|travell?ing|flight|long day|long shift|night shift|didn'?t sleep|no sleep|work trip|moving house)\b/i;

export function notesLowerIntensity(notes: string | undefined): boolean {
  return TIRING_CONTEXT.test(notes ?? '');
}

// ───────────────────────────────────────────────────────────────────────────
// Move
// ───────────────────────────────────────────────────────────────────────────

/**
 * Pick today's movement.
 *
 * Scoring rather than filtering, so an exercise that helps two of today's
 * symptoms outranks one that helps one — and so the list degrades gracefully
 * when nothing matches instead of coming back empty.
 */
export function pickExercises(c: {
  pain: CheckIn['pain'];
  energy: CheckIn['energy'];
  sleep: CheckIn['sleep'];
  flow: CheckIn['flow'];
  symptoms: CareSymptom[];
  moods: CareMood[];
  notes?: string;
  limit?: number;
}): Exercise[] {
  let ceiling = difficultyCeiling(c);
  if (notesLowerIntensity(c.notes) && ceiling === 'moderate') ceiling = 'gentle';

  const max = DIFFICULTY_RANK[ceiling];
  const symptoms = new Set(c.symptoms);
  const moods = new Set(c.moods);

  // Migraine excludes anything that puts the head below the heart. The library
  // states this in `avoidIf`; this is where that field earns its keep.
  const migraine = symptoms.has('migraine') || symptoms.has('headache');

  const scored = EXERCISES.filter((e) => DIFFICULTY_RANK[e.difficulty] <= max)
    .filter((e) => {
      if (!migraine) return true;
      return !/head below|throb|dizz|invers/i.test(e.avoidIf.join(' '));
    })
    .map((e) => {
      let score = 0;
      for (const s of e.helps) if (symptoms.has(s)) score += 3;
      // An anxious or overwhelmed day biases toward breath work, which ACOG
      // lists among the things that help people cope.
      if ((moods.has('anxious') || moods.has('overwhelmed') || moods.has('stressed')) &&
        /breath/i.test(`${e.id} ${e.title}`)) {
        score += 4;
      }
      // On a low-energy day, shorter is kinder.
      if (ENERGY_RANK[c.energy] <= ENERGY_RANK.low && e.seconds <= 90) score += 1;
      // Restful options float up as pain rises.
      if (PAIN_RANK[c.pain] >= PAIN_RANK.moderate && e.difficulty === 'restful') score += 2;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score || a.e.seconds - b.e.seconds);

  const limit = c.limit ?? 4;
  const out = scored.slice(0, limit).map((s) => s.e);

  // Always include at least one genuinely restful option, whatever the scores
  // said. There must always be a version of today's plan that requires nothing.
  if (!out.some((e) => e.difficulty === 'restful')) {
    const rest = EXERCISES.find((e) => e.difficulty === 'restful' && !out.includes(e));
    if (rest) out[out.length - 1] = rest;
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Eat / drink / care
// ───────────────────────────────────────────────────────────────────────────

/**
 * Match items to today.
 *
 * `forSymptoms` absent means always eligible; items that name symptoms score
 * by how many of today's they match.
 *
 * ── The backfill, and why it is not optional ──────────────────────────────
 *
 * The first version of this simply dropped everything that scored zero. That
 * is correct-looking and wrong: **every food in the library names symptoms**,
 * so someone who logs "no symptoms" — a perfectly ordinary day two — got an
 * empty *Eat* section. An empty card in a wellness plan reads as the app
 * having nothing for you, which is the one impression this feature exists to
 * avoid.
 *
 * So a section has a floor. When scoring leaves it thin, it backfills in
 * declaration order — which is why the general-purpose items are declared
 * first in each list. Caught by the "fills every section for every plausible
 * day" test, not by reading the code.
 */
const SECTION_FLOOR = 2;

function matchItems(items: CareItem[], symptoms: Set<CareSymptom>, limit: number): CareItem[] {
  const scored = items.map((item) => {
    if (!item.forSymptoms || item.forSymptoms.length === 0) return { item, score: 1 };
    const hits = item.forSymptoms.filter((s) => symptoms.has(s)).length;
    return { item, score: hits * 3 };
  });

  const matched = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item);

  if (matched.length >= Math.min(SECTION_FLOOR, limit)) return matched;

  const backfill = items.filter((i) => !matched.includes(i));
  return [...matched, ...backfill].slice(0, Math.max(Math.min(SECTION_FLOOR, limit), matched.length));
}

function toSuggestions(items: CareItem[]): Suggestion[] {
  return items.map((i) => ({
    id: i.id,
    title: i.title,
    why: i.why,
    strength: i.strength,
    sources: i.sources,
    icon: i.icon,
    hue: i.hue,
  }));
}

// ───────────────────────────────────────────────────────────────────────────
// Copy
// ───────────────────────────────────────────────────────────────────────────

/**
 * The one-line focus at the top of the plan.
 *
 * Answers "if I only do one thing today, what?" — because on a bad day a plan
 * with four sections is four more decisions than someone has in them.
 */
function focusFor(c: CheckIn): string {
  if (c.pain === 'severe') return 'Heat, and as little as possible.';
  if (FLOW_RANK[c.flow] >= FLOW_RANK.heavy && c.symptoms.includes('fatigue')) {
    return 'Iron with your meals, and an early night.';
  }
  if (c.symptoms.includes('migraine')) return 'Dark, quiet, and no screens for a bit.';
  if (c.moods.includes('anxious') || c.moods.includes('overwhelmed')) {
    return 'Slow the breath down first. Everything else after.';
  }
  if (ENERGY_RANK[c.energy] <= ENERGY_RANK.low) return 'Rest is the plan today, not a gap in it.';
  if (c.pain === 'moderate') return 'Warmth, and something gentle if you feel like moving.';
  if (SLEEP_RANK[c.sleep] <= SLEEP_RANK.poor) return 'Go easy. Last night was short.';
  return 'A steady day. Move a little if you feel like it.';
}

/**
 * The closing message.
 *
 * ── The line this has to walk ─────────────────────────────────────────────
 *
 * Encouragement in wellness apps fails in two directions. Too bright and it is
 * toxic positivity — "your body is doing something amazing!" to someone in
 * genuine pain reads as being talked over. Too solemn and it is pity.
 *
 * The rule used here: **acknowledge, permit, and stop.** Name the day as it
 * actually is, give permission for it to be that, and then shut up. Nothing
 * below asks anything of the reader, and nothing congratulates them for
 * suffering.
 */
function encouragementFor(c: CheckIn): string {
  if (c.pain === 'severe') {
    return 'Today is a hard one, and you already did the kind thing by checking in. Nothing else is required of you.';
  }
  if (c.moods.includes('overwhelmed')) {
    return 'Overwhelmed is a full feeling, not a personal failing. One thing at a time is a complete plan.';
  }
  if (c.moods.includes('low') || c.moods.includes('emotional')) {
    return 'Feeling low around your period is common and it does pass. You do not have to talk yourself out of it in the meantime.';
  }
  if (c.moods.includes('irritable')) {
    return 'Short-tempered days happen. You are allowed to be less patient than usual without it meaning anything.';
  }
  if (c.moods.includes('anxious') || c.moods.includes('stressed')) {
    return 'You do not have to be calm to be okay. Slow the breath where you can and let the rest be as it is.';
  }
  if (ENERGY_RANK[c.energy] <= ENERGY_RANK.low) {
    return 'You do not have to be productive every hour. Resting now is not borrowing against later.';
  }
  if (SLEEP_RANK[c.sleep] <= SLEEP_RANK.poor) {
    return 'A short night makes everything heavier. Go gently, and let today be a smaller day.';
  }
  if (c.pain === 'none' && ENERGY_RANK[c.energy] >= ENERGY_RANK.high) {
    return 'A good day inside a period is worth noticing. Enjoy it without needing to make the most of it.';
  }
  return 'Taking things slowly is perfectly okay. You already did something kind for yourself today.';
}

const SECTION_LEADS = {
  move: (rest: boolean) =>
    rest
      ? 'Nothing here needs effort. Rest is a legitimate answer.'
      : 'Small and gentle. Stop whenever you like.',
  eat: 'Nothing off-limits, just a few things that tend to help.',
  drink: 'Warm things, mostly.',
  careFor: 'The unglamorous ones that actually work.',
};

// ───────────────────────────────────────────────────────────────────────────
// The engine
// ───────────────────────────────────────────────────────────────────────────

/**
 * Build today's plan.
 *
 * Deterministic: same check-in, same plan, always. No dates, no randomness, no
 * "tip of the day" rotation — a plan that changes when you reopen it is a plan
 * you cannot trust or discuss with anyone.
 */
export function buildCarePlan(checkIn: CheckIn): CarePlan {
  const safety = triage(checkIn);

  // The structural rule. At emergency there is no plan, no exercises and no
  // encouragement — only the notice. Anything else competes with it.
  if (safety.suppressPlan) {
    return {
      checkInId: checkIn.id,
      date: checkIn.date,
      safety,
      sections: [],
      exercises: [],
      encouragement: '',
      focus: '',
    };
  }

  const symptoms = new Set(checkIn.symptoms);
  const exercises = pickExercises(checkIn);
  const restOnly = exercises.every((e) => e.difficulty === 'restful');

  const move: CareSection = {
    id: 'move',
    title: 'Move',
    lead: SECTION_LEADS.move(restOnly),
    items: exercises.map<Suggestion>((e) => ({
      id: e.id,
      title: e.title,
      why: e.benefits[0],
      strength: 'moderate',
      sources: e.sources,
      exerciseId: e.id,
      icon: 'breathe',
      hue: e.difficulty === 'restful' ? 'lavender' : 'sage',
    })),
  };

  const eat: CareSection = {
    id: 'eat',
    title: 'Eat',
    lead: SECTION_LEADS.eat,
    items: toSuggestions(matchItems(FOODS, symptoms, 4)),
  };

  const drink: CareSection = {
    id: 'drink',
    title: 'Drink',
    lead: SECTION_LEADS.drink,
    items: toSuggestions(matchItems(DRINKS, symptoms, 3)),
  };

  const careFor: CareSection = {
    id: 'careFor',
    title: 'Care for yourself',
    lead: SECTION_LEADS.careFor,
    items: toSuggestions(matchItems(SELF_CARE, symptoms, 4)),
  };

  return {
    checkInId: checkIn.id,
    date: checkIn.date,
    safety,
    sections: [move, eat, drink, careFor],
    exercises,
    encouragement: encouragementFor(checkIn),
    focus: focusFor(checkIn),
  };
}
