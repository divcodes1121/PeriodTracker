import React from 'react';
import { Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ThemeToggleProps {
  style?: StyleProp<ViewStyle>;
}

/** Circular glass button that flips light/dark theme with a spin + haptic. */
const ThemeToggle: React.FC<ThemeToggleProps> = ({ style }) => {
  const { isDark, toggle, colors } = useTheme();
  const scale = useSharedValue(1);
  const spin = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${spin.value}deg` }],
  }));

  const onPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    spin.value = withTiming(spin.value + 360, { duration: 500 });
    toggle();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.88))}
      onPressOut={() => (scale.value = withSpring(1))}
      style={[
        styles.btn,
        { backgroundColor: colors.pillBg, borderColor: colors.glassBorder },
        animatedStyle,
        style,
      ]}
    >
      <Text style={styles.icon}>{isDark ? '🌙' : '☀️'}</Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  icon: { fontSize: 20 },
});

export default ThemeToggle;
