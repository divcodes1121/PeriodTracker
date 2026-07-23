import {
  GARDEN_STAGES,
  MAX_PLANTS,
  countGardenLogs,
  gardenFor,
  stageForLogs,
  stageProgress,
} from './garden';

/**
 * The garden is a retention mechanic attached to a health app, which makes its
 * failure modes emotional rather than merely visual. These tests pin the
 * promises that matter:
 *
 *   • it never goes backwards (no punishment for a bad month)
 *   • the *first* log visibly changes something (or nobody learns the loop)
 *   • it stays a garden, not a hedge (a cap on plants)
 *   • a bad day with six symptoms does not out-grow a quiet day
 */

describe('stages', () => {
  it('starts empty and names every stage warmly', () => {
    expect(stageForLogs(0).index).toBe(0);
    for (const s of GARDEN_STAGES) {
      expect(s.label.length).toBeGreaterThan(0);
      // No stage may be a score. "Level 3" and "12/20" are exactly the framing
      // this mechanic exists to avoid.
      expect(s.label).not.toMatch(/\d/);
    }
  });

  it('advances on the very first log', () => {
    // If log #1 does not move the garden, the mechanic never teaches itself.
    expect(stageForLogs(1).index).toBeGreaterThan(stageForLogs(0).index);
  });

  it('never goes backwards as logs accumulate', () => {
    let last = -1;
    for (let n = 0; n <= 200; n++) {
      const idx = stageForLogs(n).index;
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });

  it('has no decay path — a missed month cannot shrink anything', () => {
    // There is deliberately no time input to any of these functions. This test
    // documents that: if someone adds a `daysSinceLastLog` parameter to make
    // the garden wilt, they have to delete this test to do it.
    expect(stageForLogs.length).toBe(1);
    expect(gardenFor.length).toBeLessThanOrEqual(2);
  });

  it('clamps and floors nonsense input rather than throwing', () => {
    expect(stageForLogs(-5).index).toBe(0);
    expect(stageForLogs(3.7).index).toBe(stageForLogs(3).index);
    expect(gardenFor(-1)).toEqual([]);
  });

  it('tops out at the final stage', () => {
    const last = GARDEN_STAGES[GARDEN_STAGES.length - 1];
    expect(stageForLogs(10_000).index).toBe(last.index);
    expect(stageProgress(10_000)).toBe(1);
  });
});

describe('stageProgress', () => {
  it('runs 0..1 within a stage', () => {
    for (let n = 0; n <= 60; n++) {
      const p = stageProgress(n);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('is 0 exactly at a stage boundary', () => {
    for (const s of GARDEN_STAGES.slice(0, -1)) {
      expect(stageProgress(s.at)).toBe(0);
    }
  });

  it('rises monotonically inside a stage', () => {
    // Stage 2 spans logs 4..9.
    const within = [4, 5, 6, 7, 8, 9].map(stageProgress);
    for (let i = 1; i < within.length; i++) {
      expect(within[i]).toBeGreaterThan(within[i - 1]);
    }
  });
});

describe('gardenFor', () => {
  it('plants nothing before the first log', () => {
    expect(gardenFor(0)).toEqual([]);
  });

  it('plants something on the first log', () => {
    expect(gardenFor(1).length).toBeGreaterThan(0);
  });

  it('is deterministic — the same garden every time it is opened', () => {
    expect(gardenFor(25)).toEqual(gardenFor(25));
  });

  it('stays a garden rather than becoming a hedge', () => {
    for (const n of [50, 200, 5000]) {
      expect(gardenFor(n).length).toBeLessThanOrEqual(MAX_PLANTS);
    }
  });

  it('keeps every plant inside the strip', () => {
    for (const n of [1, 7, 22, 90]) {
      for (const p of gardenFor(n)) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.height).toBeGreaterThan(0);
        expect(p.height).toBeLessThanOrEqual(1);
        expect(p.hue).toBeGreaterThanOrEqual(0);
        expect(p.hue).toBeLessThan(4);
      }
    }
  });

  it('sorts tallest-first so short plants are never hidden', () => {
    const plants = gardenFor(40);
    for (let i = 1; i < plants.length; i++) {
      expect(plants[i - 1].height).toBeGreaterThanOrEqual(plants[i].height);
    }
  });

  it('shifts the mix toward flowers as the garden matures', () => {
    // The point of the stage system: a mature garden must look *different*,
    // not merely denser. Growing the count alone stops reading as progress
    // after about a week.
    const flowers = (n: number) => gardenFor(n).filter((p) => p.kind === 'flower').length;
    expect(flowers(2)).toBe(0);
    expect(flowers(60)).toBeGreaterThan(0);
  });

  it('never produces a NaN or a leaning-over plant', () => {
    for (const p of gardenFor(33)) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.height)).toBe(true);
      expect(Math.abs(p.lean)).toBeLessThan(20);
    }
  });
});

describe('countGardenLogs', () => {
  it('counts days, not entries', () => {
    // A bad day with six symptoms must not out-grow a quiet day. Rewarding
    // volume would mean rewarding suffering.
    const bad = countGardenLogs({ periodDays: 1, symptomDays: 1, moodDays: 1, resetSessions: 0 });
    const quiet = countGardenLogs({ periodDays: 0, symptomDays: 1, moodDays: 1, resetSessions: 1 });
    expect(bad).toBe(quiet);
  });

  it('treats a reset session as worth the same as a log', () => {
    // Taking a moment for yourself counts. That is the whole point of Reset
    // being in the app rather than being a separate wellness product.
    expect(countGardenLogs({ periodDays: 0, symptomDays: 0, moodDays: 0, resetSessions: 3 })).toBe(3);
  });

  it('ignores negative input instead of shrinking the garden', () => {
    expect(
      countGardenLogs({ periodDays: -5, symptomDays: 2, moodDays: 0, resetSessions: 0 })
    ).toBe(2);
  });
});
