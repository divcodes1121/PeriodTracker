/**
 * Kintsugi — piece geometry and the pure math behind tracing.
 *
 * Kept RN-free so it runs under the node Jest project, and every function the
 * gesture needs carries the `'worklet'` directive so the same tested code runs
 * on the UI thread. Cracks are flat `[x0,y0,x1,y1,…]` polylines rather than
 * point objects: the tracing loop runs on every pan frame, and flat number
 * arrays keep it allocation-free.
 *
 * All piece geometry lives in one 200×200 local space; the scene scales that
 * box to fit the screen and maps touches back into it.
 */

export const PIECE_BOX = 200;

export interface PieceMeta {
  id: string;
  name: string;
  /** Fracture lines, each a flat polyline in the 200×200 piece space. */
  cracks: number[][];
}

/**
 * The six pieces. Each begins already broken — the cracks are the starting
 * state, not damage the user causes. Fracture lines run edge-to-edge across
 * the body and branch into each other the way real breaks do, so tracing one
 * naturally leads the eye to the next.
 */
export const PIECES: PieceMeta[] = [
  {
    id: 'cup',
    name: 'Tea Cup',
    cracks: [
      [96, 76, 92, 92, 100, 104, 94, 120, 99, 136, 95, 150],
      [58, 86, 74, 96, 86, 112, 92, 128, 88, 144],
      [146, 82, 132, 94, 128, 110, 136, 124],
      [100, 104, 116, 110, 128, 110],
      [70, 146, 88, 150, 106, 150, 124, 146],
    ],
  },
  {
    id: 'bowl',
    name: 'Bowl',
    cracks: [
      [100, 82, 96, 100, 104, 118, 98, 136, 100, 150],
      [40, 90, 58, 104, 74, 116, 86, 132, 92, 146],
      [160, 88, 142, 100, 130, 116, 124, 132],
      [74, 116, 100, 118, 130, 116],
      [58, 104, 64, 90, 74, 82],
    ],
  },
  {
    id: 'vase',
    name: 'Vase',
    cracks: [
      [100, 48, 96, 62, 100, 78, 94, 96, 100, 114, 96, 134, 100, 152],
      [52, 110, 68, 120, 80, 134, 88, 150],
      [150, 116, 134, 126, 124, 140, 118, 154],
      [80, 134, 100, 132, 124, 140],
      [88, 66, 100, 78, 112, 68],
    ],
  },
  {
    id: 'lantern',
    name: 'Lantern',
    cracks: [
      [100, 56, 94, 72, 102, 88, 96, 106, 100, 124, 96, 144],
      [58, 86, 72, 96, 82, 112, 86, 130],
      [142, 92, 128, 102, 120, 118, 122, 136],
      [82, 112, 100, 110, 120, 118],
      [70, 62, 84, 68, 92, 60],
    ],
  },
  {
    id: 'plate',
    name: 'Moon Plate',
    cracks: [
      [100, 34, 96, 56, 104, 78, 98, 100, 102, 124, 96, 146, 100, 166],
      [40, 72, 62, 86, 82, 96, 100, 100],
      [160, 124, 138, 116, 118, 106, 100, 100],
      [62, 86, 68, 70, 78, 56],
      [138, 116, 146, 130, 150, 144],
    ],
  },
  {
    id: 'bird',
    name: 'Porcelain Bird',
    cracks: [
      [96, 84, 90, 100, 98, 114, 92, 130, 98, 142],
      [64, 96, 78, 106, 88, 120, 90, 136],
      [130, 104, 118, 112, 110, 126, 112, 140],
      [88, 120, 108, 118, 118, 112],
      [60, 124, 72, 134, 86, 140],
    ],
  },
];

/**
 * Cumulative arc length at each vertex. Computed once per piece and handed to
 * the worklets, so the per-frame math never re-walks the whole polyline.
 */
export function crackCumulative(pts: number[]): number[] {
  'worklet';
  const cum = [0];
  for (let i = 2; i < pts.length; i += 2) {
    const dx = pts[i] - pts[i - 2];
    const dy = pts[i + 1] - pts[i - 1];
    cum.push(cum[cum.length - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  return cum;
}

/** Total length of a crack, in piece-space units. */
export function crackLength(pts: number[]): number {
  'worklet';
  const cum = crackCumulative(pts);
  return cum[cum.length - 1];
}

/**
 * Closest point on a crack to (x, y), as a distance plus the normalised arc
 * position `t` along the crack. The gesture uses `dist` to decide whether the
 * finger counts as "on" this crack (generously) and `t` as how far the gold
 * should have flowed. Never mutates or allocates beyond the returned pair.
 */
export function nearestOnCrack(
  pts: number[],
  cum: number[],
  x: number,
  y: number
): { dist: number; t: number } {
  'worklet';
  const total = cum[cum.length - 1];
  let bestDist = Infinity;
  let bestArc = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i];
    const ay = pts[i + 1];
    const vx = pts[i + 2] - ax;
    const vy = pts[i + 3] - ay;
    const len2 = vx * vx + vy * vy;
    let s = len2 === 0 ? 0 : ((x - ax) * vx + (y - ay) * vy) / len2;
    if (s < 0) s = 0;
    else if (s > 1) s = 1;
    const dx = x - (ax + vx * s);
    const dy = y - (ay + vy * s);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) {
      bestDist = d;
      bestArc = cum[i / 2] + Math.sqrt(len2) * s;
    }
  }
  return { dist: bestDist, t: total > 0 ? bestArc / total : 0 };
}

/**
 * The point at normalised arc position `t` — where the liquid gold's leading
 * edge sits, so the scene can put a bright droplet there while it flows.
 */
export function pointAtT(pts: number[], cum: number[], t: number): { x: number; y: number } {
  'worklet';
  const total = cum[cum.length - 1];
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const target = clamped * total;
  for (let i = 1; i < cum.length; i++) {
    if (cum[i] >= target || i === cum.length - 1) {
      const seg = cum[i] - cum[i - 1];
      const s = seg > 0 ? (target - cum[i - 1]) / seg : 0;
      const ax = pts[(i - 1) * 2];
      const ay = pts[(i - 1) * 2 + 1];
      return { x: ax + (pts[i * 2] - ax) * s, y: ay + (pts[i * 2 + 1] - ay) * s };
    }
  }
  return { x: pts[0], y: pts[1] };
}

/** SVG `d` for a crack. Straight segments on purpose — breaks are angular. */
export function crackPath(pts: number[]): string {
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length; i += 2) d += ` L${pts[i]} ${pts[i + 1]}`;
  return d;
}
