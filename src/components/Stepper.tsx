import { useEffect } from 'react';
import { View, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { MOTION, RADIUS, SPACE, MIN_TAP } from '../theme/tokens';
import { useState } from 'react';

interface StepperProps {
  label: string;
  value: number;
  options: number[];
  onChange: (v: number) => void;
  suffix?: string;
  /** Words shown under the ends of the scale, e.g. ['Calm', 'Stressed']. */
  anchors?: [string, string];
  accent: string;
}

/**
 * Segmented scale with a sliding selection thumb.
 *
 * The thumb animates between positions instead of each segment toggling, which
 * turns a row of buttons into one continuous control — the difference between
 * feeling like a form and feeling like an instrument. Anchor words replace the
 * unlabeled 1–5 that made the old scales guesswork.
 */
const Stepper = ({ label, value, options, onChange, suffix = '', anchors, accent }: StepperProps) => {
  const { colors: c } = useTheme();
  const [w, setW] = useState(0);
  const index = Math.max(0, options.indexOf(value));
  const x = useSharedValue(0);

  const seg = w > 0 ? (w - 8) / options.length : 0;

  useEffect(() => {
    x.value = withSpring(index * seg, MOTION.spring);
  }, [index, seg, x]);

  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: seg,
  }));

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text variant="subhead">{label}</Text>
        <Text variant="subhead" color={accent} tabular>
          {value}
          {suffix}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: c.fill }]} onLayout={onLayout}>
        {seg > 0 && (
          <Animated.View style={[styles.thumb, { backgroundColor: c.card }, thumb]} />
        )}
        {options.map((o) => (
          <Pressable
            key={o}
            accessibilityRole="radio"
            accessibilityState={{ selected: o === value }}
            accessibilityLabel={`${label} ${o}${suffix}`}
            style={styles.seg}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o);
            }}
          >
            <Text variant="subhead" color={o === value ? c.text : c.textTertiary} tabular>
              {o}
            </Text>
          </Pressable>
        ))}
      </View>

      {anchors && (
        <View style={styles.anchors}>
          <Text variant="caption" tone="tertiary">
            {anchors[0]}
          </Text>
          <Text variant="caption" tone="tertiary">
            {anchors[1]}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACE.xl },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE.md,
  },
  track: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    padding: 4,
    height: MIN_TAP,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: RADIUS.xs,
    shadowColor: '#1E1E22',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  anchors: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.sm },
});

export default Stepper;
