import { ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle, View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Text from './Text';
import Icon, { IconName } from './Icon';
import { useTheme } from '../theme/useTheme';
import { COLORS } from '../constants';
import { RADIUS, SPACE, MOTION, SHADOW, SHADOW_DARK, MIN_TAP } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'tinted' | 'plain';
type Size = 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Overrides the accent used by `primary`/`tinted` (e.g. a phase color). */
  accent?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * The one button. Sizes are restrained — the brief calls for elegance, so
 * even `lg` is 54pt rather than the chunky 60pt+ of a template app.
 *
 * Press feedback is a spring scale plus a selection haptic; there is no ripple
 * because the editorial language expresses touch through motion, not ink.
 */
const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  disabled = false,
  fullWidth = true,
  accent,
  style,
}: ButtonProps) => {
  const { colors: c, isDark } = useTheme();
  const shadows = isDark ? SHADOW_DARK : SHADOW;
  const press = useSharedValue(0);
  const tint = accent ?? COLORS.primary;

  const height = size === 'lg' ? 54 : MIN_TAP;

  const surface: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: tint, ...shadows.sm },
    secondary: { backgroundColor: c.card, ...shadows.sm },
    tinted: { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : `${tint}1A` },
    plain: { backgroundColor: 'transparent' },
  };

  const labelColor: Record<Variant, string> = {
    primary: c.onAccent,
    secondary: c.text,
    tinted: isDark ? c.text : COLORS.primaryDark,
    plain: COLORS.primaryDark,
  };

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.02 }],
    opacity: 1 - press.value * 0.06,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => {
        press.value = withSpring(1, MOTION.springSnap);
        Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => {
        press.value = withSpring(0, MOTION.spring);
      }}
      onPress={onPress}
      style={[fullWidth && { alignSelf: 'stretch' }, style]}
    >
      <Animated.View
        style={[
          styles.base,
          surface[variant],
          { height, opacity: disabled ? 0.4 : 1 },
          animated,
        ]}
      >
        <View style={styles.row}>
          {icon && <Icon name={icon} size={19} color={labelColor[variant]} />}
          <Text variant="button" color={labelColor[variant]} numberOfLines={1}>
            {label}
          </Text>
          {iconRight && <Icon name={iconRight} size={19} color={labelColor[variant]} />}
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.xxl,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
});

export default Button;
