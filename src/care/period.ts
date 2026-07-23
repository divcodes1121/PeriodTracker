import { PeriodEntry } from '../types';
import { CheckIn } from './types';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE GATE — is today a period day?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Today's Care unlocks only during a logged period. That is a product decision
 * with a real cost, so it is worth being explicit about why it is right:
 *
 *   • **It keeps the feature meaningful.** A daily wellness check-in available
 *     every day of the month becomes a habit tracker, and habit trackers are
 *     things people feel guilty about abandoning. Available five days in
 *     twenty-eight, it stays an event.
 *   • **The advice is period-specific.** Iron for heavy flow, heat for cramps,
 *     "rest is the plan today" — none of it makes sense on day 19.
 *   • **The locked card is discovery, not a tease.** It says when it opens, so
 *     a new user learns the feature exists before they need it, and finds it
 *     waiting on the day they do.
 *
 * The unlock is driven by **logged** period entries, never by predictions. A
 * predicted period that has not started is not a period, and unlocking on a
 * guess would put "how heavy is your flow?" in front of someone who is not
 * bleeding.
 */

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/**
 * Is `date` inside a logged period?
 *
 * An entry with no `endDate` is an open period — it counts from its start up to
 * `assumeLength` days, so someone who logs the first day and then forgets is
 * still let in on day two. Being locked out of a wellness feature *because you
 * did not do more admin while bleeding* would be a bleak thing to ship.
 */
export function isPeriodDay(
  date: Date,
  entries: PeriodEntry[],
  assumeLength = 7
): boolean {
  const day = startOfDay(date).getTime();
  return entries.some((e) => {
    const start = startOfDay(e.startDate).getTime();
    const end = e.endDate
      ? startOfDay(e.endDate).getTime()
      : start + (assumeLength - 1) * 86_400_000;
    return day >= start && day <= end;
  });
}

/** Which day of the current period `date` is. 1-based; 0 when outside one. */
export function periodDayNumber(date: Date, entries: PeriodEntry[], assumeLength = 7): number {
  const day = startOfDay(date).getTime();
  for (const e of entries) {
    const start = startOfDay(e.startDate).getTime();
    const end = e.endDate
      ? startOfDay(e.endDate).getTime()
      : start + (assumeLength - 1) * 86_400_000;
    if (day >= start && day <= end) {
      return Math.floor((day - start) / 86_400_000) + 1;
    }
  }
  return 0;
}

/** Today's check-in, if one exists. */
export function checkInFor(date: Date, checkIns: CheckIn[]): CheckIn | undefined {
  return checkIns.find((c) => isSameDay(c.date, date));
}

/**
 * The next predicted start, for the locked card's copy.
 *
 * Returns null rather than guessing when there is nothing to go on — "Available
 * during your next period" is a fine thing to say without a date attached, and
 * inventing one from a single logged cycle would be worse than saying nothing.
 */
export function daysUntilNextPeriod(
  date: Date,
  entries: PeriodEntry[],
  cycleLength: number
): number | null {
  if (entries.length === 0) return null;
  const latest = entries.reduce((a, b) => (a.startDate > b.startDate ? a : b));
  const next = startOfDay(latest.startDate).getTime() + cycleLength * 86_400_000;
  const diff = Math.ceil((next - startOfDay(date).getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}
