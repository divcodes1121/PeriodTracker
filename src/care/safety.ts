import {
  CareSymptom,
  CareUrgency,
  CheckIn,
  FLOW_RANK,
  SafetyAnswers,
  SafetyFlag,
  SafetyResult,
} from './types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SAFETY TRIAGE — the module that gets to overrule everything else.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This runs *before* any wellness content is generated, and its verdict can
 * suppress the entire plan.
 *
 * ── The failure mode it exists to prevent ─────────────────────────────────
 *
 * A wellness app's characteristic harm is not bad advice. It is **plausible
 * advice offered at the wrong moment**: someone describes soaking a pad every
 * hour and fainting, and the app cheerfully suggests ginger tea and a hip
 * stretch. Every individual suggestion is harmless. Together they tell the
 * user that what they are experiencing is normal and manageable at home, which
 * is the one thing an app must never say when it cannot know.
 *
 * So the rule is structural rather than editorial: at `emergency`, the plan is
 * not softened or reordered — **it is not generated at all**.
 *
 * ── Three boundaries this code holds ──────────────────────────────────────
 *
 * 1. **It never names a condition.** Not "this could be toxic shock", not
 *    "you may be anaemic". Every flag reflects the observation back and names
 *    an action. Deciding what a symptom means is a clinician's job, and
 *    guessing out loud is how an app frightens someone into ignoring it.
 * 2. **It never reassures.** There is no "this is probably fine" branch.
 *    Absence of a flag produces silence, not comfort — because the check-in
 *    asks about eight things and a body can do considerably more than eight.
 * 3. **It is deliberately over-sensitive.** The cost of a false positive is a
 *    user reading one paragraph they did not need. The cost of a false
 *    negative is unbounded. Thresholds are set accordingly, and where a
 *    guideline gave a range, the conservative end was taken.
 *
 * ── Thresholds, and where they come from ──────────────────────────────────
 *
 * Every number below is a published one, not a judgement call:
 *
 *   • soaking a pad/tampon hourly for several hours — NHS, Mayo, ACOG all
 *     list this as the definition of heavy menstrual bleeding worth seeing
 *     someone about
 *   • clots larger than ~2.5cm — NHS ("larger than about 2.5cm"), Mayo
 *     ("the size of a quarter or larger")
 *   • severe pain not relieved by painkillers — NHS lists this under *urgent*
 *     advice: contact a GP or 111
 *   • fever + internal product (tampon/cup) — NHS toxic shock guidance is
 *     explicit that this needs urgent treatment and the product removed
 *   • bleeding longer than 7 days, pain stopping daily activities — NHS and
 *     Cleveland Clinic, both as routine "see a GP" items
 */

/** Fever + a tampon or cup in place. The one combination that jumps to emergency. */
function tssPattern(s: SafetyAnswers): boolean {
  return Boolean(s.fever && s.usingInternalProduct);
}

/**
 * Free-text scanning.
 *
 * Deliberately tiny and deliberately one-directional: notes can *raise* a flag
 * and can never lower one. Someone typing "I fainted at work" should be heard
 * even though no checkbox was ticked; nobody typing "I feel fine" should be
 * able to talk the engine out of a flag their other answers raised.
 *
 * Kept to unambiguous phrases. A keyword matcher that tries to be clever about
 * negation ("didn't faint") gets it wrong often enough to be worse than not
 * running at all, so this only matches strings that are hard to misread, and
 * everything it raises is phrased as a question to the user rather than a
 * conclusion about them.
 */
