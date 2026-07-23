import { atmosphere, timeBand, greetingFor, mix, PhaseKey, TimeBand } from './atmosphere';

/**
 * The atmosphere is the one place colour becomes semantic, so its promises are
 * worth pinning down. These tests encode the three failure modes this module
 * has actually hit in the past:
 *
 *   1. Someone tunes one phase and silently collapses it onto another.
 *   2. Someone "simplifies" the canvas back to flat white, which is what
 *      forced borders onto every card the last time it happened.
 *   3. Someone implements reduced motion by removing the colour along with the
 *      movement, which punishes the user for an accessibility setting.
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

/** Relative luminance, for "is this canvas actually light/dark" assertions. */
function lum(hex: string): number {
  const h = hex.replace('#', '');
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * ch(parseInt(h.slice(0, 2), 16)) +
    0.7152 * ch(parseInt(h.slice(2, 4), 16)) +
    0.0722 * ch(parseInt(h.slice(4, 6), 16))
  );
}

/** Crude perceptual distance between two hexes — enough to prove distinctness. */
function dist(a: string, b: string): number {
  const p = (h: string) => {
    const s = h.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  const [ar, ag, ab] = p(a);
  const [br, bg, bb] = p(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

describe('mix', () => {
  it('returns the endpoints exactly', () => {
    expect(mix('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 1)).toBe('#ffffff');
  });

  it('clamps out-of-range amounts instead of producing garbage', () => {
    expect(mix('#000000', '#FFFFFF', -3)).toBe('#000000');
    expect(mix('#000000', '#FFFFFF', 9)).toBe('#ffffff');
  });

  it('lands halfway at t=0.5', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });
});

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

describe('atmosphere canvas', () => {
  it('is never plain white or plain black', () => {
    // The rule the whole palette rests on. A flat #FFF canvas is what forced
    // hairline borders onto every card last time, because a white card on a
    // white page cannot be separated by shadow alone.
    for (const phase of PHASES) {
      for (const hour of [3, 7, 13, 19, 22]) {
        for (const isDark of [false, true]) {
          for (const stop of atmosphere({ phase, hour, isDark }).canvas) {
            expect(stop).not.toBe('#ffffff');
            expect(stop).not.toBe('#000000');
          }
        }
      }
    }
  });

  it('is a real gradient — the bottom is never identical to the top', () => {
    for (const phase of PHASES) {
      for (const isDark of [false, true]) {
        const { canvas } = atmosphere({ phase, hour: 13, isDark });
        expect(canvas[0]).not.toBe(canvas[3]);
      }
    }
  });

  it('stays light in light mode and dark in dark mode', () => {
    for (const phase of PHASES) {
      for (const hour of [3, 13, 19]) {
        for (const stop of atmosphere({ phase, hour, isDark: false }).canvas) {
          expect(lum(stop)).toBeGreaterThan(0.75);
        }
        for (const stop of atmosphere({ phase, hour, isDark: true }).canvas) {
          expect(lum(stop)).toBeLessThan(0.05);
        }
      }
    }
  });

  it('gives every phase a visibly distinct canvas', () => {
    // The failure this catches: tuning one phase until it matches another and
    // nobody noticing, which turns the whole module into decoration.
    for (const isDark of [false, true]) {
      const bottoms = PHASES.map((phase) => atmosphere({ phase, hour: 19, isDark }).canvas[3]);
      for (let i = 0; i < bottoms.length; i++) {
        for (let j = i + 1; j < bottoms.length; j++) {
          expect(dist(bottoms[i], bottoms[j])).toBeGreaterThan(3);
        }
      }
    }
  });

  it('pools the phase tint downward rather than spreading it evenly', () => {
    // Direction is what makes the wash read as light instead of as a filter.
    // The bottom stop must sit further from its untinted base than the top.
    for (const phase of PHASES) {
      const { canvas } = atmosphere({ phase, hour: 22, isDark: false });
      expect(dist(canvas[3], canvas[2])).toBeGreaterThan(0);
      // Top stop is nearly neutral warm-white; bottom carries the colour.
      expect(dist(canvas[0], canvas[3])).toBeGreaterThan(6);
    }
  });

  it('keeps day the least-tinted band', () => {
    // Midday is the reference white. Phase should be most visible at the hours
    // the app is actually opened, and least visible when the eye is calibrated.
    for (const phase of PHASES) {
      const day = atmosphere({ phase, hour: 13, isDark: false });
      const dusk = atmosphere({ phase, hour: 19, isDark: false });
      expect(alphaOf(day.glow)).toBeLessThan(alphaOf(dusk.glow));
    }
  });
});

describe('atmosphere blooms and glow', () => {
  it('runs higher alpha in dark mode, where tint has to add light', () => {
    for (const phase of PHASES) {
      const light = atmosphere({ phase, hour: 13, isDark: false });
      const dark = atmosphere({ phase, hour: 13, isDark: true });
      expect(alphaOf(dark.orbs[0])).toBeGreaterThan(alphaOf(light.orbs[0]));
      expect(alphaOf(dark.glow)).toBeGreaterThan(alphaOf(light.glow));
    }
  });

  it('orders the three blooms from strongest to faintest', () => {
    // Three equal blobs read as three blobs. The ramp is what turns them into
    // a single field of moving light.
    for (const phase of PHASES) {
      const { orbs } = atmosphere({ phase, hour: 13, isDark: false });
      expect(alphaOf(orbs[0])).toBeGreaterThan(alphaOf(orbs[1]));
      expect(alphaOf(orbs[1])).toBeGreaterThan(alphaOf(orbs[2]));
    }
  });

  it('gives every phase a distinct glow', () => {
    const glows = PHASES.map((phase) => atmosphere({ phase, hour: 12, isDark: false }).glow);
    expect(new Set(glows).size).toBe(PHASES.length);
  });

  it('exposes a solid phase hue alongside the alpha-carrying glow', () => {
    for (const phase of PHASES) {
      expect(atmosphere({ phase, hour: 12, isDark: false }).hue).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('atmosphere particles', () => {
  it('falls petals in the two settling phases and pollen in the two rising ones', () => {
    expect(atmosphere({ phase: 'menstrual', hour: 13, isDark: false }).mote).toBe('petal');
    expect(atmosphere({ phase: 'luteal', hour: 13, isDark: false }).mote).toBe('petal');
    expect(atmosphere({ phase: 'follicular', hour: 13, isDark: false }).mote).toBe('pollen');
    expect(atmosphere({ phase: 'ovulation', hour: 13, isDark: false }).mote).toBe('pollen');
  });

  it('swaps to stars on a dark night — moonlight wins over petals', () => {
    expect(atmosphere({ phase: 'menstrual', hour: 23, isDark: true }).mote).toBe('star');
    // ...but only when the canvas is dark. A crisp white point on warm paper
    // reads as dust on the user's screen, not as a star.
    expect(atmosphere({ phase: 'menstrual', hour: 23, isDark: false }).mote).toBe('petal');
  });

  it('always emits a count that matches the kind', () => {
    for (const phase of PHASES) {
      for (const hour of [3, 13, 23]) {
        const a = atmosphere({ phase, hour, isDark: true });
        expect(a.moteCount > 0).toBe(a.mote !== 'none');
      }
    }
  });
});

describe('reduced motion', () => {
  it.each(PHASES)('stops all motion for %s', (phase) => {
    const a = atmosphere({ phase, hour: 12, isDark: false, reducedMotion: true });
    expect(a.moteCount).toBe(0);
    expect(a.mote).toBe('none');
    expect(a.driftSec).toBe(Infinity);
  });

  it('removes the movement but keeps the colour', () => {
    // Someone who gets motion sick still deserves the app to feel like evening
    // at 9pm. Reduced motion is not reduced beauty.
    for (const phase of PHASES) {
      const moving = atmosphere({ phase, hour: 19, isDark: false });
      const still = atmosphere({ phase, hour: 19, isDark: false, reducedMotion: true });
      expect(still.canvas).toEqual(moving.canvas);
      expect(still.glow).toBe(moving.glow);
      expect(still.orbs).toEqual(moving.orbs);
    }
  });
});

describe('atmosphere shape', () => {
  it('always emits four canvas stops and three orbs, in range', () => {
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
          for (const stop of a.canvas) expect(stop).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });

  it('varies the light direction through the day', () => {
    const angles = new Set(
      [3, 7, 13, 19].map((hour) => atmosphere({ phase: 'luteal', hour, isDark: false }).lightAngle)
    );
    expect(angles.size).toBeGreaterThan(1);
  });

  it('drifts slowest in luteal and fastest at ovulation', () => {
    const at = (phase: PhaseKey) => atmosphere({ phase, hour: 13, isDark: false }).driftSec;
    expect(at('luteal')).toBeGreaterThan(at('menstrual'));
    expect(at('ovulation')).toBeLessThan(at('follicular'));
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
