import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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

  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, { duration: MOTION.fast });
    if (selected) {
      // A small overshoot on select; nothing on deselect.
      press.value = withSpring(1, MOTION.springSnap, () => {
        press.value = withSpring(0, MOTION.spring);
      });
    }
  }, [selected, on, press]);

  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      on.value,
      [0, 1],
      [c.pillBg, isDark ? 'rgba(217,124,155,0.22)' : `${accent}22`]
    ),
    transform: [{ scale: 1 + press.value * 0.04 }],
  }));

  const textColor = selected ? (isDark ? c.text : COLORS.primaryDark) : c.textSecondary;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
    >
      <Animated.View style={[styles.pill, fillStyle]}>
        <View style={styles.row}>
          {icon && <Icon name={icon} size={17} color={textColor} />}
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
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
});

export default Pill;