const NOTE_PATTERNS: { re: RegExp; id: string; urgency: CareUrgency; observation: string }[] = [
  {
    re: /\b(fainted|passed out|blacked out|collapsed)\b/i,
    id: 'noteFainted',
    urgency: 'urgent',
    observation: 'You mentioned fainting or passing out.',
  },
  {
    re: /\b(chest pain|can'?t breathe|cannot breathe|struggling to breathe)\b/i,
    id: 'noteChest',
    urgency: 'emergency',
    observation: 'You mentioned chest pain or trouble breathing.',
  },
  {
    re: /\b(worst pain|unbearable|screaming|can'?t stand up|cannot stand up)\b/i,
    id: 'noteSeverePain',
    urgency: 'urgent',
    observation: 'You described pain that sounds much worse than usual.',
  },
];

const URGENCY_ORDER: CareUrgency[] = ['none', 'routine', 'urgent', 'emergency'];

function highest(a: CareUrgency, b: CareUrgency): CareUrgency {
  return URGENCY_ORDER.indexOf(a) >= URGENCY_ORDER.indexOf(b) ? a : b;
}

/**
 * Should the extra safety questions be asked at all?
 *
 * The check-in promises to take under twenty seconds, and asking everyone
 * about fainting every day would both break that promise and, worse, make the
 * questions ordinary enough to click through. So the safety step appears only
 * when something already suggests it is worth asking — which also means that
 * when it *does* appear, it carries weight.
 */
export function needsSafetyCheck(input: {
  pain: CheckIn['pain'];
  flow: CheckIn['flow'];
  symptoms: CareSymptom[];
}): boolean {
  return (
    input.pain === 'severe' ||
    FLOW_RANK[input.flow] >= FLOW_RANK.heavy ||
    input.symptoms.includes('migraine')
  );
}

/**
 * Triage a check-in.
 *
 * Pure. No dates, no randomness, no I/O — the same answers always produce the
 * same verdict, which is the only way this is reviewable.
 */
export function triage(checkIn: {
  pain: CheckIn['pain'];
  flow: CheckIn['flow'];
  symptoms: CareSymptom[];
  notes?: string;
  safety?: SafetyAnswers;
}): SafetyResult {
  const s = checkIn.safety ?? {};
  const flags: SafetyFlag[] = [];

  // ── Emergency ───────────────────────────────────────────────────────────

  if (tssPattern(s)) {
    flags.push({
      id: 'feverWithInternalProduct',
      urgency: 'emergency',
      observation:
        'You have a fever and are using a tampon or menstrual cup.',
      action:
        'Please remove it now and get medical help straight away — call your local emergency number or urgent care line, and tell them you were using one. This combination needs to be looked at urgently.',
      sources: ['nhsTss'],
    });
  }

  if (s.faintness && s.soakingHourly) {
    flags.push({
      id: 'faintWithHeavyBleeding',
      urgency: 'emergency',
      observation: 'You are bleeding very heavily and have felt faint.',
      action:
        'Please get medical help now rather than waiting. Heavy bleeding with faintness needs to be assessed the same day.',
      sources: ['nhsHeavyPeriods', 'mayoHeavyBleeding'],
    });
  }

  // ── Urgent ──────────────────────────────────────────────────────────────

  if (s.soakingHourly) {
    flags.push({
      id: 'soakingHourly',
      urgency: 'urgent',
      observation:
        'You are soaking through a pad or tampon every hour or two for several hours.',
      action:
        'Please contact your doctor today. That amount of bleeding is worth getting checked, and there are treatments that help.',
      sources: ['nhsHeavyPeriods', 'mayoHeavyBleeding', 'acogHeavyBleeding'],
    });
  }

  if (s.largeClots) {
    flags.push({
      id: 'largeClots',
      urgency: 'urgent',
      observation: 'You are passing clots larger than about 2.5cm.',
      action: 'Worth contacting your doctor today so someone can take a look.',
      sources: ['nhsHeavyPeriods', 'mayoHeavyBleeding'],
    });
  }

  if (checkIn.pain === 'severe' && s.painkillersNotHelping) {
    flags.push({
      id: 'severePainUnrelieved',
      urgency: 'urgent',
      observation: 'Your pain is severe and painkillers have not helped.',
      action:
        'The NHS advises contacting a GP or an urgent care line for this rather than waiting it out. Please do — period pain this severe deserves proper attention.',
      sources: ['nhsPeriodPain'],
    });
  }

  if (s.faintness) {
    flags.push({
      id: 'faintness',
      urgency: 'urgent',
      observation: 'You have felt faint or close to fainting.',
      action: 'Please speak to a doctor today about this.',
      sources: ['nhsHeavyPeriods'],
    });
  }

  if (s.breathless) {
    flags.push({
      id: 'breathless',
      urgency: 'urgent',
      observation: 'You are getting breathless doing ordinary things.',
      action:
        'Worth speaking to a doctor soon. Ongoing heavy periods can affect iron levels, and that is easy to test for.',
      sources: ['nhsIronAnaemia', 'nhsHeavyPeriods'],
    });
  }

  if (s.fever) {
    flags.push({
      id: 'fever',
      urgency: 'urgent',
      observation: 'You have a fever.',
      action:
        'A fever alongside your period is worth a same-day call to your doctor.',
      sources: ['nhsTss'],
    });
  }

  // ── Routine ─────────────────────────────────────────────────────────────

  if (checkIn.pain === 'severe' && !s.painkillersNotHelping) {
    flags.push({
      id: 'severePain',
      urgency: 'routine',
      observation: 'Your pain today is severe.',
      action:
        'If period pain is regularly this bad, or it stops you doing normal things, it is worth raising with a doctor. It is common, but it is not something you simply have to put up with.',
      sources: ['acogDysmenorrhea', 'clevelandDysmenorrhea', 'nhsPeriodPain'],
    });
  }

  if (checkIn.flow === 'veryHeavy' && !s.soakingHourly) {
    flags.push({
      id: 'veryHeavyFlow',
      urgency: 'routine',
      observation: 'Your flow is very heavy today.',
      action:
        'If this happens most cycles, mention it next time you see a doctor. Heavy periods are treatable and can affect iron levels over time.',
      sources: ['nhsHeavyPeriods', 'acogHeavyBleeding'],
    });
  }

  if (checkIn.symptoms.includes('migraine')) {
    flags.push({
      id: 'migraine',
      urgency: 'routine',
      observation: 'You logged a migraine.',
      action:
        'Migraines that track with your cycle are worth mentioning to a doctor — especially before starting or changing hormonal contraception.',
      sources: ['acogDysmenorrhea'],
    });
  }

  // ── Notes ───────────────────────────────────────────────────────────────

  const notes = checkIn.notes ?? '';
  for (const p of NOTE_PATTERNS) {
    if (p.re.test(notes)) {
      flags.push({
        id: p.id,
        urgency: p.urgency,
        observation: p.observation,
        action:
          p.urgency === 'emergency'
            ? 'Please get medical help straight away.'
            : 'Please speak to a doctor about this today.',
        sources: ['nhsPeriodPain'],
      });
    }
  }

  // ── Verdict ─────────────────────────────────────────────────────────────

  const urgency = flags.reduce<CareUrgency>((acc, f) => highest(acc, f.urgency), 'none');

  // Sorted most-serious first, and de-duplicated by id so a doubled rule can
  // never produce the same paragraph twice.
  const seen = new Set<string>();
  const ordered = flags
    .filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)))
    .sort((a, b) => URGENCY_ORDER.indexOf(b.urgency) - URGENCY_ORDER.indexOf(a.urgency));

  return {
    urgency,
    flags: ordered,
    // The structural rule: at emergency there is no plan to demote.
    suppressPlan: urgency === 'emergency',
    headline: HEADLINE[urgency],
  };
}

/**
 * The one sentence at the top.
 *
 * `none` is empty rather than reassuring. Bloomly asked about eight things; a
 * body can do considerably more than eight, and "everything looks fine" is a
 * claim this app has no standing to make.
 */
const HEADLINE: Record<CareUrgency, string> = {
  none: '',
  routine: 'One thing worth mentioning to a doctor when you next see one.',
  urgent: 'Please contact a doctor today.',
  emergency: 'Please get medical help now.',
};
