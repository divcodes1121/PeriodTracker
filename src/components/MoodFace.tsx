import { useEffect } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { MOTION } from '../theme/tokens';

/** Mouth curvature per valence step. SVG y grows downward: negative = frown. */
const MOUTH: Record<number, string> = {
  1: 'M 8.5 16.5 Q 12 13 15.5 16.5',
  2: 'M 8.5 16 Q 12 14.2 15.5 16',
  3: 'M 8.5 15.5 L 15.5 15.5',
  4: 'M 8.5 14.8 Q 12 17 15.5 14.8',
  5: 'M 8 14.2 Q 12 18.4 16 14.2',
};

/** Brow angle adds the emotional read the mouth alone can't carry. */
const BROWS: Record<number, string | null> = {
  1: 'M 7.6 7.6 L 10.4 8.6 M 16.4 7.6 L 13.6 8.6',
  2: 'M 7.8 8 L 10.4 8.7 M 16.2 8 L 13.6 8.7',
  3: null,
  4: null,
  5: null,
};

interface MoodFaceProps {
  /** 1–5 valence. */
  value: number;
  label: string;
  selected: boolean;
  color: string;
  onPress: () => void;
  size?: number;
}

/**
 * Expressive mood face — a drawn illustration rather than an emoji, so it
 * inherits the palette, keeps one stroke weight, and renders identically on
 * every platform.
 *
 * Selection springs the face up and fills it with the mood color; unselected
 * faces sit back at reduced opacity so the chosen one clearly leads.
 */
const MoodFace = ({ value, label, selected, color, onPress, size = 56 }: MoodFaceProps) => {
  const { colors: c } = useTheme();
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.value = withSpring(selected ? 1 : 0, MOTION.spring);
  }, [selected, on]);

  const wrap = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + on.value * 0.12 }, { translateY: -on.value * 4 }],
  }));

  const disc = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [c.fill, `${color}2E`]),
    opacity: withTiming(selected ? 1 : 0.75, { duration: MOTION.fast }),
  }));

  const stroke = selected ? color : c.textSecondary;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={styles.press}
    >
      <Animated.View style={wrap}>
        <Animated.View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }, disc]}>
          <Svg width={size * 0.68} height={size * 0.68} viewBox="0 0 24 24">
            <Circle cx="9.4" cy="10.6" r="1.05" fill={stroke} />
            <Circle cx="14.6" cy="10.6" r="1.05" fill={stroke} />
            {BROWS[value] && (
              <Path
                d={BROWS[value] as string}
                stroke={stroke}
                strokeWidth={1.5}
                strokeLinecap="round"
                fill="none"
              />
            )}
            <Path
              d={MOUTH[value]}
              stroke={stroke}
              strokeWidth={1.75}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
      </Animated.View>

      <View style={{ height: 18, justifyContent: 'center' }}>
        <Text variant="caption" color={selected ? c.text : c.textTertiary} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  press: { alignItems: 'center', gap: 10, flex: 1 },
  disc: { alignItems: 'center', justifyContent: 'center' },
});

export default MoodFace;
