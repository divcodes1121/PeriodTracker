import {
  ESCAPES,
  RAIN_ENVIRONMENTS,
  environmentForCatches,
  recommendEscape,
  summarizeResets,
} from './tinyEscapes';

describe('escape registry', () => {
  it('has unique ids', () => {
    // Deliberately not asserting a count: the collection is curated and scenes
    // come and go. Uniqueness is the invariant that actually matters, since ids
    // key both ESCAPE_COMPONENTS and ESCAPE_PREVIEWS.
    const ids = ESCAPES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('can recommend only escapes that exist', () => {
    // recommendEscape returning a retired id would navigate to a blank player.
    const ids = new Set(ESCAPES.map((e) => e.id));
    for (let mood = 1; mood <= 5; mood++) {
      for (let stress = 1; stress <= 5; stress++) {
        const rec = recommendEscape(mood, stress);
        if (rec !== null) expect(ids).toContain(rec);
      }
    }
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

  it('suggests slowing down for low mood', () => {
    // Was Dandelion until that scene was retired. The registry test below is
    // what actually protects this: a recommendation must always resolve to a
    // scene that exists, or the player opens blank.
    expect(recommendEscape(2, 3)).toBe('zen');
    expect(recommendEscape(1, 1)).toBe('zen');
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

describe('environmentForCatches', () => {
  it('starts every session in the Fresh Meadow', () => {
    expect(environmentForCatches(0).id).toBe('fresh');
    expect(environmentForCatches(-5).id).toBe('fresh');
  });

  it('ends the journey in the Moonlit Garden', () => {
    const last = RAIN_ENVIRONMENTS[RAIN_ENVIRONMENTS.length - 1];
    expect(last.id).toBe('moonlit');
    expect(environmentForCatches(last.at).id).toBe('moonlit');
    expect(environmentForCatches(10000).id).toBe('moonlit');
  });

  it('advances exactly at each threshold', () => {
    for (let i = 1; i < RAIN_ENVIRONMENTS.length; i++) {
      const env = RAIN_ENVIRONMENTS[i];
      expect(environmentForCatches(env.at - 1).id).toBe(RAIN_ENVIRONMENTS[i - 1].id);
      expect(environmentForCatches(env.at).id).toBe(env.id);
    }
  });

  it('only ever moves forward — beauty ramps, difficulty never does', () => {
    const order = RAIN_ENVIRONMENTS.map((e) => e.id);
    let prevIndex = 0;
    for (let catches = 0; catches <= 200; catches++) {
      const index = order.indexOf(environmentForCatches(catches).id);
      expect(index).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = index;
    }
  });

  it('keeps thresholds strictly increasing with unique ids', () => {
    const ids = RAIN_ENVIRONMENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < RAIN_ENVIRONMENTS.length; i++) {
      expect(RAIN_ENVIRONMENTS[i].at).toBeGreaterThan(RAIN_ENVIRONMENTS[i - 1].at);
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

