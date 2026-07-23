import { Joint, Pose } from './types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE POSE VOCABULARY — how thirty animations cost one component.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The brief asked for animated demonstrations of ~30 exercises, offline, at
 * 60fps, battery-efficient. The obvious readings of that are all bad:
 *
 *   Lottie      → 30 JSON files, ~40–150KB each, and a new dependency
 *   video/GIF   → megabytes, no theming, no reduced-motion story
 *   30 bespoke components → 30 things to maintain and re-tune
 *
 * So an exercise animation here is **data**: a list of keyframes, each holding
 * a *pose*, and a pose is twelve joint positions in a normalised 0–100 box. One
 * renderer (`components/care/ExerciseFigure`) interpolates between them and
 * draws limbs as thick rounded strokes.
 *
 * What that buys:
 *
 *   • **Zero assets.** Nothing to download, cache, lazy-load or version. The
 *     "works offline" requirement is met by there being nothing to fetch.
 *   • **Themeable.** The figure takes the phase hue, so it belongs to the
 *     palette instead of being a foreign object pasted onto it.
 *   • **Free reduced-motion.** Hold frame 0 and it is a clean illustration.
 *   • **Cheap.** One animated node per figure; the interpolation is a worklet.
 *   • **Reviewable.** A wrong pose is a wrong number in a file, visible in a
 *     diff, rather than a re-export from a design tool.
 *
 * ── Why a shared registry rather than poses inline per exercise ───────────
 *
 * Roughly a third of these poses appear in several exercises — table-top is in
 * cat-cow, bird-dog and thread-the-needle; child's pose is a rest position for
 * half the library. Naming them once means an improvement to `childsPose`
 * improves every exercise that rests in it, and it keeps the exercise file
 * about *content* rather than about geometry.
 *
 * ── Conventions ───────────────────────────────────────────────────────────
 *
 * • The figure faces **right**. x grows right, y grows **down** (SVG).
 * • The floor is y≈92. Anything lying down sits near it.
 * • `L` limbs are the far side, `R` the near side. Drawing far limbs first
 *   with slightly lower opacity is what gives a flat side view its depth.
 * • Poses are anatomically *suggestive*, not accurate. This is a calm
 *   pictogram that shows the shape of a movement, not a physiotherapy
 *   diagram — and a stylised figure is far kinder to look at while in pain.
 */

/** Positional constructor. Twelve joints, one line, in a fixed order. */
export function P(
  head: [number, number],
  neck: [number, number],
  chest: [number, number],
  hip: [number, number],
  kneeL: [number, number],
  ankleL: [number, number],
  kneeR: [number, number],
  ankleR: [number, number],
  elbowL: [number, number],
  handL: [number, number],
  elbowR: [number, number],
  handR: [number, number]
): Pose {
  return { head, neck, chest, hip, kneeL, ankleL, kneeR, ankleR, elbowL, handL, elbowR, handR };
}

export const JOINTS: Joint[] = [
  'head',
  'neck',
  'chest',
  'hip',
  'kneeL',
  'ankleL',
  'kneeR',
  'ankleR',
  'elbowL',
  'handL',
  'elbowR',
  'handR',
];

/**
 * Limb segments, drawn in order. Far side first so the near side overlaps it.
 * `depth` scales stroke width and opacity — the whole of the 3D illusion.
 */
export const BONES: { a: Joint; b: Joint; depth: number }[] = [
  { a: 'hip', b: 'kneeL', depth: 0.72 },
  { a: 'kneeL', b: 'ankleL', depth: 0.72 },
  { a: 'chest', b: 'elbowL', depth: 0.72 },
  { a: 'elbowL', b: 'handL', depth: 0.72 },
  { a: 'hip', b: 'chest', depth: 1 },
  { a: 'chest', b: 'neck', depth: 1 },
  { a: 'hip', b: 'kneeR', depth: 1 },
  { a: 'kneeR', b: 'ankleR', depth: 1 },
  { a: 'chest', b: 'elbowR', depth: 1 },
  { a: 'elbowR', b: 'handR', depth: 1 },
];

/** Linear interpolation between two poses. Worklet-safe: no closures, no allocation beyond the result. */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  'worklet';
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  const out = {} as Pose;
  for (let i = 0; i < JOINTS.length; i++) {
    const j = JOINTS[i];
    const pa = a[j];
    const pb = b[j];
    out[j] = [pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k];
  }
  return out;
}

/** Ease used between keyframes. Slow in, slow out — a body does not move linearly. */
export function easeInOut(t: number): number {
  'worklet';
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
}

// ───────────────────────────────────────────────────────────────────────────
// The vocabulary
// ───────────────────────────────────────────────────────────────────────────

