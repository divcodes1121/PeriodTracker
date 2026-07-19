import { ComponentType } from 'react';
import ZenGarden from './ZenGarden';
import BloomGarden from './BloomGarden';
import BubbleTherapy from './BubbleTherapy';
import CrystalRelease from './CrystalRelease';
import RainWindow from './RainWindow';
import StarDust from './StarDust';
import RainCatcher from './RainCatcher';

/**
 * Escape id → scene component. Metadata lives in utils/tinyEscapes.ts (kept
 * RN-free for the node test project); this map is the RN-side counterpart.
 */
export const ESCAPE_COMPONENTS: Record<string, ComponentType> = {
  zen: ZenGarden,
  bloom: BloomGarden,
  bubbles: BubbleTherapy,
  shatter: CrystalRelease,
  rain: RainWindow,
  cosmos: StarDust,
  catcher: RainCatcher,
};
