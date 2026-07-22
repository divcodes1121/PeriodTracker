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
  it('keeps the canvas plain — no phase tint at all', () => {
    // Reversed deliberately. Tinting the whole canvas by phase read as a colour
    // cast over the app on a real device rather than as atmosphere, so colour
    // was pulled back to controls, the ring and the hero glow. The background
    // is now plain white / plain black, and this test stops it drifting back.
    for (const phase of PHASES) {
      const light = atmosphere({ phase, hour: 12, isDark: false });
      const dark = atmosphere({ phase, hour: 12, isDark: true });
      expect(new Set(light.canvas)).toEqual(new Set(['#FFFFFF']));
      expect(new Set(dark.canvas)).toEqual(new Set(['#000000']));
    }
  });

  it('paints no ambient blooms', () => {
    for (const phase of PHASES) {
      for (const orb of atmosphere({ phase, hour: 12, isDark: false }).orbs) {
        expect(orb).toMatch(/,\s*0\.?0*\)$/);
      }
    }
  });

  it('gives every phase a distinct glow', () => {
    const glows = PHASES.map((phase) => atmosphere({ phase, hour: 12, isDark: false }).glow);
    expect(new Set(glows).size).toBe(PHASES.length);
  });

  it('keeps the canvas identical at 3am and 3pm', () => {
    // Time of day no longer tints anything. It still moves lightAngle, which is
    // direction rather than colour.
    const seen = new Set(
      [3, 7, 13, 19].map((hour) => atmosphere({ phase: 'luteal', hour, isDark: false }).canvas.join())
    );
    expect(seen.size).toBe(1);
  });

  it('still varies the light direction through the day', () => {
    const angles = new Set([3, 7, 13, 19].map((hour) => atmosphere({ phase: 'luteal', hour, isDark: false }).lightAngle));
    expect(angles.size).toBeGreaterThan(1);
  });

  it('drops no particles into the background', () => {
    for (const phase of PHASES) {
      for (const hour of [3, 13, 23]) {
        expect(atmosphere({ phase, hour, isDark: false }).moteCount).toBe(0);
      }
    }
  });

  describe('reduced motion', () => {
    it.each(PHASES)('stops all motion for %s', (phase) => {
      const a = atmosphere({ phase, hour: 12, isDark: false, reducedMotion: true });
      expect(a.moteCount).toBe(0);
      expect(a.mote).toBe('none');
      expect(a.driftSec).toBe(Infinity);
    });

    it('changes nothing visible, since there is no ambient motion left', () => {
      const moving = atmosphere({ phase: 'ovulation', hour: 12, isDark: false });
      const still = atmosphere({ phase: 'ovulation', hour: 12, isDark: false, reducedMotion: true });
      expect(still.canvas).toEqual(moving.canvas);
      expect(still.glow).toBe(moving.glow);
    });
  });

  it('always emits four canvas stops and three orbs', () => {
    for (const phase of PHASES) {
      for (let hour = 0; hour < 24; hour += 3) {
        for (const isDark of [false, true]) {
          const a = atmosphere({ phase, hour, isDark });
          expect(a.canvas).toHaveLength(4);
          expect(a.orbs).toHaveLength(3);
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
