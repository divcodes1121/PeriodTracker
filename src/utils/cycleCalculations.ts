import { startOfDay, endOfDay, addDays, differenceInDays, format } from 'date-fns';
import { CyclePhase, CycleStats, PeriodEntry, User } from '../types';
import { CYCLE_PHASES } from '../constants';

const DAY_MS = 1000 * 60 * 60 * 24;

/** Always-positive modulo, so cycle-day math works for dates before day 1. */
function positiveMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Ovulation day for a given cycle length, using the clinically standard
 * fixed ~14-day luteal phase (ovulation ≈ cycleLength − 14) rather than
 * naively halving the cycle. For a 28-day cycle this is day 14; for a
 * 35-day cycle, day 21; for a 21-day cycle, day 7.
 */
export function getOvulationDay(cycleLength: number = 28): number {
  return clamp(Math.round(cycleLength - 14), 3, cycleLength - 1);
}

export type PhaseKey = keyof typeof CYCLE_PHASES;

export interface PhaseRange {
  key: PhaseKey;
  startDay: number;
  endDay: number;
  color: string;
}

/**
 * The phase boundaries for a given cycle, derived rather than hardcoded to 28
 * days. Single source of truth: `getCyclePhase` looks up through this, and the
 * cycle timeline ring draws these exact arcs, so the visual can never drift
 * from the math.
 *
 * Degenerate ranges (e.g. no follicular window on a very short cycle) are
 * filtered out, so the result always covers 1..cycleLength without overlap.
 */
export function getPhaseRanges(cycleLength: number = 28, periodLength: number = 5): PhaseRange[] {
  const period = clamp(Math.round(periodLength), 2, 7);
  const ovulation = clamp(getOvulationDay(cycleLength), period + 2, cycleLength - 1);

  return (
    [
      { key: 'menstrual' as const, startDay: 1, endDay: period },
      { key: 'follicular' as const, startDay: period + 1, endDay: ovulation - 2 },
      { key: 'ovulation' as const, startDay: ovulation - 1, endDay: ovulation + 1 },
      { key: 'luteal' as const, startDay: ovulation + 2, endDay: cycleLength },
    ] satisfies { key: PhaseKey; startDay: number; endDay: number }[]
  )
    .filter((r) => r.endDay >= r.startDay && r.startDay <= cycleLength)
    .map((r) => ({ ...r, endDay: Math.min(r.endDay, cycleLength), color: CYCLE_PHASES[r.key].color }));
}

/**
 * Calculates the cycle phase for a day of cycle, scaled to the user's actual
 * cycle and period length.
 */
export function getCyclePhase(
  dayOfCycle: number,
  cycleLength: number = 28,
  periodLength: number = 5
): CyclePhase | null {
  if (dayOfCycle < 1 || dayOfCycle > cycleLength) return null;

  const ranges = getPhaseRanges(cycleLength, periodLength);
  const match =
    ranges.find((r) => dayOfCycle >= r.startDay && dayOfCycle <= r.endDay) ??
    ranges[ranges.length - 1];

  const phase = CYCLE_PHASES[match.key];
  return {
    name: match.key,
    startDay: match.startDay,
    endDay: match.endDay,
    description: phase.description,
    color: phase.color,
    expectedSymptoms: phase.symptoms,
    wellnessScore: calculateWellnessScore(match.key),
  };
}

/**
 * Calculates wellness score for the phase (1-10)
 */
export function calculateWellnessScore(phase: string): number {
  const scores: Record<string, number> = {
    menstrual: 4,
    follicular: 8,
    ovulation: 9,
    luteal: 5,
  };
  return scores[phase] || 5;
}

/**
 * Gets the current day of cycle (1-based). Works for any "today", including
 * before the reference start, thanks to a positive modulo.
 */
export function getDayOfCycle(lastPeriodStart: Date, cycleLength: number = 28): number {
  const today = new Date();
  const daysSinceStart = differenceInDays(startOfDay(today), startOfDay(lastPeriodStart));
  return positiveMod(daysSinceStart, cycleLength) + 1;
}

