import { useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import Icon, { IconName } from '../components/Icon';
import { MOTION, TYPE } from '../theme/tokens';

// Screens
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MoodTrackerScreen from '../screens/MoodTrackerScreen';
import SymptomLoggerScreen from '../screens/SymptomLoggerScreen';
import PeriodLoggerScreen from '../screens/PeriodLoggerScreen';
import AIInsightsScreen from '../screens/AIInsightsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

import { COLORS } from '../constants';

const TAB_ICON: Record<string, IconName> = {
  Home: 'home',
  Calendar: 'calendar',
  Analytics: 'chart',
  Settings: 'settings',
};

/**
 * Tab icon. On becoming active it settles with a restrained spring — a nod,
 * not a bounce — and the stroke thickens slightly to carry the selected state
 * alongside color (color alone would fail for color-blind users).
 */
function TabIcon({ route, focused, color }: { route: string; focused: boolean; color: string }) {
  const active = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    active.value = withSpring(focused ? 1 : 0, MOTION.spring);
  }, [focused, active]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + active.value * 0.06 }, { translateY: -active.value * 1.5 }],
  }));

  return (
    <Animated.View style={style}>
      <Icon name={TAB_ICON[route] ?? 'home'} size={24} color={color} weight={focused ? 1.15 : 1} />
    </Animated.View>
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
      <Stack.Screen name="PeriodLogger" component={PeriodLoggerScreen} />
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
        tabBarIcon: ({ focused, color }: any) => (
          <TabIcon route={route.name} focused={focused} color={color} />
        ),
        tabBarActiveTintColor: COLORS.primaryDark,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          ...TYPE.overline,
          textTransform: 'none',
          letterSpacing: 0,
          marginTop: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: Platform.select({ ios: 86, default: 66 }),
          paddingTop: 10,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        // The one place glass earns its keep: content scrolls under the bar.
        tabBarBackground: () => (
          <BlurView
            intensity={24}
            tint={colors.blurTint}
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colors.tabBarBg,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.tabBarBorder,
              },
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
