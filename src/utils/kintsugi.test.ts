import {
  PIECES,
  PIECE_BOX,
  crackCumulative,
  crackLength,
  crackPath,
  nearestOnCrack,
  pointAtT,
} from './kintsugi';

/** A simple 100-unit horizontal line, for exact-arithmetic assertions. */
const LINE = [0, 0, 60, 0, 100, 0];
const LINE_CUM = crackCumulative(LINE);

describe('piece geometry', () => {
  it('offers six pieces with unique ids', () => {
    expect(PIECES).toHaveLength(6);
    expect(new Set(PIECES.map((p) => p.id)).size).toBe(6);
  });

  it('gives every piece a workable number of cracks', () => {
    for (const p of PIECES) {
      expect(p.cracks.length).toBeGreaterThanOrEqual(3);
      expect(p.cracks.length).toBeLessThanOrEqual(8);
    }
  });

  it('keeps every crack inside the piece box', () => {
    for (const p of PIECES) {
      for (const c of p.cracks) {
        for (const v of c) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(PIECE_BOX);
        }
      }
    }
  });

  it('builds every crack from complete, multi-segment point pairs', () => {
    for (const p of PIECES) {
      for (const c of p.cracks) {
        expect(c.length % 2).toBe(0);
        // At least three vertices, or it reads as a scratch rather than a break.
        expect(c.length).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it('gives every crack real length to trace', () => {
    for (const p of PIECES) {
      for (const c of p.cracks) {
        expect(crackLength(c)).toBeGreaterThan(20);
      }
    }
  });
});

describe('crackCumulative / crackLength', () => {
  it('accumulates arc length per vertex', () => {
    expect(LINE_CUM).toEqual([0, 60, 100]);
  });

  it('measures total length', () => {
    expect(crackLength(LINE)).toBe(100);
    expect(crackLength([0, 0, 3, 4])).toBe(5);
  });
});

describe('nearestOnCrack', () => {
  it('finds a point lying on the crack at zero distance', () => {
    const r = nearestOnCrack(LINE, LINE_CUM, 30, 0);
    expect(r.dist).toBeCloseTo(0);
    expect(r.t).toBeCloseTo(0.3);
  });

  it('measures perpendicular distance for a point off the crack', () => {
    const r = nearestOnCrack(LINE, LINE_CUM, 50, 12);
    expect(r.dist).toBeCloseTo(12);
    expect(r.t).toBeCloseTo(0.5);
  });

  it('clamps to the ends rather than extrapolating past them', () => {
    const before = nearestOnCrack(LINE, LINE_CUM, -40, 0);
    expect(before.t).toBeCloseTo(0);
    expect(before.dist).toBeCloseTo(40);

    const after = nearestOnCrack(LINE, LINE_CUM, 180, 0);
    expect(after.t).toBeCloseTo(1);
    expect(after.dist).toBeCloseTo(80);
  });

  it('always returns t within [0,1] for every real crack', () => {
    for (const p of PIECES) {
      for (const c of p.cracks) {
        const cum = crackCumulative(c);
        for (const [x, y] of [[0, 0], [100, 100], [200, 200], [-50, 90]]) {
          const r = nearestOnCrack(c, cum, x, y);
          expect(r.t).toBeGreaterThanOrEqual(0);
          expect(r.t).toBeLessThanOrEqual(1);
          expect(Number.isFinite(r.dist)).toBe(true);
        }
      }
    }
  });
});

describe('pointAtT', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(pointAtT(LINE, LINE_CUM, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAtT(LINE, LINE_CUM, 1)).toEqual({ x: 100, y: 0 });
  });

  it('interpolates along the polyline by arc length', () => {
    expect(pointAtT(LINE, LINE_CUM, 0.3).x).toBeCloseTo(30);
    expect(pointAtT(LINE, LINE_CUM, 0.8).x).toBeCloseTo(80);
  });

  it('clamps out-of-range t instead of running off the end', () => {
    expect(pointAtT(LINE, LINE_CUM, -3)).toEqual({ x: 0, y: 0 });
    expect(pointAtT(LINE, LINE_CUM, 9)).toEqual({ x: 100, y: 0 });
  });

  it('round-trips with nearestOnCrack across every crack', () => {
    for (const p of PIECES) {
      for (const c of p.cracks) {
        const cum = crackCumulative(c);
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const pt = pointAtT(c, cum, t);
          const back = nearestOnCrack(c, cum, pt.x, pt.y);
          expect(back.dist).toBeCloseTo(0, 5);
          expect(back.t).toBeCloseTo(t, 5);
        }
      }
    }
  });
});

describe('crackPath', () => {
  it('emits one move and a line per remaining vertex', () => {
    expect(crackPath(LINE)).toBe('M0 0 L60 0 L100 0');
  });

  it('produces a valid path for every crack', () => {
    for (const p of PIECES) {
      for (const c of p.cracks) {
        const d = crackPath(c);
        expect(d.startsWith('M')).toBe(true);
        expect(d.split('L')).toHaveLength(c.length / 2);
      }
    }
  });
});
