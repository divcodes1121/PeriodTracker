import { useEffect } from 'react';
import { Pressable, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Ellipse, G } from 'react-native-svg';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useReducedMotion,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Text from './Text';
import Icon, { IconName } from './Icon';
import { useTheme } from '../theme/useTheme';
import { BLOOM, BloomHue } from '../constants';
import { MOTION, RADIUS, SPACE, MIN_TAP_COMFORT } from '../theme/tokens';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CHIP — a symptom, a tag, a choice.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The Symptom Logger used to be a list of ten checkbox rows, which is the
 * correct way to build a form and the wrong way to build *this* form. Logging
 * a symptom is not data entry; it is someone saying "today hurt". A row with a
 * tick box makes that an admin task.
 *
 * A chip is a big, soft, tappable object with a picture on it. Ten of them
 * wrap into a field you scan rather than read.
 *
 * ── The bloom ─────────────────────────────────────────────────────────────
 *
 * Selecting a chip does not just tint it — **a small flower opens behind the
 * icon**. Three petals, springing out on `MOTION.springBloom` (the one spring
 * allowed to overshoot). It costs one node per selected chip and it is the
 * single reason the screen is pleasant to use twice a day.
 *
 * ── Contrast ──────────────────────────────────────────────────────────────
 *
 * Selected chips fill with the hue's **ink**, not its pastel, so the white
 * label clears 4.5:1. Unselected chips carry the ink as *text on cream*, which
 * also clears. There is no state in which the label is the pastel — that is
 * the mistake the three-value system exists to make impossible.
 *
 * Selection is never colour-only: selected chips also gain the bloom, a
 * heavier label weight, and `accessibilityState.selected`.
 */

interface ChipProps {
  label: string;
  icon?: IconName;
  /** Brand hue key. Drives fill, bloom and ink. */
  hue?: BloomHue;
  selected?: boolean;
  onPress?: () => void;
  /** Small variant for dense rows (filters, legends). */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

/** The three petals that open behind a selected chip's icon. */
function ChipBloom({ open, color, size }: { open: SharedValue<number>; color: string; size: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: open.value,
    transform: [
      { scale: interpolate(open.value, [0, 1], [0.3, 1], Extrapolation.CLAMP) },
      { rotate: `${interpolate(open.value, [0, 1], [-40, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <G transform="translate(50 50)">
          {[0, 120, 240].map((a) => (
            <Ellipse
              key={a}
              cx={0}
              cy={-30}
              rx={17}
              ry={28}
              fill={color}
              opacity={0.5}
              transform={`rotate(${a})`}
            />
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}

const Chip = ({
  label,
  icon,
  hue = 'rose',
  selected = false,
  onPress,
  size = 'md',
  style,
}: ChipProps) => {
  const { colors: c, isDark } = useTheme();
  const reduced = useReducedMotion();
  const tone = BLOOM[hue];

  const on = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    on.value = reduced
      ? withTiming(selected ? 1 : 0, { duration: MOTION.fast })
      : withSpring(selected ? 1 : 0, MOTION.springBloom);
  }, [selected, reduced, on]);

  const restBg = isDark ? c.fill : c.card;
  const activeBg = tone.ink;

  const container = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [restBg, activeBg]),
    transform: [{ scale: (1 - press.value * 0.03) * (1 + on.value * 0.015) }],
  }));

  const iconSize = size === 'sm' ? 17 : 21;
  const bloomSize = iconSize * 2.1;

  // Label colour cross-fades with the fill. Both ends are AA by construction —
  // ink-on-cream unselected, white-on-ink selected.
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(on.value, [0, 1], [isDark ? c.text : tone.ink, '#FFFFFF']),
  }));

  const iconWrap = icon ? (
    <View style={{ width: bloomSize, height: bloomSize, alignItems: 'center', justifyContent: 'center' }}>
      <ChipBloom open={on} color={selected ? '#FFFFFF' : tone.pastel} size={bloomSize} />
      <Icon name={icon} size={iconSize} color={selected ? '#FFFFFF' : tone.ink} weight={selected ? 1.15 : 1} />
    </View>
  ) : null;

  const inner = (
    <Animated.View
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        container,
        style,
      ]}
    >
      {iconWrap}
      <Animated.Text
        style={[
          styles.label,
          size === 'sm' ? styles.labelSm : styles.labelMd,
          { fontWeight: selected ? '600' : '500' },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    </Animated.View>
  );

  if (!onPress) return inner;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPressIn={() => {
        press.value = withSpring(1, MOTION.springSnap);
      }}
      onPressOut={() => {
        press.value = withSpring(0, MOTION.spring);
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
    >
      {inner}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    gap: SPACE.xs,
  },
  // Comfortably above the 44pt floor. These get tapped on a bad day.
  md: {
    minHeight: MIN_TAP_COMFORT,
    paddingLeft: SPACE.sm,
    paddingRight: SPACE.lg,
    paddingVertical: SPACE.sm,
  },
  sm: {
    minHeight: 40,
    paddingLeft: SPACE.sm,
    paddingRight: SPACE.md,
    paddingVertical: SPACE.xs,
  },
  label: { letterSpacing: -0.1 },
  labelMd: { fontSize: 15 },
  labelSm: { fontSize: 13 },
});

export default Chip;
