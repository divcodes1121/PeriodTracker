import { useTheme } from './useTheme';
import { PHASE_DEEP, PHASE_INK, CYCLE_PHASES } from '../constants';

type PhaseKey = keyof typeof CYCLE_PHASES;

const key = (phase?: string | null) => (phase ?? '').toLowerCase() as PhaseKey;

/**
 * Returns a phase color safe for the current surface.
 *
 * The brand pastels only reach ~2–3:1 on a white card, which fails WCAG 1.4.11
 * for a colored indicator. In light mode we swap in the deepened variant; in
 * dark mode the pastels already clear the threshold against the dark card, so
 * they're used as-is (and read better).
 */
export function usePhaseColor(): (phase: string | undefined | null) => string {
  const { isDark } = useTheme();
  return (phase) => {
    if (!phase) return isDark ? '#9A9AA6' : '#8A8A94';
    const k = key(phase);
    if (isDark) return CYCLE_PHASES[k]?.color ?? CYCLE_PHASES.menstrual.color;
    return PHASE_DEEP[k] ?? CYCLE_PHASES[k]?.color ?? CYCLE_PHASES.menstrual.color;
  };
}

/**
 * Phase ink for filled surfaces that carry white text (theme-independent, since
 * the fill is opaque). White clears AA (≥4.9:1) on every value.
 */
export function phaseInk(phase?: string | null): string {
  return PHASE_INK[key(phase)] ?? PHASE_INK.menstrual;
}
