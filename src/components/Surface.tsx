import { ReactNode, useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import { RADIUS, SHADOW, SHADOW_DARK, SPACE, MOTION } from '../theme/tokens';

type Elevation = 'flat' | 'sm' | 'md' | 'lg';

interface SurfaceProps {
  children: ReactNode;
  /** Depth. Cards default to `sm`; heroes and sheets go higher. */
  elevation?: Elevation;
  /** Set false to control padding yourself. */
  padded?: boolean;
  /** Recessed inset style instead of a raised card. */
  inset?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * The default surface of the design language: a white card that separates from
 * the warm canvas by a soft shadow — never a border.
 *
 * This replaces GlassCard as the primary container. Glass is now reserved for
 * chrome that floats over scrolling content (the tab bar), where the blur is
 * doing real work rather than decorating.
 *
 * When `onPress` is given the whole card becomes a spring-pressed, haptic
 * button with a proper accessibility role.
 */
const Surface = ({
  children,
  elevation = 'sm',
  padded = true,
  inset = false,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
}: SurfaceProps) => {
  const { colors: c, isDark } = useTheme();
  const shadows = isDark ? SHADOW_DARK : SHADOW;
  const press = useSharedValue(0);

  const base = useMemo<ViewStyle>(
    () => ({
      backgroundColor: inset ? c.bgSecondary : c.card,
      borderRadius: RADIUS.card,
      padding: padded ? SPACE.xl : 0,
      ...(inset ? {} : shadows[elevation === 'flat' ? 'none' : elevation]),
    }),
    [c, inset, padded, elevation, shadows]
  );

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.014 }],
  }));

  if (!onPress) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPressIn={() => {
        press.value = withSpring(1, MOTION.springSnap);
        Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => {
        press.value = withSpring(0, MOTION.spring);
      }}
      onPress={onPress}
    >
      <Animated.View style={[base, animated, style]}>{children}</Animated.View>
    </Pressable>
  );
};

export default Surface;

export const surfaceStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
