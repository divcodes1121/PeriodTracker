import { ComponentType } from 'react';
import ZenGarden from './ZenGarden';
import BubbleTherapy from './BubbleTherapy';
import CrystalRelease from './CrystalRelease';
import RainCatcher from './RainCatcher';
import Aquarium from './Aquarium';

/**
 * Escape id → scene component. Metadata lives in utils/tinyEscapes.ts (kept
 * RN-free for the node test project); this map is the RN-side counterpart.
 */
export const ESCAPE_COMPONENTS: Record<string, ComponentType> = {
  zen: ZenGarden,
  aquarium: Aquarium,
  bubbles: BubbleTherapy,
  shatter: CrystalRelease,
  catcher: RainCatcher,
};
