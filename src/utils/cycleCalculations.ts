import { startOfDay, endOfDay, addDays, differenceInDays, format } from 'date-fns';
import { CyclePhase, CycleStats } from '../types';
import { CYCLE_PHASES } from '../constants';

/**
 * Calculates the cycle phase based on day of cycle
 */
export function getCyclePhase(dayOfCycle: number): CyclePhase | null {
  for (const [key, phase] of Object.entries(CYCLE_PHASES)) {
    if (dayOfCycle >= phase.days.start && dayOfCycle <= phase.days.end) {
      return {
        name: key as any,
        startDay: phase.days.start,
        endDay: phase.days.end,
        description: phase.description,
        color: phase.color,
        expectedSymptoms: phase.symptoms,
        wellnessScore: calculateWellnessScore(key),
      };
    }
  }
  return null;
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
 * Gets the current day of cycle
 */
export function getDayOfCycle(lastPeriodStart: Date, cycleLength: number = 28): number {
  const today = new Date();
  const daysSinceStart = differenceInDays(today, lastPeriodStart);
  return (daysSinceStart % cycleLength) + 1;
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
  const ovulationDay = Math.round(cycleLength / 2);
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
  const ovulationDay = Math.round(cycleLength / 2);
  return addDays(lastPeriodStart, ovulationDay);
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
  const ovDay = Math.round(avgCycleLength / 2);

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
