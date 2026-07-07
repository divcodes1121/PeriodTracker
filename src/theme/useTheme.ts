import { useAppStore } from '../store/appStore';
import { palettes, ThemePalette } from './palette';

export interface ThemeApi {
  theme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemePalette;
  toggle: () => void;
  setTheme: (t: 'light' | 'dark') => void;
}

/**
 * Active theme + palette, backed by the persisted store. Any component that
 * calls this re-renders when the theme changes, so the whole UI flips together.
 */
export function useTheme(): ThemeApi {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const isDark = theme === 'dark';
  return {
    theme,
    isDark,
    colors: palettes[theme],
    toggle: () => setTheme(isDark ? 'light' : 'dark'),
    setTheme,
  };
}
