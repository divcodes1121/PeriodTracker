/**
 * Reminder scheduling — pure logic.
 *
 * RN-free so it runs under the node Jest project. The `expo-notifications`
 * calls live in services/notifications.ts; everything about *what* to schedule
 * and *when* is decided here, where it can be tested.
 *
 * TONE IS A DESIGN CONSTRAINT, NOT COPY POLISH. This is the only part of the
 * app that speaks to someone who is not looking at it, and it is speaking about
 * their body. So:
 *   - Never announce a prediction as fact ("Your period starts today").
 *     Predictions are estimates and being wrong about this is upsetting.
 *   - Never nag about missed logging. A tracker that guilts you is one you
 *     delete.
 *   - Never mention fertility unless the user opted into it, and never frame it
 *     as an instruction.
 *   - Cap the total. Two notifications a cycle is a companion; six is spam.
 */

export type ReminderKind = 'period-soon' | 'period-due' | 'period-late' | 'log-nudge';

export interface Reminder {
  /** Stable per-cycle id, so rescheduling replaces rather than duplicates. */
  id: string;
  kind: ReminderKind;
  title: string;
  body: string;
  /** When it should fire. */
  at: Date;
}

export interface ReminderInput {
  /** Predicted start of the next period. */
  nextPeriod: Date;
  /** Most recent logged period start, or null if nothing logged yet. */
  lastLogged: Date | null;
  /** Whether the user has notifications switched on at all. */
  enabled: boolean;
  /** Local hour to deliver at, 0–23. */
  hour?: number;
  now?: Date;
}

const DAY = 86400000;

/** Same calendar day at a chosen local hour. */
function atHour(d: Date, hour: number): Date {
  const out = new Date(d);
  out.setHours(hour, 0, 0, 0);
  return out;
}

/** Whole days from a to b, positive if b is later. */
export function daysBetween(a: Date, b: Date): number {
  const A = new Date(a);
  const B = new Date(b);
  A.setHours(0, 0, 0, 0);
  B.setHours(0, 0, 0, 0);
  return Math.round((B.getTime() - A.getTime()) / DAY);
}

/**
 * The reminders that should be scheduled right now.
 *
 * Only ever returns things in the future — a notification scheduled for a
 * moment that has passed either fires instantly or is silently dropped,
 * depending on platform, and both are wrong.
 */
export function buildReminders({
  nextPeriod,
  lastLogged,
  enabled,
  hour = 9,
  now = new Date(),
}: ReminderInput): Reminder[] {
  if (!enabled) return [];

  const out: Reminder[] = [];
  const cycleTag = nextPeriod.toISOString().slice(0, 10);

  // Two days out: enough warning to put something in a bag.
  const soon = atHour(new Date(nextPeriod.getTime() - 2 * DAY), hour);
  if (soon > now) {
    out.push({
      id: `period-soon-${cycleTag}`,
      kind: 'period-soon',
      title: 'Around two days out',
      // "Estimated" is load-bearing: this is a guess, and saying so protects
      // the user from planning around a number the app invented.
      body: 'Your next period is estimated in about two days. Worth having what you need nearby.',
      at: soon,
    });
  }

  // The estimated day itself.
  const due = atHour(nextPeriod, hour);
  if (due > now) {
    out.push({
      id: `period-due-${cycleTag}`,
      kind: 'period-due',
      title: 'Estimated for today',
      body: 'Today is the estimate. Bodies rarely read the calendar — log it whenever it starts.',
      at: due,
    });
  }

  /**
   * Three days past the estimate with nothing logged.
   *
   * Deliberately the gentlest message in the app. A late period is a loaded
   * moment, and the notification must not imply anything is wrong, promise
   * anything, or offer advice it is not qualified to give.
   */
  const late = atHour(new Date(nextPeriod.getTime() + 3 * DAY), hour);
  const nothingSinceEstimate = !lastLogged || lastLogged < nextPeriod;
  if (late > now && nothingSinceEstimate) {
    out.push({
      id: `period-late-${cycleTag}`,
      kind: 'period-late',
      title: 'Still tracking',
      body: 'Nothing logged yet this cycle. Cycles shift for all sorts of ordinary reasons — log whenever you are ready.',
      at: late,
    });
  }

  // A single nudge if the app has not seen a log in a long while. One, not a
  // series: if someone has stopped tracking, more notifications will not help.
  if (lastLogged && daysBetween(lastLogged, now) >= 45) {
    const nudge = atHour(new Date(now.getTime() + DAY), hour);
    out.push({
      id: `log-nudge-${cycleTag}`,
      kind: 'log-nudge',
      title: 'Your history is waiting',
      body: 'It has been a while since your last log. Even one entry sharpens your predictions.',
      at: nudge,
    });
  }

  return out;
}

/** Hard ceiling on how much this app is allowed to interrupt someone. */
export const MAX_SCHEDULED = 4;

/** Soonest-first, capped. Guarantees we never queue an unbounded backlog. */
export function limitReminders(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_SCHEDULED);
}
