import { Pressable, StyleProp, ViewStyle, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Text from './Text';
import Icon, { IconName } from './Icon';
import { useTheme } from '../theme/useTheme';
import { COLORS, GRADIENT } from '../constants';
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
  /** Overrides the accent used by `primary`/`tinted` (e.g. a phase colour). */
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one button.
 *
 * ── Three decisions worth keeping ─────────────────────────────────────────
 *
 * **Pill, not rounded rectangle.** At `RADIUS.pill` the button stops reading
 * as a container and starts reading as an object you can pick up. It is also
 * the single strongest shape cue tying the button to the chips, the FAB and
 * the tab pills — one family, one silhouette.
 *
 * **Primary is a gradient, and the gradient is tonal.** Blossom→Rose ink, two
 * values of one hue. It reads as a lit surface rather than as a colour ramp,
 * and both ends clear 4.5:1 under a white label — the whole reason the ink
 * values exist. Passing a custom `accent` opts out of the gradient and into a
 * flat fill, and the caller then owns its contrast.
 *
 * **The press is a squash, not a fade.** Scale down slightly and let the
 * shadow soften at the same time, so the button appears to be pushed toward
 * the page. Opacity alone reads as "disabled", which is the opposite message.
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

  // Default fill is the rose *ink*: white on the rose pastel is only 2.9:1 and
  // would fail AA for the label. A caller passing `accent` owns its contrast.
  const tint = accent ?? COLORS.primaryDark;
  const gradient = !accent && variant === 'primary';

  const height = size === 'lg' ? 56 : MIN_TAP;

  const surface: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: gradient ? 'transparent' : tint, ...shadows.md },
    secondary: { backgroundColor: c.card, ...shadows.sm },
    tinted: { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : `${tint}1A` },
    plain: { backgroundColor: 'transparent' },
  };

  const labelColor: Record<Variant, string> = {
    primary: c.onAccent,
    secondary: c.text,
    tinted: isDark ? c.text : tint,
    plain: tint,
  };

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.024 }],
    // Shadow softens with the squash so the button reads as pressed *into* the
    // page rather than merely shrinking.
    shadowOpacity: interpolate(
      press.value,
      [0, 1],
      [(surface[variant].shadowOpacity as number) ?? 0, 0.04],
      Extrapolation.CLAMP
    ),
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
        {gradient ? (
          <LinearGradient
            colors={GRADIENT.bloomInk as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
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
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.xxl,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
});

export default Button;
