import { StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Icon from './Icon';
import { useTheme } from '../theme/useTheme';
import { MOTION, MIN_TAP } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ThemeToggleProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * Light/dark switch. The glyph rotates a half turn as it swaps, so the change
 * reads as one continuous object turning over rather than two icons cutting.
 */
const ThemeToggle = ({ style }: ThemeToggleProps) => {
  const { isDark, toggle, colors: c } = useTheme();
  const press = useSharedValue(0);
  const spin = useSharedValue(0);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.08 }, { rotate: `${spin.value}deg` }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? 'Switch to light appearance' : 'Switch to dark appearance'}
      onPressIn={() => (press.value = withSpring(1, MOTION.springSnap))}
      onPressOut={() => (press.value = withSpring(0, MOTION.spring))}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        spin.value = withTiming(spin.value + 180, {
          duration: MOTION.base,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        });
        toggle();
      }}
      style={[styles.btn, { backgroundColor: c.fill }, animated, style]}
    >
      <Icon name={isDark ? 'moon' : 'sun'} size={19} color={c.textSecondary} />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: MIN_TAP - 6,
    height: MIN_TAP - 6,
    borderRadius: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemeToggle;
