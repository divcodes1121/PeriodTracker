import {
  SPECIES,
  daysSince,
  growthFor,
  lightingFor,
  rosterFor,
  seedFrom,
  rng,
} from './aquarium';
import type { TimeBand } from '../theme/atmosphere';

/**
 * The aquarium's promises, pinned down:
 *  - it is *yours* (same seed → same tank, different seeds → different tanks),
 *  - it grows on its own and cannot be grinded,
 *  - rarities stay rare,
 *  - and it never disagrees with the app's own sense of time of day.
 */

describe('seedFrom / rng', () => {
  it('is deterministic for a given id', () => {
    expect(seedFrom('user-abc')).toBe(seedFrom('user-abc'));
  });

  it('separates different ids', () => {
    expect(seedFrom('user-abc')).not.toBe(seedFrom('user-abd'));
  });

  it('produces values in [0,1)', () => {
    const r = rng(12345);
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('rosterFor', () => {
  it('is stable — the same user always gets the same aquarium', () => {
    const a = rosterFor(seedFrom('u1'));
    const b = rosterFor(seedFrom('u1'));
    expect(a.map((f) => f.species.id)).toEqual(b.map((f) => f.species.id));
    expect(a.map((f) => f.scale)).toEqual(b.map((f) => f.scale));
  });

  it('gives different users different aquariums', () => {
    const a = rosterFor(seedFrom('u1')).map((f) => f.species.id).join();
    const b = rosterFor(seedFrom('u2')).map((f) => f.species.id).join();
    expect(a).not.toBe(b);
  });

  it('returns the requested population', () => {
    expect(rosterFor(1, 22)).toHaveLength(22);
    expect(rosterFor(1, 5)).toHaveLength(5);
  });

  it('keeps every fish inside the tank', () => {
    for (const f of rosterFor(seedFrom('depth-check'), 60)) {
      expect(f.lane).toBeGreaterThanOrEqual(0.08);
      expect(f.lane).toBeLessThanOrEqual(0.92);
      expect(f.scale).toBeGreaterThan(0);
    }
  });

  it('only ever draws real species', () => {
    const ids = new Set(SPECIES.map((s) => s.id));
    for (const f of rosterFor(seedFrom('valid'), 80)) {
      expect(ids).toContain(f.species.id);
    }
  });

  it('keeps rarities rare across many aquariums', () => {
    // A Koi or Seahorse should be something not everyone has.
    let tanksWithRarity = 0;
    const TANKS = 200;
    for (let i = 0; i < TANKS; i++) {
      const roster = rosterFor(seedFrom(`user-${i}`));
      if (roster.some((f) => f.species.id === 'koi' || f.species.id === 'seahorse')) {
        tanksWithRarity++;
      }
    }
    const share = tanksWithRarity / TANKS;
    // Present often enough to be real, rare enough to feel like luck.
    expect(share).toBeGreaterThan(0.1);
    expect(share).toBeLessThan(0.95);
  });
});

describe('growthFor', () => {
  it('starts planted rather than barren', () => {
    // Day one must still look like an aquarium, not an empty box.
    const g = growthFor(0);
    expect(g.plants).toBeGreaterThanOrEqual(4);
    expect(g.coral).toBeGreaterThanOrEqual(2);
  });

  it('never regresses', () => {
    let prev = -1;
    for (let d = 0; d <= 400; d++) {
      const m = growthFor(d).maturity;
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it('stays within 0..1 and saturates', () => {
    expect(growthFor(0).maturity).toBe(0);
    expect(growthFor(90).maturity).toBeCloseTo(1);
    expect(growthFor(100000).maturity).toBe(1);
  });

  it('is visibly further along after a fortnight', () => {
    // The whole point is that returning later shows a changed tank.
    expect(growthFor(14).maturity).toBeGreaterThan(growthFor(1).maturity + 0.2);
  });

  it('treats negative ages as day zero', () => {
    expect(growthFor(-50).maturity).toBe(0);
  });
});

describe('lightingFor', () => {
  const BANDS: TimeBand[] = ['dawn', 'day', 'dusk', 'night'];

  it('gives every band a distinct water column', () => {
    const seen = new Set(BANDS.map((b) => lightingFor(b).water.join()));
    expect(seen.size).toBe(BANDS.length);
  });

  it('rests the tank only at night', () => {
    expect(lightingFor('night').restful).toBe(true);
    expect(lightingFor('day').restful).toBe(false);
    expect(lightingFor('dawn').restful).toBe(false);
  });

  it('runs the strongest light shafts at midday', () => {
    const day = lightingFor('day').rayStrength;
    for (const b of BANDS.filter((x) => x !== 'day')) {
      expect(lightingFor(b).rayStrength).toBeLessThan(day);
    }
  });

  it('always returns a complete record', () => {
    for (const b of BANDS) {
      const l = lightingFor(b);
      expect(l.water).toHaveLength(3);
      expect(l.room).toHaveLength(2);
      expect(l.rayStrength).toBeGreaterThanOrEqual(0);
      expect(l.rayStrength).toBeLessThanOrEqual(1);
    }
  });
});

describe('daysSince', () => {
  it('counts whole days', () => {
    const now = new Date('2026-07-21T12:00:00Z');
    expect(daysSince(new Date('2026-07-21T00:00:00Z'), now)).toBe(0);
    expect(daysSince(new Date('2026-07-11T00:00:00Z'), now)).toBe(10);
  });

  it('never goes negative for a future date', () => {
    const now = new Date('2026-07-21T12:00:00Z');
    expect(daysSince(new Date('2027-01-01T00:00:00Z'), now)).toBe(0);
  });
});
