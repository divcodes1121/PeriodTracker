import {
  SPECIES,
  daysSince,
  growthFor,
  lightingFor,
  rosterFor,
  seedFrom,
  rng,
  poiLife,
  poiWeight,
  poiBlend,
  chooseSlot,
  POI_HOLD,
  POI_FADE,
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

  it('renders a good spread of body shapes in one tank', () => {
    // Variety is the point: a tank of 34 fish that is all one silhouette reads
    // as one fish repeated, however many colours it comes in.
    const shapes = new Set(rosterFor(seedFrom('variety'), 34).map((f) => f.species.shape));
    expect(shapes.size).toBeGreaterThanOrEqual(4);
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

describe('species catalogue', () => {
  it('gives every species a body shape', () => {
    for (const sp of SPECIES) {
      expect(sp.shape).toBeTruthy();
    }
  });

  it('has unique ids and three palette colours each', () => {
    const ids = SPECIES.map((sp) => sp.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const sp of SPECIES) {
      expect(sp.palette).toHaveLength(3);
      for (const c of sp.palette) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('covers every declared body shape at least once', () => {
    // A shape with no species is a renderer branch nothing can reach.
    const used = new Set(SPECIES.map((sp) => sp.shape));
    for (const shape of ['torpedo', 'disc', 'sail', 'veil', 'ribbon', 'round', 'seahorse', 'carp']) {
      expect(used).toContain(shape);
    }
  });

  it('keeps every trait in range', () => {
    for (const sp of SPECIES) {
      for (const k of ['social', 'curiosity', 'speed', 'depth'] as const) {
        expect(sp[k]).toBeGreaterThanOrEqual(0);
        expect(sp[k]).toBeLessThanOrEqual(1);
      }
      expect(sp.size).toBeGreaterThan(0);
      expect(sp.weight).toBeGreaterThan(0);
    }
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

describe('poiLife', () => {
  it('holds full attention through the plateau', () => {
    expect(poiLife(0)).toBe(1);
    expect(poiLife(POI_HOLD - 0.1)).toBe(1);
    expect(poiLife(POI_HOLD)).toBe(1);
  });

  it('fades to nothing and stays there', () => {
    expect(poiLife(POI_HOLD + POI_FADE / 2)).toBeCloseTo(0.5, 2);
    expect(poiLife(POI_HOLD + POI_FADE)).toBe(0);
    expect(poiLife(9999)).toBe(0);
  });

  it('never increases and never goes negative', () => {
    let prev = Infinity;
    for (let t = 0; t <= 60; t += 0.25) {
      const v = poiLife(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
  });

  it('ignores negative time', () => {
    expect(poiLife(-3)).toBe(0);
  });
});

describe('poiWeight', () => {
  it('is zero once the point is dead', () => {
    expect(poiWeight(POI_HOLD + POI_FADE + 1, 1, 1, 0)).toBe(0);
  });

  it('ramps in rather than snapping on', () => {
    // The bug this replaces applied full pull instantly; arrival must be gradual.
    const a = poiWeight(0, 2, 1, 100);
    const b = poiWeight(1, 2, 1, 100);
    const c = poiWeight(2, 2, 1, 100);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
    expect(a).toBeCloseTo(0, 5);
  });

  it('falls off with distance but never to zero', () => {
    const near = poiWeight(5, 1, 1, 0);
    const far = poiWeight(5, 1, 1, 2000);
    expect(far).toBeLessThan(near);
    expect(far).toBeGreaterThan(0); // no distance cutoff: a tap is felt tank-wide
  });

  it('scales with preference, which is what splits the shoal', () => {
    expect(poiWeight(5, 1, 1.9, 100)).toBeGreaterThan(poiWeight(5, 1, 0.45, 100));
  });
});

describe('poiBlend', () => {
  it('is zero with no interest', () => {
    expect(poiBlend(0, 1)).toBe(0);
    expect(poiBlend(-5, 1)).toBe(0);
  });

  it('can never reach 1, so a fish cannot overshoot its target', () => {
    // Structural guarantee: blend < 1 means the lerp only ever moves toward.
    for (const w of [0.5, 1, 5, 100, 1e6]) {
      expect(poiBlend(w, 1)).toBeLessThanOrEqual(0.88);
      expect(poiBlend(w, 1)).toBeLessThan(1);
    }
  });

  it('rises with total pull', () => {
    expect(poiBlend(0.2, 1)).toBeLessThan(poiBlend(0.5, 1));
  });
});

describe('chooseSlot', () => {
  it('fills empty slots first', () => {
    expect(chooseSlot([0, 0, 0, 0])).toBe(0);
    expect(chooseSlot([5, 0, 0, 0])).toBe(1);
    expect(chooseSlot([5, 6, 0, 0])).toBe(2);
  });

  it('evicts the oldest when every slot is live', () => {
    // Round-robin used to stamp over whichever slot came next, teleporting a
    // fresh crowd. The oldest point has the least pull left, so it is the
    // least disruptive thing to replace.
    expect(chooseSlot([30, 10, 25, 40])).toBe(1);
    expect(chooseSlot([9, 8, 7, 6])).toBe(3);
  });

  it('handles any pool size', () => {
    expect(chooseSlot([1])).toBe(0);
    expect(chooseSlot(Array.from({ length: 16 }, (_, i) => 100 - i))).toBe(15);
  });
});

describe('a new point never causes a jump', () => {
  it('keeps the blended target continuous when a second point appears', () => {
    // This is the property the whole centroid design exists to guarantee: if a
    // fish PICKED a point instead of blending, a fresh point (arrive=0) would
    // yank it back toward its base path the frame it appeared.
    const fx = 100;
    const fy = 100;
    const centroid = (pts: { x: number; y: number; el: number }[]) => {
      let tx = 0, ty = 0, w = 0;
      for (const pt of pts) {
        const wt = poiWeight(pt.el, 1.2, 1, Math.hypot(pt.x - fx, pt.y - fy));
        tx += pt.x * wt; ty += pt.y * wt; w += wt;
      }
      return w > 0 ? { x: tx / w, y: ty / w, w } : { x: fx, y: fy, w: 0 };
    };

    // A has been active a while; B appears this instant.
    const before = centroid([{ x: 300, y: 300, el: 6 }]);
    const after = centroid([{ x: 300, y: 300, el: 6.016 }, { x: 50, y: 400, el: 0 }]);

    // The target must not lurch — one frame may only nudge it.
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(5);
  });

  it('migrates fully to the new point once the old one dies', () => {
    const fx = 100, fy = 100;
    const wOld = poiWeight(POI_HOLD + POI_FADE + 5, 1.2, 1, 200); // dead
    const wNew = poiWeight(8, 1.2, 1, 200);                        // established
    expect(wOld).toBe(0);
    expect(wNew).toBeGreaterThan(0);
  });
});
