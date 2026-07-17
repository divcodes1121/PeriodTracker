import { ComponentType } from 'react';
import ZenGarden from './ZenGarden';
import BloomGarden from './BloomGarden';
import BubblePop from './BubblePop';
import CrystalRelease from './CrystalRelease';

/**
 * Escape id → scene component. Metadata lives in utils/tinyEscapes.ts (kept
 * RN-free for the node test project); this map is the RN-side counterpart.
 */
export const ESCAPE_COMPONENTS: Record<string, ComponentType> = {
  zen: ZenGarden,
  bloom: BloomGarden,
  bubbles: BubblePop,
  shatter: CrystalRelease,
};