/**
 * Cycle day for an arbitrary date relative to a reference period start.
 * Returns a value in 1..cycleLength for every date (past or future).
 */
export function getCycleDayForDate(
  date: Date,
  lastPeriodStart: Date,
  cycleLength: number = 28
): number {
  const days = differenceInDays(startOfDay(date), startOfDay(lastPeriodStart));
  return positiveMod(days, cycleLength) + 1;
}

/**
 * Predicts next period date
 */
export function getPredictedNextPeriod(lastPeriodStart: Date, cycleLength: number = 28): Date {
  return addDays(lastPeriodStart, cycleLength);
}

/**
 * Calculates fertility window (typically 5 days before ovulation + ovulation day)
 */
export function getFertilityWindow(
  lastPeriodStart: Date,
  cycleLength: number = 28
): { start: Date; end: Date; daysFromNow: number } {
  const ovulationDay = getOvulationDay(cycleLength);
  const fertilityStart = addDays(lastPeriodStart, ovulationDay - 5);
  const fertilityEnd = addDays(lastPeriodStart, ovulationDay + 1);
  const daysFromNow = differenceInDays(fertilityStart, new Date());

  return {
    start: fertilityStart,
    end: fertilityEnd,
    daysFromNow,
  };
}

/**
 * Calculates ovulation date
 */
export function getOvulationDate(lastPeriodStart: Date, cycleLength: number = 28): Date {
  return addDays(lastPeriodStart, getOvulationDay(cycleLength));
}

/**
 * Derives cycle lengths from logged period entries as the gap (in days)
 * between consecutive period *starts* — NOT the duration of each period.
 * Implausible gaps (a double-log, or a months-long tracking break) are
 * filtered out so one bad entry can't skew predictions.
 */
export function buildCycleLengths(entries: PeriodEntry[]): number[] {
  const starts = entries
    .map((entry) => entry.startDate)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  return starts
    .slice(1)
    .map((start, index) => Math.round((start.getTime() - starts[index].getTime()) / DAY_MS))
    .filter((length) => length >= 15 && length <= 60);
}

/**
 * The effective cycle to drive predictions from. Logged period entries are the
 * source of truth once they exist; the onboarding values are only a fallback
 * for a user who hasn't logged a period yet. Without this, the whole app would
 * extrapolate forever from the single date typed during onboarding.
 */
export function deriveCycleContext(
  user: Pick<User, 'lastPeriodStart' | 'cycleLength' | 'periodLength'>,
  entries: PeriodEntry[]
): { lastPeriodStart: Date; cycleLength: number; periodLength: number } {
  const starts = entries
    .map((e) => e.startDate)
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime());

  const cycleLengths = buildCycleLengths(entries);
  const lastPeriodStart = starts[0] ?? user.lastPeriodStart;
  const cycleLength =
    cycleLengths.length > 0 ? calculateAverageCycleLength(cycleLengths) : user.cycleLength;

  return {
    lastPeriodStart,
    cycleLength,
    periodLength: user.periodLength,
  };
}

/**
 * Calculates average cycle length from array of cycle lengths
 */
export function calculateAverageCycleLength(cycles: number[]): number {
  if (cycles.length === 0) return 28;
  const sum = cycles.reduce((a, b) => a + b, 0);
  return Math.round(sum / cycles.length);
}

/**
 * Calculates cycle variability (standard deviation)
 */
