import { ESCAPES, recommendEscape, summarizeResets } from './tinyEscapes';

describe('escape registry', () => {
  it('has four escapes with unique ids', () => {
    const ids = ESCAPES.map((e) => e.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it('every escape declares a chrome mode for the player overlay', () => {
    for (const e of ESCAPES) {
      expect(['light', 'dark']).toContain(e.chrome);
      expect(e.hint.length).toBeGreaterThan(0);
    }
  });
});

describe('recommendEscape', () => {
  it('suggests a physical release at peak stress', () => {
    expect(recommendEscape(3, 5)).toBe('shatter');
  });

  it('suggests slowing down at elevated stress', () => {
    expect(recommendEscape(3, 4)).toBe('zen');
  });

  it('suggests gentle growth for low mood', () => {
    expect(recommendEscape(2, 3)).toBe('bloom');
    expect(recommendEscape(1, 1)).toBe('bloom');
  });

  it('peak stress outranks low mood', () => {
    expect(recommendEscape(1, 5)).toBe('shatter');
  });

  it('stays quiet on an ordinary day — the suggestion must stay rare', () => {
    expect(recommendEscape(3, 3)).toBeNull();
    expect(recommendEscape(5, 1)).toBeNull();
  });

  it('every recommendation resolves to a real escape', () => {
    const ids = new Set(ESCAPES.map((e) => e.id));
    for (let mood = 1; mood <= 5; mood++) {
      for (let stress = 1; stress <= 5; stress++) {
        const rec = recommendEscape(mood, stress);
        if (rec !== null) expect(ids.has(rec)).toBe(true);
      }
    }
  });
});

describe('summarizeResets', () => {
  const s = (response: 'better' | 'same' | 'no' | null) => ({ response });

  it('handles no sessions', () => {
    expect(summarizeResets([])).toEqual({ answered: 0, better: 0, rate: 0 });
  });

  it('ignores sessions closed without an answer', () => {
    expect(summarizeResets([s(null), s('better')])).toEqual({ answered: 1, better: 1, rate: 1 });
  });

  it('computes the better-rate across answered sessions', () => {
    const out = summarizeResets([s('better'), s('same'), s('no'), s('better')]);
    expect(out.answered).toBe(4);
    expect(out.better).toBe(2);
    expect(out.rate).toBeCloseTo(0.5);
  });
});
