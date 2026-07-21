import { addDays } from 'date-fns';
import { PeriodEntry, Symptom } from '../types';
import {
  getOvulationDay,
  getCyclePhase,
  getCycleDayForDate,
  getFertilityWindow,
  buildCycleLengths,
  deriveCycleContext,
  calculateAverageCycleLength,
  calculateCycleVariability,
  detectIrregularity,
  getPredictedNextPeriod,
  mergeSymptoms,
} from './cycleCalculations';

/** Minimal period entry; only startDate/endDate drive the math under test. */
function entry(start: Date, end: Date | null = null): PeriodEntry {
  return {
    id: Math.random().toString(36),
    userId: 'u',
    startDate: start,
    endDate: end,
    flowIntensity: 'medium',
    symptoms: [],
    mood: null,
    notes: '',
    createdAt: start,
    updatedAt: start,
  };
}

describe('getOvulationDay (fixed ~14-day luteal model)', () => {
  it('is day 14 for a standard 28-day cycle', () => {
    expect(getOvulationDay(28)).toBe(14);
  });
  it('scales with cycle length', () => {
    expect(getOvulationDay(35)).toBe(21);
    expect(getOvulationDay(21)).toBe(7);
  });
});

describe('getCyclePhase scaling', () => {
  it('maps the classic phases for a 28-day cycle', () => {
    expect(getCyclePhase(1, 28, 5)?.name).toBe('menstrual');
    expect(getCyclePhase(10, 28, 5)?.name).toBe('follicular');
    expect(getCyclePhase(14, 28, 5)?.name).toBe('ovulation');
    expect(getCyclePhase(22, 28, 5)?.name).toBe('luteal');
  });

  it('does not collapse a long (35-day) cycle back to menstrual', () => {
    // Regression: days past 28 used to return null and fall back to "menstrual".
    expect(getCyclePhase(30, 35, 5)?.name).toBe('luteal');
    expect(getCyclePhase(21, 35, 5)?.name).toBe('ovulation');
  });

  it('handles a short (21-day) cycle without mislabeling the luteal tail', () => {
    expect(getCyclePhase(3, 21, 5)?.name).toBe('menstrual');
    expect(getCyclePhase(7, 21, 5)?.name).toBe('ovulation');
    expect(getCyclePhase(20, 21, 5)?.name).toBe('luteal');
  });

  it('returns null outside the cycle range', () => {
    expect(getCyclePhase(0, 28, 5)).toBeNull();
    expect(getCyclePhase(29, 28, 5)).toBeNull();
  });
});

describe('getCycleDayForDate (positive modulo)', () => {
  const start = new Date(2026, 0, 15); // Jan 15, 2026

  it('is day 1 on the start date', () => {
    expect(getCycleDayForDate(start, start, 28)).toBe(1);
  });

  it('wraps to day 1 exactly one cycle later', () => {
    expect(getCycleDayForDate(addDays(start, 28), start, 28)).toBe(1);
  });

  it('returns a positive day for dates before the reference start', () => {
    // Regression: negative JS modulo made past-month calendar cells blank.
    expect(getCycleDayForDate(addDays(start, -5), start, 28)).toBe(24);
    expect(getCycleDayForDate(addDays(start, -1), start, 28)).toBe(28);
  });
});

describe('getFertilityWindow', () => {
  it('brackets ovulation consistently with getOvulationDay', () => {
    const start = new Date(2026, 0, 1);
    const w = getFertilityWindow(start, 35);
    const ov = getOvulationDay(35); // 21
    expect(w.start.getTime()).toBe(addDays(start, ov - 5).getTime());
    expect(w.end.getTime()).toBe(addDays(start, ov + 1).getTime());
  });
});

describe('buildCycleLengths (gap between starts, not duration)', () => {
  it('measures the gap between consecutive period starts', () => {
    const s = new Date(2026, 0, 1);
    const entries = [
      entry(s, addDays(s, 5)), // a 5-day-long period...
      entry(addDays(s, 28), addDays(s, 33)),
      entry(addDays(s, 56), addDays(s, 61)),
    ];
    // ...must yield ~28-day cycles, never ~5.
    expect(buildCycleLengths(entries)).toEqual([28, 28]);
  });

  it('sorts unordered entries before measuring', () => {
    const s = new Date(2026, 0, 1);
    const entries = [entry(addDays(s, 30)), entry(s)];
    expect(buildCycleLengths(entries)).toEqual([30]);
  });

  it('filters out implausible gaps (tracking breaks / double logs)', () => {
    const s = new Date(2026, 0, 1);
    const entries = [entry(s), entry(addDays(s, 3)), entry(addDays(s, 3 + 200))];
    // 3-day and 200-day gaps are both dropped.
    expect(buildCycleLengths(entries)).toEqual([]);
  });

  it('returns [] for fewer than two entries', () => {
    expect(buildCycleLengths([entry(new Date(2026, 0, 1))])).toEqual([]);
    expect(buildCycleLengths([])).toEqual([]);
  });
});

