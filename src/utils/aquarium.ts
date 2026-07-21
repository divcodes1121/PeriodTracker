import type { TimeBand } from '../theme/atmosphere';

/**
 * Aquarium — pure logic.
 *
 * RN-free (type-only import) so the roster, growth and lighting rules run under
 * the node Jest project, same as tinyEscapes and cycleCalculations. The scene
 * itself is src/escapes/Aquarium.tsx.
 *
 * THE OWNERSHIP IDEA: the aquarium is generated from a stable seed rather than
 * being identical for everyone, and the seed comes from the user's own id —
 * which is already persisted. So "their aquarium" costs no new storage, no
 * migration, and survives reinstall-from-backup exactly as well as the rest of
 * the profile does.
 *
 * GROWTH is derived from days since the account was created, not from session
 * time or a counter. That means plants are genuinely further along when someone
 * comes back next week, and there is nothing to grind: you cannot make coral
 * grow faster by staring at it. It also means growth needs no persistence.
 */

export type Temperament = 'shy' | 'curious' | 'playful' | 'calm';

export interface Species {
  id: string;
  name: string;
  /** Body colours: fill, secondary band, fin. */
  palette: [string, string, string];
  /** Body length in scene units (~px at 1x). */
  size: number;
  temperament: Temperament;
  /** 0–1. How strongly it schools with its own kind. */
  social: number;
  /** 0–1. How readily it approaches a touch. */
  curiosity: number;
  /** 0–1. Base swim speed. */
  speed: number;
  /** Preferred depth band, 0 = surface, 1 = sand. */
  depth: number;
  /** Rarity weight — higher appears more often. */
  weight: number;
  /** Nocturnal fish are active at night and rest during the day. */
  nocturnal?: boolean;
}

/**
 * The roster. Colours are graded rather than saturated — a real planted tank
 * reads as muted jewel tones through water, not as primary colours.
 */
export const SPECIES: Species[] = [
  {
    id: 'neon', name: 'Neon Tetra',
    palette: ['#4FB4C8', '#E4574F', '#BFE6EE'],
    size: 15, temperament: 'playful', social: 0.95, curiosity: 0.4, speed: 0.8, depth: 0.45, weight: 10,
  },
  {
    id: 'cardinal', name: 'Cardinal Tetra',
    palette: ['#3FA0C4', '#D14A4A', '#CFE8F2'],
    size: 16, temperament: 'playful', social: 0.9, curiosity: 0.35, speed: 0.78, depth: 0.5, weight: 8,
  },
  {
    id: 'clown', name: 'Clownfish',
    palette: ['#E08A4A', '#F4EDE2', '#D9762F'],
    size: 22, temperament: 'curious', social: 0.35, curiosity: 0.85, speed: 0.6, depth: 0.62, weight: 7,
  },
  {
    id: 'guppy', name: 'Guppy',
    palette: ['#7FBFA8', '#E8B36A', '#CFE3D6'],
    size: 14, temperament: 'playful', social: 0.5, curiosity: 0.6, speed: 0.85, depth: 0.35, weight: 8,
  },
  {
    id: 'angel', name: 'Angelfish',
    palette: ['#D8D2C4', '#5C5A52', '#E8E3D6'],
    size: 34, temperament: 'calm', social: 0.25, curiosity: 0.45, speed: 0.4, depth: 0.42, weight: 5,
  },
  {
    id: 'discus', name: 'Discus',
    palette: ['#C97B5A', '#E8C48A', '#B36547'],
    size: 36, temperament: 'calm', social: 0.3, curiosity: 0.3, speed: 0.34, depth: 0.55, weight: 4,
  },
  {
    id: 'betta', name: 'Betta',
    palette: ['#7A5FA8', '#C05A8E', '#9B7BC4'],
    size: 26, temperament: 'shy', social: 0.05, curiosity: 0.25, speed: 0.42, depth: 0.3, weight: 4,
  },
  {
    id: 'koi', name: 'Koi',
    palette: ['#F0EAE0', '#E0764A', '#D8CFC0'],
    size: 44, temperament: 'calm', social: 0.2, curiosity: 0.5, speed: 0.32, depth: 0.7, weight: 1.5,
  },
  {
    id: 'seahorse', name: 'Seahorse',
    palette: ['#D9B87A', '#B08E52', '#E8D4A8'],
    size: 20, temperament: 'shy', social: 0, curiosity: 0.15, speed: 0.12, depth: 0.78, weight: 1,
  },
  {
    id: 'cave', name: 'Cave Tetra',
    palette: ['#8FA6C4', '#5C7396', '#C4D4E8'],
    size: 17, temperament: 'shy', social: 0.6, curiosity: 0.2, speed: 0.5, depth: 0.68, weight: 3,
    nocturnal: true,
  },
];

