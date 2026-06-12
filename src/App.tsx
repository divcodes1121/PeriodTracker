import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from './store/appStore';
import { RootNavigator } from './navigation/RootNavigator';
import { COLORS } from './constants';

export default function App() {
  const { showOnboarding, user } = useAppStore();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer
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
      <StatusBar />
    </GestureHandlerRootView>
  );
}
