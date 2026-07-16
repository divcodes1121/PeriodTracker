import { useEffect, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { COLORS } from '../constants';
import { MOTION, SPACE, RADIUS } from '../theme/tokens';

const STEPS = 5;
const KNOB = 26;

const WORDS = ['Barely', 'Mild', 'Moderate', 'Strong', 'Severe'];

interface SeverityProps {
  label: string;
  /** 1–5. */
  value: number;
  onChange: (v: number) => void;
}

/**
 * Draggable 1–5 severity slider.
 *
 * Snaps to whole steps with a spring and fires a selection haptic on each step
 * crossed, so the scale can be set by feel without looking. The fill shifts
 * rose→peach as severity climbs, giving the value a second, pre-attentive
 * channel besides position.
 *
 * The gesture runs entirely on the UI thread; only the committed step crosses
 * back to JS.
 */
const Severity = ({ label, value, onChange }: SeverityProps) => {
  const { colors: c } = useTheme();
  const [width, setWidth] = useState(0);
  const usable = Math.max(width - KNOB, 1);
  const step = usable / (STEPS - 1);

  const x = useSharedValue(0);
  const active = useSharedValue(0);
  const lastStep = useSharedValue(value);

  useEffect(() => {
    if (width > 0) x.value = withSpring((value - 1) * step, MOTION.spring);
  }, [value, step, width, x]);

  const commit = (v: number) => onChange(v);
  const tick = () => Haptics.selectionAsync().catch(() => {});

  const pan = Gesture.Pan()
    .onBegin(() => {
      active.value = withSpring(1, MOTION.springSnap);
    })
    .onUpdate((e) => {
      // e.x is relative to the gesture view, so the knob tracks the finger
      // regardless of where the row sits on screen.
      const next = Math.min(Math.max(e.x - KNOB / 2, 0), usable);
      x.value = next;
      const s = Math.round(next / step) + 1;
      if (s !== lastStep.value) {
        lastStep.value = s;
        runOnJS(tick)();
        runOnJS(commit)(s);
      }
    })
    .onFinalize(() => {
      active.value = withSpring(0, MOTION.spring);
      x.value = withSpring((lastStep.value - 1) * step, MOTION.spring);
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scale: 1 + active.value * 0.18 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: x.value + KNOB / 2,
    backgroundColor: interpolateColor(
      x.value / usable,
      [0, 0.5, 1],
      [COLORS.primary, COLORS.accent, COLORS.warning]
    ),
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text variant="subhead">{label}</Text>
        <Text variant="caption" tone="secondary">
          {WORDS[value - 1]}
        </Text>
      </View>

      <GestureDetector gesture={pan}>
        <View
          style={styles.hit}
          onLayout={onLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${label} severity`}
          accessibilityValue={{ min: 1, max: 5, now: value, text: WORDS[value - 1] }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'increment') onChange(Math.min(5, value + 1));
            if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(1, value - 1));
          }}
        >
          <View style={[styles.track, { backgroundColor: c.fill }]}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>

          {/* Step ticks sit under the track so the scale is legible at rest. */}
          <View style={styles.ticks} pointerEvents="none">
            {Array.from({ length: STEPS }).map((_, i) => (
              <View key={i} style={[styles.tick, { backgroundColor: c.textTertiary }]} />
            ))}
          </View>

          <Animated.View style={[styles.knob, { backgroundColor: c.card }, knobStyle]} />
        </View>
      </GestureDetector>
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
  hit: { height: KNOB + 8, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  ticks: {
    position: 'absolute',
    left: KNOB / 2,
    right: KNOB / 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tick: { width: 2, height: 2, borderRadius: 1, opacity: 0.5 },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    shadowColor: '#1E1E22',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default Severity;
