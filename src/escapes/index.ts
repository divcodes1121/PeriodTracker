import { ComponentType } from 'react';
import ZenGarden from './ZenGarden';
import BubbleTherapy from './BubbleTherapy';
import CrystalRelease from './CrystalRelease';
import RainCatcher from './RainCatcher';
import Aquarium from './Aquarium';
import AuroraSky from './AuroraSky';
import DandelionWishes from './DandelionWishes';

/**
 * Escape id → scene component. Metadata lives in utils/tinyEscapes.ts (kept
 * RN-free for the node test project); this map is the RN-side counterpart.
 */
export const ESCAPE_COMPONENTS: Record<string, ComponentType> = {
  zen: ZenGarden,
  dandelion: DandelionWishes,
  aquarium: Aquarium,
  bubbles: BubbleTherapy,
  shatter: CrystalRelease,
  aurora: AuroraSky,
  catcher: RainCatcher,
};
