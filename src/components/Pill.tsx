import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import Text from './Text';
import Icon, { IconName } from './Icon';
import { useTheme } from '../theme/useTheme';
import { COLORS } from '../constants';
import { RADIUS, SPACE, MOTION, MIN_TAP } from '../theme/tokens';

interface PillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Accent when selected — defaults to Rose Quartz. */
  accent?: string;
}

/**
 * Tactile selectable pill — replaces checkboxes for symptoms and filters.
 *
 * Selection is expressed by a color crossfade plus a small spring "pop", so the
 * change is felt as well as seen. The fill animates through interpolateColor on
 * the UI thread rather than swapping a style, which would snap.
 */
const Pill = ({ label, selected, onPress, icon, accent = COLORS.primary }: PillProps) => {
  const { colors: c, isDark } = useTheme();
  const on = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);
  /** Finger-down sink, separate from the release bloom. */
  const down = useSharedValue(0);
  /** One-shot halo on selection. */
  const bloom = useSharedValue(0);

  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, { duration: MOTION.fast });
    if (selected) {
      // A small overshoot on select; nothing on deselect.
      press.value = withSpring(1, MOTION.springSnap, () => {
        press.value = withSpring(0, MOTION.spring);
      });
      bloom.value = withSequence(
        withTiming(1, { duration: MOTION.fast }),
        withTiming(0, { duration: MOTION.slow })
      );
    }
  }, [selected, on, press, bloom]);

  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      on.value,
      [0, 1],
      [c.pillBg, isDark ? 'rgba(217,124,155,0.22)' : `${accent}22`]
    ),
    // Sinks slightly under the finger, then blooms past rest on release. The
    // sink is what makes it feel like a physical key rather than a checkbox.
    transform: [{ scale: 1 - down.value * 0.03 + press.value * 0.05 }],
  }));

  /**
   * A soft halo that blooms outward once on selection and fades. Purely
   * decorative and short-lived — the chip should acknowledge the tap, not
   * decorate itself permanently.
   */
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloom.value * 0.5,
    transform: [{ scale: 0.85 + bloom.value * 0.35 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + press.value * 0.22 }, { rotate: `${press.value * 8}deg` }],
  }));

  const textColor = selected ? (isDark ? c.text : COLORS.primaryDark) : c.textSecondary;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPressIn={() => {
        down.value = withSpring(1, MOTION.springSnap);
      }}
      onPressOut={() => {
        down.value = withSpring(0, MOTION.spring);
      }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
    >
      <Animated.View style={[styles.pill, fillStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.bloom, { backgroundColor: accent }, bloomStyle]}
        />
        <View style={styles.row}>
          {icon && (
            <Animated.View style={iconStyle}>
              <Icon name={icon} size={17} color={textColor} />
            </Animated.View>
          )}
          <Text variant="subhead" color={textColor} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    minHeight: MIN_TAP - 6,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.lg,
    justifyContent: 'center',
    overflow: 'visible',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  bloom: { position: 'absolute', left: -6, right: -6, top: -6, bottom: -6, borderRadius: RADIUS.pill },
});

export default Pill;
