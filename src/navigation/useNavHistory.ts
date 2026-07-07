import { create } from 'zustand';
import { restoreState } from './navRef';

/**
 * Browser-style back/forward history for the whole app.
 *
 * React Navigation has no native "forward" (going back pops the entry), so we
 * snapshot the full navigation state on every distinct page and keep a pointer
 * into that list. Back/forward restore a stored snapshot; a fresh navigation
 * truncates anything ahead of the pointer — exactly like a browser.
 */

interface Entry {
  key: string;
  state: any;
}

interface NavHistoryStore {
  history: Entry[];
  index: number;
  canGoBack: boolean;
  canGoForward: boolean;
  restoring: boolean;
  record: (state: any) => void;
  goBack: () => void;
  goForward: () => void;
}

/** The key of the deepest active route — our notion of "current page". */
function getLeafKey(state: any): string | undefined {
  let s = state;
  let route;
  while (s && typeof s.index === 'number' && Array.isArray(s.routes)) {
    route = s.routes[s.index];
    s = route.state;
  }
  return route?.key;
}

export const useNavHistory = create<NavHistoryStore>((set, get) => ({
  history: [],
  index: -1,
  canGoBack: false,
  canGoForward: false,
  restoring: false,

  record: (state) => {
    if (!state) return;
    const key = getLeafKey(state);
    if (!key) return;

    const { history, index, restoring } = get();

    // Ignore the state change our own back/forward restore just caused.
    if (restoring) {
      set({ restoring: false });
      return;
    }

    // Same page (e.g. a param tweak) — refresh the snapshot in place.
    if (index >= 0 && history[index]?.key === key) {
      const next = history.slice();
      next[index] = { key, state };
      set({ history: next });
      return;
    }

    // New page — drop any forward entries and push.
    const trimmed = history.slice(0, index + 1);
    trimmed.push({ key, state });
    set({
      history: trimmed,
      index: trimmed.length - 1,
      canGoBack: trimmed.length - 1 > 0,
      canGoForward: false,
    });
  },

  goBack: () => {
    const { index, history } = get();
    if (index <= 0) return;
    const ni = index - 1;
    set({
      restoring: true,
      index: ni,
      canGoBack: ni > 0,
      canGoForward: ni < history.length - 1,
    });
    restoreState(history[ni].state);
  },

  goForward: () => {
    const { index, history } = get();
    if (index >= history.length - 1) return;
    const ni = index + 1;
    set({
      restoring: true,
      index: ni,
      canGoBack: ni > 0,
      canGoForward: ni < history.length - 1,
    });
    restoreState(history[ni].state);
  },
}));
