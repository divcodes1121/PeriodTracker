import type { IconName } from '../components/Icon';
import type { ResetSession } from '../types';

/**
 * Tiny Escapes — metadata and pure logic.
 *
 * Kept RN-free (type-only imports) so the recommendation and summary logic run
 * under the node Jest project. The component map lives in `src/escapes/`.
 */

export type EscapeChrome = 'light' | 'dark';

export interface EscapeMeta {
  id: string;
  title: string;
  tagline: string;
  /** One-line instruction shown briefly when the scene opens. */
  hint: string;
  icon: IconName;
  accent: string;
  /** 'light' = white chrome (dark scene); 'dark' = ink chrome (light scene). */
  chrome: EscapeChrome;
}

export const ESCAPES: EscapeMeta[] = [
  {
    id: 'zen',
    title: 'Zen Garden',
    tagline: 'Rake the sand. Let it settle.',
    hint: 'Draw slow lines in the sand',
    icon: 'wind',
    accent: '#8DB596',
    chrome: 'dark',
  },
  {
    id: 'bloom',
    title: 'Bloom Garden',
    tagline: 'Grow something soft.',
    hint: 'Touch anywhere to bloom',
    icon: 'flower',
    accent: '#D97C9B',
    chrome: 'light',
  },
  {
    id: 'bubbles',
    title: 'Bubbles',
    tagline: 'Pop. Breathe. Repeat.',
    hint: 'Pop the bubbles',
    icon: 'bubble',
    accent: '#7C9BD9',
    chrome: 'light',
  },
  {
    id: 'shatter',
    title: 'Shatter',
    tagline: 'For days it needs somewhere to go.',
    hint: 'Tap the crystal',
    icon: 'crystal',
    accent: '#B89AD8',
    chrome: 'light',
  },
];

export const DURATIONS = [
  { label: '½ min', sec: 30 },
  { label: '2 min', sec: 120 },
  { label: '5 min', sec: 300 },
];

/**
 * Which escape to suggest after a mood check-in. Emotional mapping, not
 * engagement optimisation: peak stress wants a physical release (Shatter),
 * elevated stress wants slowing down (Zen), low mood wants gentle growth
 * (Bloom). Returns null when nothing should be suggested — the suggestion must
 * stay rare enough to mean something.
 */
export function recommendEscape(mood: number, stress: number): string | null {
  if (stress >= 5) return 'shatter';
  if (stress >= 4) return 'zen';
  if (mood <= 2) return 'bloom';
  return null;
}

export interface ResetSummary {
  answered: number;
  better: number;
  rate: number;
}

/** Aggregates post-session check-outs for the AI Insights screen. */
export function summarizeResets(sessions: Pick<ResetSession, 'response'>[]): ResetSummary {
  const answered = sessions.filter((s) => s.response !== null && s.response !== undefined);
  const better = answered.filter((s) => s.response === 'better').length;
  return {
    answered: answered.length,
    better,
    rate: answered.length > 0 ? better / answered.length : 0,
  };
}