/** Deterministic PRNG. Same seed, same aquarium, forever. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Turns any stable string (a user id) into a numeric seed. */
export function seedFrom(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export interface FishSpec {
  species: Species;
  /** Stable per-fish jitter, so two Neons of the same species still differ. */
  scale: number;
  phase: number;
  lane: number;
  speedJitter: number;
}

/**
 * The fish population for a given aquarium.
 *
 * Weighted draw, so rarities are genuinely rare — a Koi or Seahorse turns up in
 * a minority of aquariums, and someone who has one has something another user
 * does not. There is no way to obtain one; that is the point.
 */
export function rosterFor(seed: number, count = 22): FishSpec[] {
  const rand = rng(seed);
  const total = SPECIES.reduce((n, s) => n + s.weight, 0);

  return Array.from({ length: count }, (_, i) => {
    let roll = rand() * total;
    let species = SPECIES[0];
    for (const s of SPECIES) {
      roll -= s.weight;
      if (roll <= 0) {
        species = s;
        break;
      }
    }
    return {
      species,
      scale: 0.82 + rand() * 0.42,
      phase: rand(),
      // Lane keeps a fish near its species' preferred depth without pinning it.
      lane: Math.max(0.08, Math.min(0.92, species.depth + (rand() - 0.5) * 0.3)),
      speedJitter: 0.8 + rand() * 0.45,
      // Index is unused but keeps the map honest about ordering.
      ...(i === -1 ? {} : {}),
    };
  });
}

export interface Growth {
  /** 0–1. Drives plant height, coral spread, moss coverage. */
  maturity: number;
  /** How many plants have taken hold. */
  plants: number;
  /** How many coral heads. */
  coral: number;
}

/**
 * Growth from account age. Deliberately slow: an aquarium looks meaningfully
 * more planted after a couple of weeks, and reaches full maturity around three
 * months. Nothing here is reachable by playing more.
 */
export function growthFor(daysOld: number): Growth {
  const d = Math.max(0, daysOld);
  // Square-root curve: visible early progress, long tail — the opposite of a
  // grind curve, and it means day 1 is not barren.
  const maturity = Math.min(1, Math.sqrt(d / 90));
  return {
    maturity,
    plants: 4 + Math.round(maturity * 7),
    coral: 2 + Math.round(maturity * 4),
  };
}

export interface Lighting {
  /** Water column gradient, surface → sand. */
  water: [string, string, string];
  /** Colour of the volumetric shafts entering from above. */
  rays: string;
  /** Strength of the light shafts, 0–1. */
  rayStrength: number;
  /** Room seen through the glass behind the tank. */
  room: [string, string];
  /** Suspended-particle tint. */
  motes: string;
  /** Sleeping fish drift slower and lower. */
  restful: boolean;
  /** Bioluminescence and fireflies outside the tank. */
  glowLife: boolean;
}

/**
 * Lighting follows the app's real time-of-day bands rather than a private
 * clock, so the aquarium agrees with the atmosphere on every other screen —
 * opening it at midnight should not show a bright afternoon tank.
 */
export function lightingFor(band: TimeBand): Lighting {
  switch (band) {
    case 'dawn':
      return {
        water: ['#7FC4C8', '#4E93A8', '#2C5C74'],
        rays: 'rgba(255,226,170,0.5)', rayStrength: 0.85,
        room: ['#F2E3CE', '#D9C3A8'],
        motes: 'rgba(255,246,224,0.75)',
        restful: false, glowLife: false,
      };
    case 'day':
      return {
        water: ['#6FC2D4', '#3E8FB0', '#1F5670'],
        rays: 'rgba(226,244,255,0.55)', rayStrength: 1,
        room: ['#EDEFE9', '#CFD6CE'],
        motes: 'rgba(255,255,255,0.7)',
        restful: false, glowLife: false,
      };
    case 'dusk':
      return {
        water: ['#C99A7A', '#7A6A8E', '#39405E'],
        rays: 'rgba(255,196,142,0.5)', rayStrength: 0.7,
        room: ['#E8C2A0', '#B08A72'],
        motes: 'rgba(255,224,190,0.7)',
        restful: false, glowLife: true,
      };
    default:
      return {
        water: ['#2A4468', '#1B2E4E', '#0E1A30'],
        rays: 'rgba(180,206,255,0.3)', rayStrength: 0.3,
        room: ['#2A2E3E', '#181B26'],
        motes: 'rgba(190,220,255,0.6)',
        restful: true, glowLife: true,
      };
  }
}

/** Days between two dates, floored at 0. */
export function daysSince(created: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / 86400000));
}
