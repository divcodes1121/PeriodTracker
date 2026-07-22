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
    id: 'aquarium',
    title: 'Aquarium',
    tagline: 'Watch life swim by.',
    hint: 'Touch the glass · hold to feed',
    icon: 'fish',
    accent: '#3E8FB0',
    chrome: 'light',
  },
  {
    id: 'bubbles',
    title: 'Bubble Therapy',
    tagline: 'Breathe. Pop. Relax.',
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
  {
    id: 'catcher',
    title: 'Rain Catcher',
    tagline: 'Catch what falls. Watch it bloom.',
    hint: 'Drag to guide the umbrella',
    icon: 'umbrella',
    accent: '#D9857A',
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
 * elevated stress wants slowing down (Zen), low mood wants something to let go
 * of (Dandelion — it is a breathing ritual, and the meadow answers every
 * breath). Returns null when nothing should be suggested — the suggestion must
 * stay rare enough to mean something.
 */
export function recommendEscape(mood: number, stress: number): string | null {
  if (stress >= 5) return 'shatter';
  if (stress >= 4) return 'zen';
  if (mood <= 2) return 'zen';
  return null;
}

/* ----------------------------- Rain Catcher ------------------------------ */

export interface RainEnvironment {
  id: string;
  name: string;
  /** Total catches (this session) at which this environment takes over. */
  at: number;
}

/**
 * The meadow's journey — Rain Catcher's answer to difficulty. As the garden
 * is watered the world gets *more beautiful*, never harder: each caught drop
 * counts toward the next palette, and the scene crossfades so slowly the
 * change should be felt rather than noticed. Thresholds assume a relaxed
 * ~30–45 catches/min: a half-minute session sees one transition, five
 * minutes completes the walk into the Moonlit Garden.
 */
export const RAIN_ENVIRONMENTS: RainEnvironment[] = [
  { id: 'fresh', name: 'Fresh Meadow', at: 0 },
  { id: 'spring', name: 'Spring Garden', at: 12 },
  { id: 'cherry', name: 'Cherry Blossom', at: 32 },
  { id: 'lavender', name: 'Lavender Field', at: 58 },
  { id: 'golden', name: 'Golden Sunset', at: 90 },
  { id: 'moonlit', name: 'Moonlit Garden', at: 128 },
];

/** Which environment a session with `catches` caught drops lives in. */
export function environmentForCatches(catches: number): RainEnvironment {
  let current = RAIN_ENVIRONMENTS[0];
  for (const env of RAIN_ENVIRONMENTS) {
    if (catches >= env.at) current = env;
  }
  return current;
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
