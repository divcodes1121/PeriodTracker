import { needsSafetyCheck, triage } from './safety';
import { SOURCES } from './evidence';
import { CareSymptom, FlowLevel, PainLevel, SafetyAnswers } from './types';

/**
 * These are the most important tests in the app.
 *
 * Everything else in Bloomly can be wrong in a way that is merely
 * disappointing. This module can be wrong in a way that tells someone their
 * symptoms are fine to manage with ginger tea. The tests below are written as
 * *scenarios* rather than unit assertions, because the thing being verified is
 * a judgement, and a judgement is only reviewable if you can read the story it
 * came from.
 */

const base = (over: Partial<Parameters<typeof triage>[0]> = {}) => ({
  pain: 'mild' as PainLevel,
  flow: 'medium' as FlowLevel,
  symptoms: [] as CareSymptom[],
  notes: '',
  ...over,
});

describe('the boundaries the module must hold', () => {
  it('never names a condition, in any flag, for any input', () => {
    // Bloomly reflects observations and names actions. Naming a condition is
    // both a diagnosis it cannot make and a good way to frighten someone into
    // ignoring the advice entirely.
    // Two things are banned: naming a condition, and the speculative
    // constructions that name one implicitly.
    //
    // Note what is *not* banned: a bare "you have". "You have felt faint" is
    // Bloomly repeating what it was just told, which is exactly the register
    // this module is supposed to speak in. The first draft of this pattern
    // flagged it, which would have pushed the copy into passive contortions to
    // satisfy a test — the tail wagging the dog.
    const forbidden =
      /\b(endometriosis|fibroid|anaemia|anemia|toxic shock|PCOS|cancer|adenomyosis|an infection)\b|\b(you (may|might|probably|likely) have|this (could|might) be|sounds like you have|diagnos)/i;

    const answers: SafetyAnswers[] = [
      { soakingHourly: true, largeClots: true, faintness: true, breathless: true },
      { fever: true, usingInternalProduct: true },
      { painkillersNotHelping: true },
    ];
    for (const safety of answers) {
      for (const pain of ['none', 'mild', 'moderate', 'severe'] as PainLevel[]) {
        const r = triage(base({ pain, flow: 'veryHeavy', symptoms: ['migraine'], safety }));
        for (const f of r.flags) {
          expect(`${f.observation} ${f.action}`).not.toMatch(forbidden);
        }
        expect(r.headline).not.toMatch(forbidden);
      }
    }
  });

  it('never reassures — a clean check-in produces silence, not comfort', () => {
    // "Everything looks fine" is a claim this app has no standing to make: it
    // asked about eight things and a body does considerably more than eight.
    const r = triage(base({ pain: 'none', flow: 'light' }));
    expect(r.urgency).toBe('none');
    expect(r.flags).toHaveLength(0);
    expect(r.headline).toBe('');
    expect(r.suppressPlan).toBe(false);
  });

  it('cites a real source on every flag it raises', () => {
    const r = triage(
      base({
        pain: 'severe',
        flow: 'veryHeavy',
        symptoms: ['migraine'],
        safety: { soakingHourly: true, largeClots: true, painkillersNotHelping: true, fever: true },
      })
    );
    expect(r.flags.length).toBeGreaterThan(0);
    for (const f of r.flags) {
      expect(f.sources.length).toBeGreaterThan(0);
      for (const id of f.sources) expect(SOURCES[id]).toBeDefined();
    }
  });

  it('always pairs an observation with an action', () => {
    // A flag that describes something worrying without saying what to do is
    // just anxiety with a citation.
    const r = triage(base({ pain: 'severe', safety: { faintness: true, breathless: true } }));
    for (const f of r.flags) {
      expect(f.observation.length).toBeGreaterThan(10);
      expect(f.action.length).toBeGreaterThan(10);
    }
  });

  it('is deterministic', () => {
    const input = base({ pain: 'severe', flow: 'heavy', safety: { largeClots: true } });
    expect(triage(input)).toEqual(triage(input));
  });
});

describe('emergency — the plan is suppressed, not softened', () => {
  it('fever while using a tampon or cup', () => {
    // NHS toxic shock guidance is explicit: remove it and get urgent help.
    const r = triage(base({ safety: { fever: true, usingInternalProduct: true } }));
    expect(r.urgency).toBe('emergency');
    expect(r.suppressPlan).toBe(true);
    expect(r.flags[0].id).toBe('feverWithInternalProduct');
    expect(r.flags[0].action).toMatch(/remove it/i);
  });

  it('does NOT escalate a fever on its own to emergency', () => {
    // Over-sensitivity is the right default, but "fever" alone is common and
    // escalating it to emergency would train users to dismiss the emergency
    // state entirely — which is how a red flag stops working.
    const r = triage(base({ safety: { fever: true } }));
    expect(r.urgency).toBe('urgent');
    expect(r.suppressPlan).toBe(false);
  });

  it('faintness together with very heavy bleeding', () => {
    const r = triage(base({ safety: { faintness: true, soakingHourly: true } }));
    expect(r.urgency).toBe('emergency');
    expect(r.suppressPlan).toBe(true);
  });

  it('chest pain or trouble breathing mentioned in the notes', () => {
    const r = triage(base({ notes: 'bad cramps and I cannot breathe properly' }));
    expect(r.urgency).toBe('emergency');
  });
});