export const POSES = {
  // ── Standing ────────────────────────────────────────────────────────────
  standing: P(
    [50, 13], [50, 22], [50, 36], [50, 54],
    [47, 72], [47, 91], [53, 72], [53, 91],
    [45, 47], [44, 61], [55, 47], [56, 61]
  ),
  standingArmsUp: P(
    [50, 14], [50, 23], [50, 37], [50, 54],
    [47, 72], [47, 91], [53, 72], [53, 91],
    [44, 26], [42, 12], [56, 26], [58, 12]
  ),
  /** Forward fold — hinged at the hip, head hanging, hands toward the floor. */
  forwardFold: P(
    [56, 62], [54, 55], [51, 45], [50, 54],
    [48, 72], [48, 91], [53, 72], [53, 91],
    [56, 66], [58, 80], [59, 66], [61, 80]
  ),
  /** Side stretch, reaching over to the right. */
  standingSide: P(
    [56, 17], [55, 25], [53, 38], [50, 54],
    [47, 72], [47, 91], [53, 72], [53, 91],
    [58, 24], [64, 14], [48, 48], [45, 60]
  ),
  /** Mid-stride, near leg forward. */
  walkA: P(
    [50, 13], [50, 22], [50, 36], [50, 54],
    [43, 71], [40, 89], [57, 70], [60, 89],
    [46, 47], [43, 59], [55, 46], [58, 58]
  ),
  walkB: P(
    [50, 13], [50, 22], [50, 36], [50, 54],
    [57, 70], [60, 89], [43, 71], [40, 89],
    [55, 46], [58, 58], [46, 47], [43, 59]
  ),

  // ── Kneeling / all fours ────────────────────────────────────────────────
  tableTop: P(
    [30, 50], [36, 52], [46, 54], [68, 54],
    [70, 72], [78, 78], [70, 72], [78, 78],
    [44, 66], [42, 79], [44, 66], [42, 79]
  ),
  /** Cat — spine rounded up, tailbone tucked, head released. */
  cat: P(
    [31, 60], [36, 58], [46, 47], [68, 51],
    [70, 71], [78, 78], [70, 71], [78, 78],
    [44, 64], [42, 79], [44, 64], [42, 79]
  ),
  /** Cow — belly softens, chest and tailbone lift. */
  cow: P(
    [28, 44], [35, 48], [46, 60], [68, 56],
    [70, 73], [78, 78], [70, 73], [78, 78],
    [44, 68], [42, 79], [44, 68], [42, 79]
  ),
  childsPose: P(
    [30, 74], [37, 74], [49, 71], [68, 62],
    [72, 74], [80, 80], [72, 74], [80, 80],
    [40, 72], [22, 78], [40, 72], [22, 78]
  ),
  /** Kneeling upright, hands resting on thighs. */
  kneeling: P(
    [52, 26], [52, 34], [52, 46], [53, 62],
    [64, 70], [76, 74], [64, 70], [76, 74],
    [48, 55], [56, 64], [56, 55], [62, 64]
  ),
  lowLunge: P(
    [42, 30], [43, 38], [45, 50], [50, 64],
    [72, 74], [82, 82], [34, 70], [30, 88],
    [40, 60], [36, 74], [50, 60], [54, 74]
  ),
  /** Thread the needle — one shoulder to the mat, spine spiralling. */
  thread: P(
    [30, 72], [36, 68], [48, 60], [68, 54],
    [70, 72], [78, 78], [70, 72], [78, 78],
    [42, 70], [24, 76], [50, 50], [46, 40]
  ),
  birdDog: P(
    [28, 46], [35, 49], [46, 53], [68, 54],
    [72, 70], [80, 76], [76, 46], [90, 42],
    [42, 60], [40, 74], [34, 42], [22, 36]
  ),

  // ── Prone ───────────────────────────────────────────────────────────────
  prone: P(
    [26, 78], [33, 78], [46, 79], [66, 80],
    [78, 81], [90, 82], [78, 81], [90, 82],
    [40, 84], [34, 88], [40, 84], [34, 88]
  ),
  sphinx: P(
    [28, 60], [34, 63], [46, 70], [66, 80],
    [78, 81], [90, 82], [78, 81], [90, 82],
    [38, 74], [26, 82], [38, 74], [26, 82]
  ),
  cobra: P(
    [28, 50], [34, 55], [46, 66], [66, 80],
    [78, 81], [90, 82], [78, 81], [90, 82],
    [42, 70], [40, 84], [42, 70], [40, 84]
  ),

  // ── Supine ──────────────────────────────────────────────────────────────
  supine: P(
    [22, 80], [29, 80], [42, 81], [62, 82],
    [76, 82], [88, 83], [76, 82], [88, 83],
    [38, 88], [46, 90], [38, 88], [46, 90]
  ),
  supineKneesBent: P(
    [22, 80], [29, 80], [42, 81], [62, 82],
    [72, 68], [80, 84], [72, 68], [80, 84],
    [38, 88], [46, 90], [38, 88], [46, 90]
  ),
  /** Pelvic tilt — the low back presses toward the floor. */
  pelvicTilt: P(
    [22, 80], [29, 80], [42, 83], [62, 86],
    [72, 70], [80, 84], [72, 70], [80, 84],
    [38, 88], [46, 90], [38, 88], [46, 90]
  ),
  bridge: P(
    [22, 82], [29, 82], [44, 76], [64, 64],
    [74, 62], [80, 84], [74, 62], [80, 84],
    [38, 88], [48, 90], [38, 88], [48, 90]
  ),
  kneesToChest: P(
    [22, 80], [29, 80], [42, 81], [60, 80],
    [54, 62], [64, 56], [54, 62], [64, 56],
    [40, 74], [52, 62], [40, 74], [52, 62]
  ),
  supineTwist: P(
    [22, 78], [29, 79], [42, 80], [60, 82],
    [56, 66], [66, 62], [56, 66], [66, 62],
    [34, 70], [26, 62], [44, 90], [56, 92]
  ),
  happyBaby: P(
    [24, 82], [31, 82], [44, 83], [60, 84],
    [58, 64], [50, 52], [70, 64], [78, 52],
    [50, 72], [50, 56], [64, 72], [72, 56]
  ),
  legsUpWall: P(
    [22, 82], [29, 82], [42, 83], [60, 84],
    [62, 60], [64, 36], [66, 60], [68, 36],
    [38, 90], [48, 92], [38, 90], [48, 92]
  ),
  savasana: P(
    [20, 81], [27, 81], [41, 82], [61, 83],
    [75, 84], [89, 86], [75, 84], [89, 86],
    [36, 89], [44, 93], [36, 89], [44, 93]
  ),

  // ── Seated ──────────────────────────────────────────────────────────────
  seated: P(
    [48, 32], [48, 40], [48, 52], [46, 70],
    [64, 74], [78, 80], [64, 74], [78, 80],
    [42, 60], [52, 70], [54, 60], [60, 70]
  ),
  butterfly: P(
    [48, 32], [48, 40], [48, 52], [46, 70],
    [62, 62], [58, 80], [62, 78], [58, 80],
    [44, 62], [56, 76], [54, 62], [60, 76]
  ),
  butterflyFold: P(
    [56, 54], [54, 50], [50, 56], [46, 70],
    [62, 62], [58, 80], [62, 78], [58, 80],
    [52, 64], [60, 76], [56, 64], [62, 76]
  ),
  seatedFold: P(
    [64, 56], [60, 52], [54, 56], [46, 70],
    [62, 72], [80, 78], [62, 72], [80, 78],
    [58, 62], [72, 72], [60, 62], [74, 72]
  ),
  seatedSide: P(
    [54, 26], [52, 34], [50, 48], [46, 70],
    [64, 74], [78, 80], [64, 74], [78, 80],
    [56, 32], [62, 22], [44, 60], [42, 72]
  ),
  seatedTwist: P(
    [44, 30], [46, 38], [50, 50], [46, 70],
    [64, 74], [78, 80], [64, 74], [78, 80],
    [38, 52], [34, 64], [58, 50], [64, 60]
  ),

  // ── Head, neck, shoulders (seated base) ─────────────────────────────────
  neckTilt: P(
    [54, 30], [49, 39], [48, 52], [46, 70],
    [64, 74], [78, 80], [64, 74], [78, 80],
    [42, 60], [52, 70], [54, 60], [60, 70]
  ),
  neckTurn: P(
    [44, 30], [48, 39], [48, 52], [46, 70],
    [64, 74], [78, 80], [64, 74], [78, 80],
    [42, 60], [52, 70], [54, 60], [60, 70]
  ),
  shouldersUp: P(
    [48, 30], [48, 37], [48, 50], [46, 70],
    [64, 74], [78, 80], [64, 74], [78, 80],
    [40, 54], [50, 66], [56, 54], [62, 66]
  ),
  /** Chest opener — hands clasped behind, shoulders drawing back. */
  chestOpen: P(
    [50, 30], [50, 38], [52, 50], [46, 70],
    [64, 74], [78, 80], [64, 74], [78, 80],
    [40, 58], [34, 70], [42, 58], [36, 70]
  ),

  // ── Hips ────────────────────────────────────────────────────────────────
  hipCircleA: P(
    [50, 13], [50, 22], [50, 36], [46, 54],
    [45, 72], [46, 91], [51, 72], [52, 91],
    [42, 48], [44, 58], [54, 48], [56, 58]
  ),
  hipCircleB: P(
    [50, 13], [50, 22], [50, 36], [54, 54],
    [49, 72], [48, 91], [55, 72], [54, 91],
    [44, 48], [44, 58], [56, 48], [56, 58]
  ),
  figureFour: P(
    [22, 80], [29, 80], [42, 81], [62, 82],
    [70, 66], [58, 62], [66, 74], [80, 70],
    [40, 76], [54, 68], [40, 76], [54, 68]
  ),
} as const;

export type PoseName = keyof typeof POSES;
