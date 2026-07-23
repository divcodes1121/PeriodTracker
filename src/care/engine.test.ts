import { buildCarePlan, difficultyCeiling, notesLowerIntensity, pickExercises } from './engine';
import { EXERCISES } from './exercises';
import { DRINKS, FOODS, SELF_CARE } from './nutrition';
import { SOURCES } from './evidence';
import { JOINTS, POSES } from './poses';
import {
  CareMood,
  CareSymptom,
  CheckIn,
  EnergyLevel,
  FlowLevel,
  PainLevel,
  SleepQuality,
} from './types';

const PAINS: PainLevel[] = ['none', 'mild', 'moderate', 'severe'];
const ENERGIES: EnergyLevel[] = ['veryHigh', 'high', 'normal', 'low', 'veryLow'];
const FLOWS: FlowLevel[] = ['spotting', 'light', 'medium', 'heavy', 'veryHeavy'];
const SLEEPS: SleepQuality[] = ['excellent', 'good', 'okay', 'poor', 'veryPoor'];

const checkIn = (over: Partial<CheckIn> = {}): CheckIn => ({
  id: 'c1',
  userId: 'u1',
  date: new Date('2026-07-23T09:00:00Z'),
  pain: 'mild',
  moods: [],
  symptoms: [],
  energy: 'normal',
  flow: 'medium',
  sleep: 'good',
  notes: '',
  createdAt: new Date('2026-07-23T09:00:00Z'),
  ...over,
});

const RANK = { restful: 0, gentle: 1, moderate: 2 } as const;

// ═══════════════════════════════════════════════════════════════════════════
// The rule that matters most
// ═══════════════════════════════════════════════════════════════════════════

