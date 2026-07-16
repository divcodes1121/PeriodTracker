import { useEffect } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  createAnimatedPropAdapter,
  processColor,
} from 'react-native-reanimated';
import { TextInput } from 'react-native';
import { TYPE, TABULAR, MOTION } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * Counts up to `value` on the UI thread.
 *
 * Implementation note: this drives a read-only TextInput's `text` prop rather
 * than a <Text> child, because RN can't animate text children from a worklet —
 * mutating a prop is the only way to keep the count off the JS thread. Tabular
 * figures stop the glyphs jittering as digits change.
 */
const adapter = createAnimatedPropAdapter(
  (props) => {
    'worklet';
    if (Object.keys(props).includes('color')) {
      props.color = processColor(props.color as string) as never;
    }
  },
  ['color']
);

interface AnimatedNumberProps {
  value: number;
  variant?: keyof typeof TYPE;
  color?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}

const AnimatedNumber = ({
  value,
  variant = 'display',
  color,
  style,
  duration = MOTION.slow,
}: AnimatedNumberProps) => {
  const { colors: c } = useTheme();
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withTiming(value, {
      duration,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [value, duration, animated]);

  const props = useAnimatedProps(
    () => ({ text: String(Math.round(animated.value)) }) as never,
    [],
    adapter
  );

  return (
    <AnimatedTextInput
      editable={false}
      // The live value is exposed to assistive tech; the input itself is inert.
      accessibilityElementsHidden
      importantForAccessibility="no"
      underlineColorAndroid="transparent"
      value={String(value)}
      animatedProps={props}
      style={[
        TYPE[variant],
        TABULAR,
        { color: color ?? c.text, padding: 0, margin: 0, borderWidth: 0 },
        style,
      ]}
    />
  );
};

export default AnimatedNumber;
