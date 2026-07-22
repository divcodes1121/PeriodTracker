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

/**
 * Body plan. This is the property that actually makes a tank look stocked —
 * the first pass gave every species the same ellipse and only varied colour,
 * which reads as one fish in eight paint jobs. Each shape is a genuinely
 * different silhouette, because silhouette is what you recognise at a glance
 * and from across the tank.
 */
export type BodyShape =
  /** Streamlined dart — tetras, rasboras. */
  | 'torpedo'
  /** Tall, laterally flattened coin — discus, tangs, butterflyfish. */
  | 'disc'
  /** Tall with drawn-out trailing fins — angelfish. */
  | 'sail'
  /** Trailing veil fins — betta, fancy guppy. */
  | 'veil'
  /** Long and slender — danios, pencilfish, firefish. */
  | 'ribbon'
  /** Fat and round — puffers. */
  | 'round'
  /** Vertical, curled tail — seahorse. */
  | 'seahorse'
  /** Heavy body with a big flowing tail — koi. */
  | 'carp';

export interface Species {
  id: string;
  name: string;
  /** Body colours: fill, secondary band, fin. */
  palette: [string, string, string];
  shape: BodyShape;
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
  // ---- Darts: small, fast, strongly schooling -----------------------------
  {
    id: 'neon', name: 'Neon Tetra', shape: 'torpedo',
    palette: ['#4FB4C8', '#E4574F', '#BFE6EE'],
    size: 15, temperament: 'playful', social: 0.95, curiosity: 0.4, speed: 0.8, depth: 0.45, weight: 10,
  },
  {
    id: 'cardinal', name: 'Cardinal Tetra', shape: 'torpedo',
    palette: ['#3FA0C4', '#D14A4A', '#CFE8F2'],
    size: 16, temperament: 'playful', social: 0.9, curiosity: 0.35, speed: 0.78, depth: 0.5, weight: 8,
  },
  {
    id: 'rasbora', name: 'Harlequin Rasbora', shape: 'torpedo',
    palette: ['#D89A62', '#7A4E38', '#F0C89A'],
    size: 17, temperament: 'playful', social: 0.85, curiosity: 0.45, speed: 0.72, depth: 0.4, weight: 7,
  },
  {
    id: 'cave', name: 'Cave Tetra', shape: 'torpedo',
    palette: ['#8FA6C4', '#5C7396', '#C4D4E8'],
    size: 17, temperament: 'shy', social: 0.6, curiosity: 0.2, speed: 0.5, depth: 0.68, weight: 3,
    nocturnal: true,
  },

  // ---- Ribbons: long and slender ------------------------------------------
  {
    id: 'danio', name: 'Zebra Danio', shape: 'ribbon',
    palette: ['#C9CFD8', '#3E5470', '#E6EAF0'],
    size: 19, temperament: 'playful', social: 0.8, curiosity: 0.55, speed: 0.92, depth: 0.28, weight: 6,
  },
  {
    id: 'firefish', name: 'Firefish', shape: 'ribbon',
    palette: ['#F4EDE2', '#D4503C', '#F2A882'],
    size: 21, temperament: 'shy', social: 0.3, curiosity: 0.3, speed: 0.6, depth: 0.6, weight: 4,
  },
  {
    id: 'pencil', name: 'Pencilfish', shape: 'ribbon',
    palette: ['#D9B87A', '#8A5C3A', '#F0DCB0'],
    size: 16, temperament: 'calm', social: 0.5, curiosity: 0.3, speed: 0.55, depth: 0.34, weight: 4,
  },

  // ---- Discs: tall, flat, unmistakable silhouettes -------------------------
  {
    id: 'discus', name: 'Discus', shape: 'disc',
    palette: ['#C97B5A', '#E8C48A', '#B36547'],
    size: 34, temperament: 'calm', social: 0.3, curiosity: 0.3, speed: 0.34, depth: 0.55, weight: 4,
  },
  {
    id: 'tang', name: 'Yellow Tang', shape: 'disc',
    palette: ['#E8C24A', '#C79A2E', '#F2DC90'],
    size: 30, temperament: 'curious', social: 0.35, curiosity: 0.6, speed: 0.5, depth: 0.48, weight: 5,
  },
  {
    id: 'bluetang', name: 'Blue Tang', shape: 'disc',
    palette: ['#3E7FC4', '#1E3A66', '#E8C24A'],
    size: 31, temperament: 'curious', social: 0.3, curiosity: 0.7, speed: 0.52, depth: 0.44, weight: 4,
  },
  {
    id: 'butterfly', name: 'Butterflyfish', shape: 'disc',
    palette: ['#F0E4C0', '#E0A840', '#4A4238'],
    size: 28, temperament: 'calm', social: 0.4, curiosity: 0.5, speed: 0.44, depth: 0.52, weight: 4,
  },

  // ---- Sails: tall with drawn-out fins -------------------------------------
  {
    id: 'angel', name: 'Angelfish', shape: 'sail',
    palette: ['#D8D2C4', '#5C5A52', '#E8E3D6'],
    size: 32, temperament: 'calm', social: 0.25, curiosity: 0.45, speed: 0.4, depth: 0.42, weight: 5,
  },
  {
    id: 'ram', name: 'Ram Cichlid', shape: 'sail',
    palette: ['#8A7BC0', '#E8C24A', '#C4B0E0'],
    size: 24, temperament: 'curious', social: 0.2, curiosity: 0.65, speed: 0.46, depth: 0.62, weight: 4,
  },

