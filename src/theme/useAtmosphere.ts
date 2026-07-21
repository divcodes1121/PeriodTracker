import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useTheme } from './useTheme';
import { atmosphere, timeBand, Atmosphere, PhaseKey, TimeBand } from './atmosphere';
import { deriveCycleContext, getDayOfCycle, getCyclePhase } from '../utils/cycleCalculations';

/**
 * Binds the pure atmosphere grading to live app state.
 *
 * Phase comes from the same deriveCycleContext() path every other screen uses,
 * so the background can never disagree with the numbers printed on top of it.
 *
 * The hour is held in state and re-checked on an interval rather than read once
 * at mount: a user who opens the app at 16:58 should watch it slide into dusk,
 * not sit in stale daylight until they force a re-render. Fifteen minutes is
 * fine granularity for a four-band grading and costs one setState an hour.
 */
export function useAtmosphere(): Atmosphere & { band: TimeBand; phase: PhaseKey } {
  const { user, periodEntries } = useAppStore();
  const { isDark } = useTheme();
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const phase = useMemo<PhaseKey>(() => {
    if (!user) return 'menstrual';
    const { lastPeriodStart, cycleLength, periodLength } = deriveCycleContext(user, periodEntries);
    const day = getDayOfCycle(lastPeriodStart, cycleLength);
    const name = getCyclePhase(day, cycleLength, periodLength)?.name;
    return (name as PhaseKey) ?? 'menstrual';
  }, [user, periodEntries]);

  return useMemo(
    () => ({
      ...atmosphere({ phase, hour, isDark }),
      band: timeBand(hour),
      phase,
    }),
    [phase, hour, isDark]
  );
}
