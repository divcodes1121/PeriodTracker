import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import { COLORS } from '../constants';
import { MOTION, SHADOW } from '../theme/tokens';

interface ToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}

const W = 51;
const H = 31;
const KNOB = 27;

/**
 * iOS-style switch, hand-built so it matches the palette exactly and springs
 * the way the rest of the system does (RN's Switch can't be themed past a tint
 * color, and its animation curve is fixed).
 */
const Toggle = ({ value, onValueChange, accessibilityLabel, disabled }: ToggleProps) => {
  const { colors: c } = useTheme();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    on.value = withSpring(value ? 1 : 0, MOTION.spring);
  }, [value, on]);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [c.switchTrack, COLORS.primary]),
  }));

  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: on.value * (W - KNOB - 4) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onValueChange(!value);
      }}
    >
      <Animated.View style={[styles.track, track, { opacity: disabled ? 0.5 : 1 }]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: W,
    height: H,
    borderRadius: H / 2,
    padding: 2,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    ...SHADOW.xs,
  },
});

export default Toggle;
