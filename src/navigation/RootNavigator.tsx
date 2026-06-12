import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SymbolView } from 'expo-symbols';

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
  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }: any) => {
          const iconNameByRoute: Record<string, any> = {
            Home: { ios: 'house.fill', android: 'home', web: 'home' },
            Calendar: {
              ios: 'calendar',
              android: 'calendar_month',
              web: 'calendar_month',
            },
            Analytics: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
            Settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
          };

          return (
            <SymbolView
              name={iconNameByRoute[route.name] ?? iconNameByRoute.Home}
              size={size}
              tintColor={color}
            />
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.divider,
          paddingBottom: 8,
          paddingTop: 8,
        },
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
