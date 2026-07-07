import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

// Root navigation ref so non-screen code (the history store) can drive nav.
export const navigationRef = createNavigationContainerRef<any>();

/** Restore a previously captured navigation state (used by back/forward). */
export function restoreState(state: any) {
  if (navigationRef.isReady() && state) {
    navigationRef.dispatch(CommonActions.reset(state));
  }
}