describe('intensity never escalates into pain', () => {
  it('offers NOTHING above restful when pain is severe — across every other input', () => {
    // Brute force rather than a spot check. This is the rule most likely to be
    // broken by a well-meaning later edit ("surely a gentle stretch is fine?"),
    // and being handed a workout while in severe pain is the app not listening.
    for (const energy of ENERGIES) {
      for (const flow of FLOWS) {
        for (const sleep of SLEEPS) {
          const picked = pickExercises({
            pain: 'severe',
            energy,
            flow,
            sleep,
            symptoms: [],
            moods: [],
          });
          expect(picked.length).toBeGreaterThan(0);
          for (const e of picked) {
            expect(e.difficulty).toBe('restful');
          }
        }
      }
    }
  });

  it('lowers the ceiling as pain rises and never the other way', () => {
    let last = 3;
    for (const pain of PAINS) {
      const c = difficultyCeiling({ pain, energy: 'normal', sleep: 'good', flow: 'light' });
      expect(RANK[c]).toBeLessThanOrEqual(last);
      last = RANK[c];
    }
  });

  it('drops to restful on very low energy or very heavy flow', () => {
    expect(difficultyCeiling({ pain: 'none', energy: 'veryLow', sleep: 'good', flow: 'light' })).toBe('restful');
    expect(difficultyCeiling({ pain: 'none', energy: 'high', sleep: 'good', flow: 'veryHeavy' })).toBe('restful');
  });

  it('always includes at least one option that requires nothing', () => {
    // There must always be a version of today's plan that is "lie down".
    for (const pain of PAINS) {
      for (const energy of ENERGIES) {
        const picked = pickExercises({ pain, energy, flow: 'medium', sleep: 'good', symptoms: [], moods: [] });
        expect(picked.some((e) => e.difficulty === 'restful')).toBe(true);
      }
    }
  });

  it('never returns an empty movement list, whatever the combination', () => {
    for (const pain of PAINS) {
      for (const flow of FLOWS) {
        for (const symptoms of [[], ['migraine'], ['headache', 'nausea'], ['cramps', 'backPain']] as CareSymptom[][]) {
          expect(
            pickExercises({ pain, flow, energy: 'normal', sleep: 'good', symptoms, moods: [] }).length
          ).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('symptom-aware exclusions', () => {
  it('keeps head-below-heart poses away from a migraine or headache', () => {
    for (const s of [['migraine'], ['headache']] as CareSymptom[][]) {
      const picked = pickExercises({
        pain: 'mild',
        energy: 'normal',
        flow: 'light',
        sleep: 'good',
        symptoms: s,
        moods: [],
      });
      expect(picked.map((e) => e.id)).not.toContain('standing-fold');
      expect(picked.map((e) => e.id)).not.toContain('legs-up');
    }
  });

  it('prioritises breath work when the day is anxious or overwhelmed', () => {
    for (const mood of ['anxious', 'overwhelmed', 'stressed'] as CareMood[]) {
      const picked = pickExercises({
        pain: 'mild',
        energy: 'normal',
        flow: 'light',
        sleep: 'good',
        symptoms: [],
        moods: [mood],
      });
      expect(picked.some((e) => /breath/i.test(e.id))).toBe(true);
    }
  });

  it('surfaces back-focused movement for back pain', () => {
    const picked = pickExercises({
      pain: 'mild',
      energy: 'normal',
      flow: 'light',
      sleep: 'good',
      symptoms: ['backPain'],
      moods: [],
    });
    expect(picked.some((e) => e.helps.includes('backPain'))).toBe(true);
  });
});

describe('free-text notes', () => {
  it('makes the day gentler but never harder', () => {
    expect(notesLowerIntensity('I have exams all week')).toBe(true);
    expect(notesLowerIntensity('long shift today')).toBe(true);
    expect(notesLowerIntensity('travelling tomorrow')).toBe(true);
    expect(notesLowerIntensity('feeling great, really energetic')).toBe(false);
    expect(notesLowerIntensity('')).toBe(false);
    expect(notesLowerIntensity(undefined)).toBe(false);
  });

  it('cannot raise the ceiling above what the answers allow', () => {
    const withNote = pickExercises({
      pain: 'severe',
      energy: 'normal',
      flow: 'light',
      sleep: 'good',
      symptoms: [],
      moods: [],
      notes: 'feeling amazing, ready for anything',
    });
    for (const e of withNote) expect(e.difficulty).toBe('restful');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Safety integration
// ═══════════════════════════════════════════════════════════════════════════

describe('safety outranks wellness', () => {
  it('suppresses the ENTIRE plan at emergency — not just reorders it', () => {
    // Offering a hip stretch beside a possible emergency competes for attention
    // with the only thing that matters.
    const plan = buildCarePlan(
      checkIn({ safety: { fever: true, usingInternalProduct: true } })
    );
    expect(plan.safety.urgency).toBe('emergency');
    expect(plan.sections).toHaveLength(0);
    expect(plan.exercises).toHaveLength(0);
    expect(plan.encouragement).toBe('');
    expect(plan.focus).toBe('');
  });

  it('still shows the plan at urgent, with the notice above it', () => {
    const plan = buildCarePlan(checkIn({ safety: { largeClots: true } }));
    expect(plan.safety.urgency).toBe('urgent');
    expect(plan.sections.length).toBeGreaterThan(0);
    expect(plan.safety.headline).toMatch(/contact a doctor today/i);
  });

  it('still shows the plan at routine', () => {
    const plan = buildCarePlan(checkIn({ pain: 'severe' }));
    expect(plan.safety.urgency).toBe('routine');
    expect(plan.sections.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Plan shape and voice
// ═══════════════════════════════════════════════════════════════════════════

describe('the plan', () => {
  it('is deterministic — the same check-in always yields the same plan', () => {
    // A plan that changes when you reopen it is one you cannot trust, or
    // discuss with a doctor.
    const c = checkIn({ pain: 'moderate', symptoms: ['cramps', 'fatigue'], moods: ['low'] });
    expect(buildCarePlan(c)).toEqual(buildCarePlan(c));
  });

  it('fills every section for every plausible day', () => {
    for (const pain of PAINS) {
      for (const symptoms of [[], ['cramps'], ['fatigue', 'bloating'], ['none']] as CareSymptom[][]) {
        const plan = buildCarePlan(checkIn({ pain, symptoms }));
        expect(plan.sections).toHaveLength(4);
        for (const s of plan.sections) {
          expect(s.items.length).toBeGreaterThan(0);
          expect(s.lead.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps every section short enough to read', () => {
    // A wellness plan with eighteen suggestions is a to-do list, and a to-do
    // list is the opposite of care.
    const plan = buildCarePlan(
      checkIn({ symptoms: ['cramps', 'backPain', 'fatigue', 'bloating', 'nausea', 'headache'] })
    );
    for (const s of plan.sections) expect(s.items.length).toBeLessThanOrEqual(4);
  });

  it('gives every suggestion a reason', () => {
    // A suggestion without a why is an instruction.
    const plan = buildCarePlan(checkIn({ symptoms: ['cramps', 'fatigue'] }));
    for (const s of plan.sections) {
      for (const item of s.items) {
        expect(item.why.length).toBeGreaterThan(20);
        expect(item.sources.length).toBeGreaterThan(0);
      }
    }
  });

  it('always says one thing to do, and one warm thing', () => {
    for (const pain of PAINS) {
      const plan = buildCarePlan(checkIn({ pain }));
      expect(plan.focus.length).toBeGreaterThan(0);
      expect(plan.encouragement.length).toBeGreaterThan(0);
    }
  });

  it('never uses toxic-positivity or guilt language', () => {
    // Two failure modes, both worse than saying nothing: talking over someone
    // in pain, and implying they have underperformed.
    const banned =
      /\b(amazing|magical|blessing|superpower|beautiful thing|embrace the|should be|need to|you must|no excuses|push through|beast mode|glow)\b/i;
    for (const pain of PAINS) {
      for (const energy of ENERGIES) {
        for (const moods of [[], ['low'], ['anxious'], ['irritable'], ['overwhelmed'], ['happy']] as CareMood[][]) {
          for (const sleep of SLEEPS) {
            const plan = buildCarePlan(checkIn({ pain, energy, moods, sleep }));
            expect(plan.encouragement).not.toMatch(banned);
            expect(plan.focus).not.toMatch(banned);
          }
        }
      }
    }
  });

  it('leads with heat when pain is severe', () => {
    // Heat is the best-supported non-drug option in the whole feature, so it
    // should be the headline on the day it matters most.
    expect(buildCarePlan(checkIn({ pain: 'severe' })).focus).toMatch(/heat/i);
  });

  it('leads with iron when the flow is heavy and energy is gone', () => {
    const plan = buildCarePlan(
      checkIn({ flow: 'heavy', symptoms: ['fatigue'], energy: 'low' })
    );
    expect(plan.focus).toMatch(/iron/i);
    const eat = plan.sections.find((s) => s.id === 'eat')!;
    expect(eat.items.map((i) => i.id)).toContain('iron');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Content integrity — the library itself
// ═══════════════════════════════════════════════════════════════════════════

describe('the exercise library', () => {
  it('ships at least 30 exercises', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(30);
  });

  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names at least one situation to avoid each one', () => {
    // An empty avoidIf is a bug: every movement has some wrong moment, and a
    // library that cannot name one has not thought about it.
    for (const e of EXERCISES) {
      expect(e.avoidIf.length).toBeGreaterThan(0);
      expect(e.safety.length).toBeGreaterThan(0);
    }
  });

  it('cites a real source for every exercise', () => {
    for (const e of EXERCISES) {
      expect(e.sources.length).toBeGreaterThan(0);
      for (const id of e.sources) expect(SOURCES[id]).toBeDefined();
    }
  });

  it('gives every exercise steps, benefits and breathing guidance', () => {
    for (const e of EXERCISES) {
      expect(e.steps.length).toBeGreaterThanOrEqual(3);
      expect(e.benefits.length).toBeGreaterThan(0);
      expect(e.breathing.length).toBeGreaterThan(10);
      expect(e.seconds).toBeGreaterThan(0);
    }
  });

  it('gives every exercise a loopable animation with complete poses', () => {
    for (const e of EXERCISES) {
      expect(e.frames.length).toBeGreaterThanOrEqual(2);
      for (const f of e.frames) {
        expect(f.ms).toBeGreaterThan(0);
        for (const j of JOINTS) {
          expect(Array.isArray(f.pose[j])).toBe(true);
          const [x, y] = f.pose[j];
          // Inside the 0–100 authoring box, with a little tolerance.
          expect(x).toBeGreaterThanOrEqual(-5);
          expect(x).toBeLessThanOrEqual(105);
          expect(y).toBeGreaterThanOrEqual(-5);
          expect(y).toBeLessThanOrEqual(105);
        }
      }
    }
  });

  it('never claims to cure or treat anything', () => {
    const banned = /\b(cures?|treats?|heals?|eliminates?|fixes|prevents|guarantee)\b/i;
    for (const e of EXERCISES) {
      for (const b of e.benefits) expect(b).not.toMatch(banned);
      expect(e.description).not.toMatch(banned);
    }
  });

  it('has every pose in the shared vocabulary fully specified', () => {
    for (const [name, pose] of Object.entries(POSES)) {
      for (const j of JOINTS) {
        expect(pose[j]).toBeDefined();
        expect(typeof pose[j][0]).toBe('number');
        expect(Number.isFinite(pose[j][1])).toBe(true);
      }
      expect(name.length).toBeGreaterThan(0);
    }
  });
});

describe('the nutrition and self-care data', () => {
  const all = [...FOODS, ...DRINKS, ...SELF_CARE];

  it('cites a real source for every item', () => {
    for (const i of all) {
      expect(i.sources.length).toBeGreaterThan(0);
      for (const id of i.sources) expect(SOURCES[id]).toBeDefined();
    }
  });

  it('explains why for every item', () => {
    for (const i of all) expect(i.why.length).toBeGreaterThan(30);
  });

  it('never names a dose or recommends a supplement', () => {
    // The Cochrane review found no high-quality evidence for any dietary
    // supplement in dysmenorrhoea. Bloomly suggests food, not milligrams.
    const dose = /\b\d+\s?(mg|mcg|g|iu|grams?|milligrams?)\b|\btake a supplement\b|\bsupplement daily\b/i;
    for (const i of all) {
      expect(`${i.title} ${i.why}`).not.toMatch(dose);
    }
  });

  it('never tells anyone to cut a food out', () => {
    // Used by people at every relationship with food, on days they feel bad
    // about their bodies. "Avoid sugar" is not worth the risk.
    const restrictive = /\b(avoid|cut out|cut down on|eliminate|stop eating|don'?t eat|banned|forbidden)\b/i;
    for (const i of [...FOODS, ...DRINKS]) {
      expect(`${i.title} ${i.why}`).not.toMatch(restrictive);
    }
  });

  it('marks the well-supported items as such and the rest honestly', () => {
    const heat = SELF_CARE.find((i) => i.id === 'heat')!;
    expect(heat.strength).toBe('good');
    const magnesium = FOODS.find((i) => i.id === 'magnesium')!;
    expect(magnesium.strength).toBe('limited');
  });

  it('has unique ids within each list', () => {
    for (const list of [FOODS, DRINKS, SELF_CARE]) {
      const ids = list.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
