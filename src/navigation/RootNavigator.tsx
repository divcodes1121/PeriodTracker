import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/useTheme';
import EmojiChip from '../components/EmojiChip';

// Screens
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MoodTrackerScreen from '../screens/MoodTrackerScreen';
import SymptomLoggerScreen from '../screens/SymptomLoggerScreen';
import AIInsightsScreen from '../screens/AIInsightsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

import { COLORS } from '../constants';

const TAB_EMOJI: Record<string, string> = {
  Home: '🏠',
  Calendar: '🗓️',
  Analytics: '📊',
  Settings: '⚙️',
};

/** Water-bubble tab icon that bursts when its tab becomes active. */
function TabIcon({ route, focused }: { route: string; focused: boolean }) {
  const [trigger, setTrigger] = useState(0);
  const wasFocused = useRef(focused);

  useEffect(() => {
    if (focused && !wasFocused.current) setTrigger((t) => t + 1);
    wasFocused.current = focused;
  }, [focused]);

  return (
    <EmojiChip
      emoji={TAB_EMOJI[route] ?? '•'}
      size={34}
      colors={focused ? ['#FFFFFF', '#FFD9E6'] : ['#FFFFFF', '#ECE6F0']}
      trigger={trigger}
      style={{ opacity: focused ? 1 : 0.5 }}
    />
  );
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: COLORS.background },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="SymptomLogger" component={SymptomLoggerScreen} />
      <Stack.Screen name="MoodTracker" component={MoodTrackerScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="AIInsights" component={AIInsightsScreen} />
    </Stack.Navigator>
  );
}

function CalendarStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
    </Stack.Navigator>
  );
}

function AnalyticsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ focused }: any) => <TabIcon route={route.name} focused={focused} />,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: Platform.select({ ios: 88, default: 68 }),
          paddingTop: 6,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={40}
            tint={colors.blurTint}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.tabBarBg, borderTopWidth: 1, borderTopColor: colors.tabBarBorder },
            ]}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Home' }} />
      <Tab.Screen name="Calendar" component={CalendarStack} options={{ title: 'Calendar' }} />
      <Tab.Screen name="Analytics" component={AnalyticsStack} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Settings" component={SettingsStack} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}


export function RootNavigator({ showOnboarding }: { showOnboarding: boolean }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <Stack.Screen name="MainTabs" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}

export default RootNavigator;
