import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from './store/appStore';
import { RootNavigator } from './navigation/RootNavigator';
import { navigationRef } from './navigation/navRef';
import { useNavHistory } from './navigation/useNavHistory';
import NavControls from './components/NavControls';
import SplashBloom from './components/SplashBloom';
import { useTheme } from './theme/useTheme';
import { COLORS } from './constants';
import { FONT } from './theme/tokens';

export default function App() {
  const { showOnboarding, user, hasHydrated } = useAppStore();
  const { colors, isDark } = useTheme();
  const recordHistory = useNavHistory((s) => s.record);
  const [introDone, setIntroDone] = useState(false);

  /**
   * The splash gate has two conditions, and both matter.
   *
   *   hasHydrated  the persisted store has finished loading from disk. Without
   *                this, a returning user gets a flash of onboarding.
   *   introDone    the bloom has finished opening.
   *
   * Requiring *both* is deliberate. Hydration usually wins the race, and
   * dismissing the splash the instant it lands would cut the flower off
   * mid-open — a half-finished animation reads as a glitch, where a completed
   * one reads as an intro. The extra few hundred milliseconds buy the whole
   * first impression. If hydration is the slower of the two, the bloom simply
   * rests open until it arrives.
   */
  if (!hasHydrated || !introDone) {
    return <SplashBloom onDone={() => setIntroDone(true)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => recordHistory(navigationRef.getRootState())}
          onStateChange={(state) => recordHistory(state)}
          // Derived from the active palette rather than hardcoded light, so the
          // nav container's own chrome (and its default scene background) match
          // the theme instead of flashing white in dark mode.
          theme={{
            dark: isDark,
            colors: {
              primary: COLORS.primary,
              background: colors.bg,
              card: colors.card,
              text: colors.text,
              border: colors.separator,
              notification: COLORS.error,
            },
            fonts: {
              regular: { fontFamily: FONT },
              bold: { fontFamily: FONT },
              medium: { fontFamily: FONT },
              thin: { fontFamily: FONT },
              light: { fontFamily: FONT },
              heavy: { fontFamily: FONT },
            },
          } as any}
        >
          <RootNavigator showOnboarding={showOnboarding || !user} />
        </NavigationContainer>
        {!showOnboarding && user && <NavControls />}
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