describe('deriveCycleContext', () => {
  const user = { lastPeriodStart: new Date(2025, 0, 1), cycleLength: 30, periodLength: 4 };

  it('falls back to onboarding values when nothing is logged', () => {
    const ctx = deriveCycleContext(user, []);
    expect(ctx.lastPeriodStart).toBe(user.lastPeriodStart);
    expect(ctx.cycleLength).toBe(30);
    expect(ctx.periodLength).toBe(4);
  });

  it('uses the most recent logged start and the average measured gap', () => {
    const s = new Date(2026, 2, 1);
    const entries = [entry(s), entry(addDays(s, 26)), entry(addDays(s, 54))]; // gaps 26, 28
    const ctx = deriveCycleContext(user, entries);
    expect(ctx.lastPeriodStart.getTime()).toBe(addDays(s, 54).getTime());
    expect(ctx.cycleLength).toBe(27); // round((26 + 28) / 2)
  });

  it('keeps the logged start but falls back on length with a single entry', () => {
    const s = new Date(2026, 2, 1);
    const ctx = deriveCycleContext(user, [entry(s)]);
    expect(ctx.lastPeriodStart.getTime()).toBe(s.getTime());
    expect(ctx.cycleLength).toBe(30); // no gap to measure → onboarding value
  });
});

describe('statistics helpers', () => {
  it('averages and rounds cycle lengths', () => {
    expect(calculateAverageCycleLength([27, 28, 29])).toBe(28);
    expect(calculateAverageCycleLength([])).toBe(28);
  });

  it('computes variability and flags irregular cycles', () => {
    expect(calculateCycleVariability([28, 28, 28])).toBe(0);
    expect(detectIrregularity([28, 28, 28])).toBe(false);
    expect(detectIrregularity([21, 35, 24, 40])).toBe(true);
    expect(detectIrregularity([28, 30])).toBe(false); // needs 3+ cycles
  });

  it('predicts the next period one cycle out', () => {
    const s = new Date(2026, 0, 1);
    expect(getPredictedNextPeriod(s, 30).getTime()).toBe(addDays(s, 30).getTime());
  });
});

describe('mergeSymptoms', () => {
  const sym = (type: string, severity: number): Symptom =>
    ({ id: `${type}-${severity}`, type, severity, timestamp: new Date() }) as Symptom;

  it('does not duplicate a symptom logged twice in one day', () => {
    // The bug this fixes: re-logging cramps stored cramps twice, which inflated
    // every frequency stat built on top of symptomLogs.
    const out = mergeSymptoms([sym('cramps', 2)], [sym('cramps', 4)]);
    expect(out).toHaveLength(1);
  });

  it('treats a re-log as a correction — newest severity wins', () => {
    const out = mergeSymptoms([sym('cramps', 2)], [sym('cramps', 4)]);
    expect(out[0].severity).toBe(4);
  });

  it('keeps symptoms of different types', () => {
    const out = mergeSymptoms([sym('cramps', 2)], [sym('headache', 3)]);
    expect(out.map((s) => s.type).sort()).toEqual(['cramps', 'headache']);
  });

  it('handles empty sides', () => {
    expect(mergeSymptoms([], [])).toEqual([]);
    expect(mergeSymptoms([], [sym('acne', 1)])).toHaveLength(1);
    expect(mergeSymptoms([sym('acne', 1)], [])).toHaveLength(1);
  });

  it('never grows beyond the number of distinct types', () => {
    const existing = [sym('cramps', 1), sym('acne', 2)];
    const incoming = [sym('cramps', 5), sym('acne', 5), sym('nausea', 3)];
    // Repeated merging must stay stable, not accumulate.
    let out = mergeSymptoms(existing, incoming);
    for (let i = 0; i < 10; i++) out = mergeSymptoms(out, incoming);
    expect(out).toHaveLength(3);
  });
});