export function calculateCycleVariability(cycles: number[]): number {
  if (cycles.length < 2) return 0;
  const avg = calculateAverageCycleLength(cycles);
  const squareDiffs = cycles.map((cycle) => Math.pow(cycle - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / cycles.length;
  return Math.round(Math.sqrt(avgSquareDiff));
}

/**
 * Detects irregular cycles
 */
export function detectIrregularity(cycles: number[]): boolean {
  if (cycles.length < 3) return false;
  const variability = calculateCycleVariability(cycles);
  return variability > 7; // More than 7 days variation
}

/**
 * Generates cycle statistics
 */
export function generateCycleStats(
  lastPeriodStart: Date,
  periodLength: number,
  cycles: number[]
): CycleStats {
  const avgCycleLength = calculateAverageCycleLength(cycles);
  const variability = calculateCycleVariability(cycles);
  const ovDay = getOvulationDay(avgCycleLength);

  return {
    averageCycleLength: avgCycleLength,
    cycleVariability: variability,
    periodLength,
    ovulationDay: ovDay,
    fertilityWindowStart: ovDay - 5,
    fertilityWindowEnd: ovDay + 1,
    predictedNextPeriod: getPredictedNextPeriod(lastPeriodStart, avgCycleLength),
    lastSixCycles: cycles.slice(-6),
    irregularityDetected: detectIrregularity(cycles),
  };
}

/**
 * Formats a date to a readable string
 */
export function formatDateForDisplay(date: Date): string {
  return format(date, 'EEEE, MMMM d, yyyy');
}

/**
 * Gets days until event
 */
export function daysUntil(date: Date): number {
  return Math.ceil(differenceInDays(date, new Date()));
}

/**
 * Formats countdown text
 */
export function formatCountdown(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `In ${days} days`;
}

/**
 * Checks if date is within range
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const checkDate = startOfDay(date);
  const startDate = startOfDay(start);
  const endDate = endOfDay(end);
  return checkDate >= startDate && checkDate <= endDate;
}

/**
 * Gets pregnancy probability for a date
 */
export function getPregnancyProbability(
  date: Date,
  fertilityWindowStart: Date,
  fertilityWindowEnd: Date
): number {
  if (isDateInRange(date, fertilityWindowStart, fertilityWindowEnd)) {
    // Peak fertility around ovulation (day 14 in a 28-day cycle)
    const daysSinceStart = differenceInDays(date, fertilityWindowStart);
    const windowLength = differenceInDays(fertilityWindowEnd, fertilityWindowStart);
    const midpoint = windowLength / 2;
    const distanceFromMidpoint = Math.abs(daysSinceStart - midpoint);
    return Math.max(0, 100 - distanceFromMidpoint * 15);
  }
  return 0;
}

/**
 * Validates cycle information
 */
export function validateCycleInfo(cycleLength: number, periodLength: number): boolean {
  return cycleLength >= 21 && cycleLength <= 35 && periodLength >= 2 && periodLength <= 7;
}

/**
 * Generates streak for consecutive days with logs
 */
export function calculateLoggingStreak(loggedDates: Date[]): number {
  if (loggedDates.length === 0) return 0;

  const sortedDates = [...loggedDates].sort((a, b) => b.getTime() - a.getTime());
  let streak = 0;
  let currentDate = startOfDay(new Date());

  for (const loggedDate of sortedDates) {
    const daysDiff = differenceInDays(currentDate, startOfDay(loggedDate));
    if (daysDiff === streak) {
      streak++;
      currentDate = addDays(currentDate, -1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Gets phase-specific recommendations
 */
export function getPhaseRecommendations(phase: string | null): string[] {
  const recommendations: Record<string, string[]> = {
    menstrual: [
      '🛏️ Rest and prioritize sleep',
      '💧 Stay hydrated',
      '🧘 Try gentle yoga',
      '🍫 Satisfy cravings in moderation',
      '💊 Pain relief if needed',
    ],
    follicular: [
      '💪 Intense workouts',
      '🚀 Start new projects',
      '🤝 Social activities',
      '🧠 Tackle complex tasks',
      '🎯 Set new goals',
    ],
    ovulation: [
      '👔 Important presentations',
      '💑 Quality time',
      '🏃 High-intensity exercise',
      '🗣️ Great communication skills',
      '✨ Personal projects',
    ],
    luteal: [
      '🧘 Self-care & relaxation',
      '📝 Journaling',
      '🥗 Balanced nutrition',
      '🌙 Earlier bedtime',
      '🤫 Quiet activities',
    ],
  };

  return recommendations[phase || 'luteal'] || [];
}
