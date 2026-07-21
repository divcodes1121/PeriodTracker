import { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

/**
 * The scroll position of the enclosing Screen, as a shared value.
 *
 * Screen previously wrapped a bare ScrollView, which meant nothing on the page
 * could react to scrolling — every "card tilts as it passes" or "header settles"
 * effect was unbuildable without each screen re-plumbing its own handler.
 *
 * Publishing it as a SharedValue rather than React state is the whole point:
 * consumers read it inside worklets, so a scrolling page costs zero re-renders
 * no matter how many elements are reacting to it.
 *
 * Null outside a scrolling Screen (e.g. `scroll={false}` pages), so consumers
 * must handle absence — see useScrollY().
 */
export const ScrollContext = createContext<SharedValue<number> | null>(null);

export const useScrollY = () => useContext(ScrollContext);
