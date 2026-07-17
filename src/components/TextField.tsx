import { useState } from 'react';
import { TextInput, StyleSheet, View, TextInputProps } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { COLORS } from '../constants';
import { TYPE, SPACE, RADIUS, MOTION, MIN_TAP } from '../theme/tokens';

interface TextFieldProps extends TextInputProps {
  label?: string;
  /** Trailing unit, e.g. "days". */
  suffix?: string;
}

/**
 * Filled text input. Focus is shown by a ring that fades in rather than a hard
 * border swap, and the field sits on the recessed fill so it reads as an inset
 * in the card rather than another card.
 */
const TextField = ({ label, suffix, style, ...rest }: TextFieldProps) => {
  const { colors: c, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  const ring = useAnimatedStyle(() => ({
    borderColor: withTiming(focused ? COLORS.primary : 'transparent', { duration: MOTION.fast }),
  }));

  // On focus the field lifts to the card surface, so attention reads as light.
  const fieldBg = focused ? (isDark ? c.cardElevated : c.card) : c.inputBg;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text
          variant="overline"
          tone={focused ? undefined : 'secondary'}
          color={focused ? COLORS.primaryDark : undefined}
          style={{ marginBottom: SPACE.sm }}
        >
          {label}
        </Text>
      ) : null}

      <Animated.View style={[styles.field, { backgroundColor: fieldBg }, ring]}>
        <TextInput
          placeholderTextColor={c.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[TYPE.body, styles.input, { color: c.text }, style]}
          {...rest}
        />
        {suffix ? (
          <Text variant="callout" tone="tertiary">
            {suffix}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACE.lg },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    paddingHorizontal: SPACE.lg,
    minHeight: MIN_TAP + 6,
  },
  input: { flex: 1, paddingVertical: SPACE.md },
});

export default TextField;
