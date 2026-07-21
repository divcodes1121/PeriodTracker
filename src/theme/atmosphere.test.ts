import { atmosphere, timeBand, greetingFor, PhaseKey, TimeBand } from './atmosphere';

/**
 * The atmosphere is the one place colour becomes semantic, so its promises are
 * worth pinning down: distinct phases must actually *look* distinct, reduced
 * motion must be total rather than merely quieter, and dark mode must keep
 * lifting light off the canvas instead of muddying it.
 *
 * These are cheap invariants that catch the failure mode this module exists to
 * prevent — someone tuning one phase and silently collapsing it onto another.
 */

const PHASES: PhaseKey[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];
const BANDS: Array<[number, TimeBand]> = [
  [0, 'night'],
  [4, 'night'],
  [5, 'dawn'],
  [8, 'dawn'],
  [9, 'day'],
  [16, 'day'],
  [17, 'dusk'],
  [20, 'dusk'],
  [21, 'night'],
  [23, 'night'],
];

/** Pull the alpha out of an `rgba(r,g,b,a)` string. */
function alphaOf(rgba: string): number {
  const m = rgba.match(/rgba\([^)]*,\s*([\d.]+)\)\s*$/);
  if (!m) throw new Error(`not an rgba string: ${rgba}`);
  return parseFloat(m[1]);
}

describe('timeBand', () => {
  it.each(BANDS)('hour %i falls in %s', (hour, expected) => {
    expect(timeBand(hour)).toBe(expected);
  });

  it('covers every hour of the day', () => {
    for (let h = 0; h < 24; h++) {
      expect(['dawn', 'day', 'dusk', 'night']).toContain(timeBand(h));
    }
  });
});

describe('atmosphere', () => {
  it('gives every phase a visually distinct canvas', () => {
    // If two phases produce identical washes the whole module is decorative.
    const washes = PHASES.map((phase) => atmosphere({ phase, hour: 12, isDark: false }).canvas[2]);
    expect(new Set(washes).size).toBe(PHASES.length);
  });

  it('gives every phase a distinct glow', () => {
    const glows = PHASES.map((phase) => atmosphere({ phase, hour: 12, isDark: false }).glow);
    expect(new Set(glows).size).toBe(PHASES.length);
  });

  it('shifts the same phase across the day', () => {
    // Time of day must move the canvas too, or the app looks identical at
    // 3am and 3pm.
    const seen = new Set(
      [3, 7, 13, 19].map((hour) => atmosphere({ phase: 'luteal', hour, isDark: false }).canvas[0])
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it('keeps day the least tinted band', () => {
    // Midday is high neutral light; dusk is the heaviest cast.
    const day = alphaOf(atmosphere({ phase: 'menstrual', hour: 13, isDark: false }).canvas[2]);
    const dusk = alphaOf(atmosphere({ phase: 'menstrual', hour: 19, isDark: false }).canvas[2]);
    expect(day).toBeLessThan(dusk);
  });

  it('runs menstrual warmer than follicular', () => {
    // The cocoon should read heavier than the aerated rising phase.
    const m = atmosphere({ phase: 'menstrual', hour: 12, isDark: false });
    const f = atmosphere({ phase: 'follicular', hour: 12, isDark: false });
    expect(m.warmth).toBeGreaterThan(f.warmth);
  });

  it('lifts alpha in dark mode so the grading survives a near-black canvas', () => {
    const light = alphaOf(atmosphere({ phase: 'luteal', hour: 12, isDark: false }).glow);
    const dark = alphaOf(atmosphere({ phase: 'luteal', hour: 12, isDark: true }).glow);
    expect(dark).toBeGreaterThan(light);
  });

  it('lets night stars override the phase particle', () => {
    expect(atmosphere({ phase: 'follicular', hour: 13, isDark: false }).mote).toBe('pollen');
    expect(atmosphere({ phase: 'follicular', hour: 23, isDark: false }).mote).toBe('star');
  });

  describe('reduced motion', () => {
    it.each(PHASES)('stops all motion for %s', (phase) => {
      const a = atmosphere({ phase, hour: 12, isDark: false, reducedMotion: true });
      expect(a.moteCount).toBe(0);
      expect(a.mote).toBe('none');
      expect(a.driftSec).toBe(Infinity);
    });

    it('keeps the colour grading — only motion is removed', () => {
      // Reduced motion is not reduced *beauty*: the canvas must still be graded.
      const moving = atmosphere({ phase: 'ovulation', hour: 12, isDark: false });
      const still = atmosphere({ phase: 'ovulation', hour: 12, isDark: false, reducedMotion: true });
      expect(still.canvas).toEqual(moving.canvas);
      expect(still.glow).toBe(moving.glow);
    });
  });

  it('always emits four canvas stops and two orbs', () => {
    for (const phase of PHASES) {
      for (let hour = 0; hour < 24; hour += 3) {
        for (const isDark of [false, true]) {
          const a = atmosphere({ phase, hour, isDark });
          expect(a.canvas).toHaveLength(4);
          expect(a.orbs).toHaveLength(2);
          expect(a.lightAngle).toBeGreaterThanOrEqual(0);
          expect(a.lightAngle).toBeLessThan(360);
          expect(a.warmth).toBeGreaterThanOrEqual(0);
          expect(a.warmth).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe('greetingFor', () => {
  it('matches the visual band rather than inventing its own cutoffs', () => {
    expect(greetingFor('dawn')).toBe('Good morning');
    expect(greetingFor('day')).toBe('Good afternoon');
    expect(greetingFor('dusk')).toBe('Good evening');
    expect(greetingFor('night')).toBe('Still up');
  });
});
