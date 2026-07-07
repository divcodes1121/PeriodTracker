/**
 * Theme palettes. Brand colors (primary, phase colors, semantic) stay shared
 * via constants/COLORS; only the surface/text/atmosphere values change between
 * light and dark. Components read these through the useTheme() hook so a theme
 * switch re-renders everything.
 */

export interface ThemePalette {
  text: string;
  textSecondary: string;
  textTertiary: string;

  // Aurora background
  auroraBackdrop: string[];
  auroraOrbs: string[];
  waveA: string;
  waveB: string;
  droplet: string;
  dropletBorder: string;

  // Glass surfaces
  glassTint: string;
  glassBorder: string;
  glassHighlight: string;
  blurTint: 'light' | 'dark';

  // Controls
  inputBg: string;
  inputBorder: string;
  trackNeutral: string;
  divider: string;
  pillBg: string;
  pillBorder: string;

  // Tab bar
  tabBarBg: string;
  tabBarBorder: string;
}

export const lightPalette: ThemePalette = {
  text: '#1A1A1A',
  textSecondary: '#5A5A66',
  textTertiary: '#9E9E9E',

  auroraBackdrop: ['#FFF1F6', '#FDE7F0', '#F3E9FF', '#EAF1FF'],
  auroraOrbs: ['rgba(255,107,157,0.45)', 'rgba(155,89,182,0.38)', 'rgba(255,165,0,0.30)'],
  waveA: 'rgba(155,89,182,0.10)',
  waveB: 'rgba(255,107,157,0.12)',
  droplet: 'rgba(255,255,255,0.6)',
  dropletBorder: 'rgba(255,255,255,0.8)',

  glassTint: 'rgba(255,255,255,0.55)',
  glassBorder: 'rgba(255,255,255,0.65)',
  glassHighlight: 'rgba(255,255,255,0.9)',
  blurTint: 'light',

  inputBg: 'rgba(255,255,255,0.7)',
  inputBorder: 'rgba(255,255,255,0.8)',
  trackNeutral: 'rgba(0,0,0,0.06)',
  divider: 'rgba(0,0,0,0.06)',
  pillBg: 'rgba(255,255,255,0.5)',
  pillBorder: 'rgba(255,255,255,0.7)',

  tabBarBg: 'rgba(255,255,255,0.6)',
  tabBarBorder: 'rgba(255,255,255,0.7)',
};

export const darkPalette: ThemePalette = {
  text: '#F5F5F7',
  textSecondary: '#B8B8C4',
  textTertiary: '#7A7A88',

  auroraBackdrop: ['#2A1121', '#231027', '#1A1030', '#121229'],
  auroraOrbs: ['rgba(255,107,157,0.28)', 'rgba(155,89,182,0.30)', 'rgba(255,165,0,0.16)'],
  waveA: 'rgba(155,89,182,0.20)',
  waveB: 'rgba(255,107,157,0.16)',
  droplet: 'rgba(255,255,255,0.22)',
  dropletBorder: 'rgba(255,255,255,0.3)',

  glassTint: 'rgba(38,24,44,0.5)',
  glassBorder: 'rgba(255,255,255,0.14)',
  glassHighlight: 'rgba(255,255,255,0.18)',
  blurTint: 'dark',

  inputBg: 'rgba(255,255,255,0.08)',
  inputBorder: 'rgba(255,255,255,0.16)',
  trackNeutral: 'rgba(255,255,255,0.12)',
  divider: 'rgba(255,255,255,0.1)',
  pillBg: 'rgba(255,255,255,0.08)',
  pillBorder: 'rgba(255,255,255,0.16)',

  tabBarBg: 'rgba(28,18,34,0.7)',
  tabBarBorder: 'rgba(255,255,255,0.12)',
};

export const palettes = { light: lightPalette, dark: darkPalette };