describe('urgent — contact someone today', () => {
  it.each<[string, SafetyAnswers, PainLevel]>([
    ['soaking hourly', { soakingHourly: true }, 'mild'],
    ['clots over 2.5cm', { largeClots: true }, 'mild'],
    ['severe pain painkillers have not touched', { painkillersNotHelping: true }, 'severe'],
    ['faintness', { faintness: true }, 'mild'],
    ['breathlessness', { breathless: true }, 'mild'],
  ])('%s', (_label, safety, pain) => {
    const r = triage(base({ pain, safety }));
    expect(r.urgency).toBe('urgent');
    expect(r.suppressPlan).toBe(false);
    expect(r.headline).toBe('Please contact a doctor today.');
  });

  it('does not fire "painkillers not helping" unless the pain is actually severe', () => {
    // The NHS urgent threshold is severe pain that painkillers have not helped.
    // Mild pain plus an unhelpful paracetamol is a Tuesday.
    const r = triage(base({ pain: 'mild', safety: { painkillersNotHelping: true } }));
    expect(r.flags.find((f) => f.id === 'severePainUnrelieved')).toBeUndefined();
  });
});

describe('routine — worth mentioning, plan still shows', () => {
  it('severe pain that painkillers are handling', () => {
    const r = triage(base({ pain: 'severe' }));
    expect(r.urgency).toBe('routine');
    expect(r.suppressPlan).toBe(false);
    expect(r.flags[0].action).toMatch(/not something you simply have to put up with/i);
  });

  it('very heavy flow that is not soaking hourly', () => {
    const r = triage(base({ flow: 'veryHeavy' }));
    expect(r.urgency).toBe('routine');
  });

  it('a migraine, because it matters for contraception decisions', () => {
    const r = triage(base({ symptoms: ['migraine'] }));
    expect(r.urgency).toBe('routine');
    expect(r.flags[0].action).toMatch(/contraception/i);
  });
});

describe('escalation and de-duplication', () => {
  it('reports the highest urgency present, not the most recent', () => {
    const r = triage(
      base({
        pain: 'severe',
        flow: 'veryHeavy',
        symptoms: ['migraine'],
        safety: { fever: true, usingInternalProduct: true, largeClots: true },
      })
    );
    expect(r.urgency).toBe('emergency');
  });

  it('orders flags most serious first', () => {
    const r = triage(
      base({
        pain: 'severe',
        symptoms: ['migraine'],
        safety: { soakingHourly: true, painkillersNotHelping: true },
      })
    );
    const rank = { none: 0, routine: 1, urgent: 2, emergency: 3 } as const;
    for (let i = 1; i < r.flags.length; i++) {
      expect(rank[r.flags[i - 1].urgency]).toBeGreaterThanOrEqual(rank[r.flags[i].urgency]);
    }
  });

  it('never shows the same flag twice', () => {
    const r = triage(
      base({ pain: 'severe', flow: 'veryHeavy', safety: { soakingHourly: true, faintness: true } })
    );
    const ids = r.flags.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not double-report severe pain as both routine and urgent', () => {
    // The routine rule is guarded on the urgent one being absent. Without that
    // guard the user reads two paragraphs about the same pain, which makes the
    // urgent one feel like boilerplate.
    const r = triage(base({ pain: 'severe', safety: { painkillersNotHelping: true } }));
    expect(r.flags.filter((f) => f.id.startsWith('severePain'))).toHaveLength(1);
  });
});

describe('free-text notes', () => {
  it('hears things no checkbox asked about', () => {
    const r = triage(base({ notes: 'I fainted at work this morning' }));
    expect(r.urgency).toBe('urgent');
  });

  it('can raise a flag but can never lower one', () => {
    // Nobody typing "I feel fine" should be able to talk the engine out of a
    // flag their other answers raised.
    const withNote = triage(base({ pain: 'severe', notes: 'honestly I feel fine today' }));
    const without = triage(base({ pain: 'severe', notes: '' }));
    expect(withNote.urgency).toBe(without.urgency);
    expect(withNote.flags.length).toBeGreaterThanOrEqual(without.flags.length);
  });

  it('ignores empty and missing notes without throwing', () => {
    expect(() => triage(base({ notes: undefined }))).not.toThrow();
    expect(triage(base({ notes: '   ' })).urgency).toBe('none');
  });
});

describe('needsSafetyCheck — when the extra questions appear', () => {
  it('stays out of the way on an ordinary day', () => {
    // The check-in promises under twenty seconds. Asking everyone about
    // fainting daily would break that AND make the questions ordinary enough
    // to click through without reading.
    expect(needsSafetyCheck({ pain: 'mild', flow: 'medium', symptoms: ['cramps'] })).toBe(false);
    expect(needsSafetyCheck({ pain: 'none', flow: 'spotting', symptoms: [] })).toBe(false);
  });

  it('appears when something already suggests it is worth asking', () => {
    expect(needsSafetyCheck({ pain: 'severe', flow: 'light', symptoms: [] })).toBe(true);
    expect(needsSafetyCheck({ pain: 'mild', flow: 'heavy', symptoms: [] })).toBe(true);
    expect(needsSafetyCheck({ pain: 'mild', flow: 'veryHeavy', symptoms: [] })).toBe(true);
    expect(needsSafetyCheck({ pain: 'mild', flow: 'light', symptoms: ['migraine'] })).toBe(true);
  });
});
