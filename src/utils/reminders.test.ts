import { buildReminders, limitReminders, daysBetween, MAX_SCHEDULED } from './reminders';

/**
 * These tests guard two different things.
 *
 * The mechanical half — never schedule the past, never exceed the cap — exists
 * because both failures are invisible in development and obnoxious in the wild.
 *
 * The tone half exists because this is the only part of the app that speaks to
 * someone who is not looking at it, and it is speaking about their body. A
 * refactor that quietly turns "estimated today" into "your period starts today"
 * is a regression even though nothing crashes, so the copy rules are asserted
 * rather than left to reviewer memory.
 */

const at = (iso: string) => new Date(iso);
const NOW = at('2026-07-21T08:00:00');

describe('daysBetween', () => {
  it('counts calendar days regardless of time of day', () => {
    expect(daysBetween(at('2026-07-21T23:00:00'), at('2026-07-22T01:00:00'))).toBe(1);
    expect(daysBetween(at('2026-07-21T01:00:00'), at('2026-07-21T23:00:00'))).toBe(0);
  });

  it('is negative going backwards', () => {
    expect(daysBetween(at('2026-07-25T09:00:00'), at('2026-07-21T09:00:00'))).toBe(-4);
  });
});

describe('buildReminders', () => {
  const base = {
    nextPeriod: at('2026-07-30T00:00:00'),
    lastLogged: at('2026-07-02T00:00:00'),
    enabled: true,
    now: NOW,
  };

  it('schedules nothing when the user has notifications off', () => {
    expect(buildReminders({ ...base, enabled: false })).toEqual([]);
  });

  it('warns ahead of the estimate and on the day', () => {
    const kinds = buildReminders(base).map((r) => r.kind);
    expect(kinds).toContain('period-soon');
    expect(kinds).toContain('period-due');
  });

  it('never schedules anything in the past', () => {
    // A past-dated notification either fires immediately or vanishes, depending
    // on platform. Both are wrong, and neither is visible in development.
    const late = buildReminders({ ...base, now: at('2026-07-29T12:00:00') });
    for (const r of late) expect(r.at.getTime()).toBeGreaterThan(at('2026-07-29T12:00:00').getTime());
  });

  it('drops the early warning once it is too late for it', () => {
    const kinds = buildReminders({ ...base, now: at('2026-07-29T12:00:00') }).map((r) => r.kind);
    expect(kinds).not.toContain('period-soon');
  });

  it('follows up only when nothing was logged this cycle', () => {
    const notLogged = buildReminders(base).map((r) => r.kind);
    expect(notLogged).toContain('period-late');

    // Logged after the estimate — the cycle is accounted for, stay quiet.
    const logged = buildReminders({ ...base, lastLogged: at('2026-07-31T00:00:00') }).map((r) => r.kind);
    expect(logged).not.toContain('period-late');
  });

  it('nudges only after a long silence, and only once', () => {
    const quiet = buildReminders({ ...base, lastLogged: at('2026-05-01T00:00:00') });
    expect(quiet.filter((r) => r.kind === 'log-nudge')).toHaveLength(1);

    const recent = buildReminders(base);
    expect(recent.filter((r) => r.kind === 'log-nudge')).toHaveLength(0);
  });

  it('gives every reminder a stable id, so rescheduling replaces', () => {
    // Unstable ids would stack duplicates every time the app recomputed.
    const a = buildReminders(base).map((r) => r.id);
    const b = buildReminders(base).map((r) => r.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it('delivers at the requested local hour', () => {
    for (const r of buildReminders({ ...base, hour: 19 })) {
      expect(r.at.getHours()).toBe(19);
    }
  });

  it('copes with no logging history at all', () => {
    const fresh = buildReminders({ ...base, lastLogged: null });
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.map((r) => r.kind)).toContain('period-late');
  });

  describe('tone', () => {
    const all = () => [
      ...buildReminders(base),
      ...buildReminders({ ...base, lastLogged: at('2026-05-01T00:00:00') }),
    ];

    it('never states a prediction as fact', () => {
      // "Your period starts today" is a claim the app cannot make.
      for (const r of all()) {
        const text = `${r.title} ${r.body}`.toLowerCase();
        expect(text).not.toMatch(/your period (starts|begins|is) today/);
        expect(text).not.toMatch(/will start/);
      }
    });

    it('hedges anything about timing', () => {
      const timing = all().filter((r) => r.kind === 'period-soon' || r.kind === 'period-due');
      for (const r of timing) {
        expect(`${r.title} ${r.body}`.toLowerCase()).toMatch(/estimate|about|around/);
      }
    });

    it('never blames the user for not logging', () => {
      for (const r of all()) {
        const text = `${r.title} ${r.body}`.toLowerCase();
        expect(text).not.toMatch(/don'?t forget|you forgot|you missed|you should|make sure/);
      }
    });

    it('never implies something is medically wrong when a period is late', () => {
      const late = all().find((r) => r.kind === 'period-late');
      const text = `${late?.title} ${late?.body}`.toLowerCase();
      expect(text).not.toMatch(/concern|worry|abnormal|problem|pregnan|doctor|see a/);
    });

    it('says something in every reminder', () => {
      for (const r of all()) {
        expect(r.title.length).toBeGreaterThan(0);
        expect(r.body.length).toBeGreaterThan(20);
      }
    });
  });
});

describe('limitReminders', () => {
  const mk = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `r${i}`,
      kind: 'period-due' as const,
      title: 't',
      body: 'b',
      at: new Date(2026, 6, 21 + (n - i)),
    }));

  it('caps how much the app may interrupt someone', () => {
    expect(limitReminders(mk(20))).toHaveLength(MAX_SCHEDULED);
  });

  it('keeps the soonest', () => {
    const out = limitReminders(mk(10));
    for (let i = 1; i < out.length; i++) {
      expect(out[i].at.getTime()).toBeGreaterThanOrEqual(out[i - 1].at.getTime());
    }
  });

  it('leaves short lists alone', () => {
    expect(limitReminders(mk(2))).toHaveLength(2);
    expect(limitReminders([])).toEqual([]);
  });
});
