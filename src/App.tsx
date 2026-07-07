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
import { COLORS } from './constants';

export default function App() {
  const { showOnboarding, user, hasHydrated, theme } = useAppStore();
  const recordHistory = useNavHistory((s) => s.record);

  // Wait for persisted state to load from disk before deciding which
  // navigator to show. Otherwise returning users briefly see onboarding.
  if (!hasHydrated) {
    return (
      <View style={styles.splash}>
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
        theme={{
          dark: false,
          colors: {
            primary: COLORS.primary,
            background: COLORS.background,
            card: COLORS.white,
            text: COLORS.text,
            border: COLORS.border,
            notification: COLORS.error,
          },
          fonts: {
            regular: { fontFamily: 'System' },
            bold: { fontFamily: 'System' },
            medium: { fontFamily: 'System' },
            thin: { fontFamily: 'System' },
            light: { fontFamily: 'System' },
            heavy: { fontFamily: 'System' },
          },
        } as any}
      >
        <RootNavigator showOnboarding={showOnboarding || !user} />
      </NavigationContainer>
      {!showOnboarding && user && <NavControls />}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