  // ---- Veils: trailing finnage ---------------------------------------------
  {
    id: 'betta', name: 'Betta', shape: 'veil',
    palette: ['#7A5FA8', '#C05A8E', '#9B7BC4'],
    size: 26, temperament: 'shy', social: 0.05, curiosity: 0.25, speed: 0.42, depth: 0.3, weight: 4,
  },
  {
    id: 'guppy', name: 'Fancy Guppy', shape: 'veil',
    palette: ['#7FBFA8', '#E8B36A', '#CFE3D6'],
    size: 15, temperament: 'playful', social: 0.5, curiosity: 0.6, speed: 0.85, depth: 0.35, weight: 8,
  },

  // ---- Rounds and oddities --------------------------------------------------
  {
    id: 'clown', name: 'Clownfish', shape: 'round',
    palette: ['#E08A4A', '#F4EDE2', '#D9762F'],
    size: 22, temperament: 'curious', social: 0.35, curiosity: 0.85, speed: 0.6, depth: 0.62, weight: 7,
  },
  {
    id: 'puffer', name: 'Pufferfish', shape: 'round',
    palette: ['#C9B182', '#6E5C3E', '#E4D4AC'],
    size: 26, temperament: 'calm', social: 0.05, curiosity: 0.7, speed: 0.22, depth: 0.66, weight: 3,
  },
  {
    id: 'mandarin', name: 'Mandarin Dragonet', shape: 'round',
    palette: ['#2E8A8A', '#E07A3C', '#4FC4B0'],
    size: 20, temperament: 'shy', social: 0.05, curiosity: 0.35, speed: 0.24, depth: 0.8, weight: 2.5,
  },

  // ---- Rare visitors ---------------------------------------------------------
  {
    id: 'koi', name: 'Koi', shape: 'carp',
    palette: ['#F0EAE0', '#E0764A', '#D8CFC0'],
    size: 44, temperament: 'calm', social: 0.2, curiosity: 0.5, speed: 0.32, depth: 0.7, weight: 1.5,
  },
  {
    id: 'seahorse', name: 'Seahorse', shape: 'seahorse',
    palette: ['#D9B87A', '#B08E52', '#E8D4A8'],
    size: 22, temperament: 'shy', social: 0, curiosity: 0.15, speed: 0.1, depth: 0.78, weight: 1,
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
      // Sized down after device testing: 1.05-1.80 read fine in a desktop
      // browser and far too large on an actual phone, where the tank is a
      // fraction of the width. The spread is kept, since varied sizes are what
      // give the shoal depth — bigger simply means nearer.
      scale: 0.7 + rand() * 0.5,
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

/* --------------------------- Points of interest --------------------------- */

/**
 * Steering maths for the fish.
 *
 * These live here, tested, rather than inline in the scene because every bug in
 * this feature so far has been arithmetic — a unit mismatch that sent fish
 * off-screen, and a per-frame nudge that never accumulated. Both were invisible
 * to typecheck and to every existing test.
 *
 * Each function carries `'worklet'`, so the *same tested code* runs on the UI
 * thread — the pattern already used for the Kintsugi geometry.
 */

/** How long a tap holds full attention before interest starts to fade, seconds. */
export const POI_HOLD = 12;
/** How long the fade itself takes after the hold, seconds. */
export const POI_FADE = 18;

/**
 * Remaining interest in a point of interest, 1 → 0.
 *
 * A long plateau then a slow fade, rather than a straight decay from the moment
 * of the tap: a crowd should stay gathered long enough to actually watch, and
 * then disperse gently. It does still reach zero — a tank permanently disturbed
 * by a tap five minutes ago is not a calm place to sit.
 */
export function poiLife(elapsedSec: number): number {
  'worklet';
  if (elapsedSec < 0) return 0;
  if (elapsedSec <= POI_HOLD) return 1;
  const fade = 1 - (elapsedSec - POI_HOLD) / POI_FADE;
  return fade > 0 ? fade : 0;
}

/**
 * How much one point pulls on one fish.
 *
 * `arrive` ramps with elapsed time, which is what actually carries a fish
 * across the tank: the scene recomputes each position from scratch every frame,
 * so a constant per-frame nudge would never accumulate — it would just park the
 * fish a fixed fraction of the way there.
 */
export function poiWeight(
  elapsedSec: number,
  arriveSec: number,
  pref: number,
  distance: number
): number {
  'worklet';
  const life = poiLife(elapsedSec);
  if (life <= 0) return 0;
  const arrive = Math.min(1, Math.max(0, elapsedSec) / arriveSec);
  return (life * arrive * pref) / (1 + distance / 500);
}

/**
 * Total pull → blend factor, hard-capped below 1.
 *
 * The cap is a structural guarantee rather than a tuning value: a blend under 1
 * can only ever move a fish *toward* the target, never past it. That is what
 * makes a future arithmetic mistake produce a fish that arrives early instead
 * of one that leaves the building.
 */
export function poiBlend(totalWeight: number, eagerness: number): number {
  'worklet';
  if (totalWeight <= 0) return 0;
  const b = totalWeight * eagerness;
  return b > 0.88 ? 0.88 : b;
}

/**
 * Which slot a new tap should claim.
 *
 * Round-robin reuse made the Nth+1 tap stamp over a still-lively point, which
 * teleported that crowd. This evicts an empty slot if there is one, otherwise
 * the *oldest* — the point with the least pull left, so the eviction is the
 * least visible one available.
 */
export function chooseSlot(stamps: number[]): number {
  'worklet';
  let oldest = 0;
  let oldestT = Infinity;
  for (let i = 0; i < stamps.length; i++) {
    if (stamps[i] <= 0) return i;
    if (stamps[i] < oldestT) {
      oldestT = stamps[i];
      oldest = i;
    }
  }
  return oldest;
}

/** Days between two dates, floored at 0. */
export function daysSince(created: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / 86400000));
}
