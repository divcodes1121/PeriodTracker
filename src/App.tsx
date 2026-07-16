import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from './store/appStore';
import { RootNavigator } from './navigation/RootNavigator';
import { navigationRef } from './navigation/navRef';
import { useNavHistory } from './navigation/useNavHistory';
import NavControls from './components/NavControls';
import { useTheme } from './theme/useTheme';
import { COLORS } from './constants';
import { FONT } from './theme/tokens';

export default function App() {
  const { showOnboarding, user, hasHydrated } = useAppStore();
  const { colors, isDark } = useTheme();
  const recordHistory = useNavHistory((s) => s.record);

  // Wait for persisted state to load from disk before deciding which
  // navigator to show. Otherwise returning users briefly see onboarding.
  if (!hasHydrated) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
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

const styles = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
