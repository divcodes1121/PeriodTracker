import { useState } from 'react';
import { View, TextInput, Platform, StyleSheet, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isValid, parseISO } from 'date-fns';
import Text from './Text';
import Icon from './Icon';
import { useTheme } from '../theme/useTheme';
import { COLORS } from '../constants';
import { TYPE, SPACE, RADIUS, MIN_TAP } from '../theme/tokens';

interface DateFieldProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

/**
 * Cross-platform date input.
 * - iOS/Android: native picker (bundled in Expo Go).
 * - Web: the native picker is unsupported, so we fall back to a typed
 *   YYYY-MM-DD field that parses on change.
 */
const DateField = ({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  maximumDate,
  minimumDate,
}: DateFieldProps) => {
  const { colors: c } = useTheme();
  const [show, setShow] = useState(false);
  const [webText, setWebText] = useState(value ? format(value, 'yyyy-MM-dd') : '');

  const handleNativeChange = (_e: unknown, selected?: Date) => {
    // Android closes on selection; iOS stays open until the user taps Done.
    setShow(Platform.OS === 'ios');
    if (selected) onChange(selected);
  };

  const handleWebChange = (text: string) => {
    setWebText(text);
    const parsed = parseISO(text);
    if (isValid(parsed)) onChange(parsed);
  };

  const labelNode = label ? (
    <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.sm }}>
      {label}
    </Text>
  ) : null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        {labelNode}
        <View style={[styles.field, { backgroundColor: c.inputBg }]}>
          <TextInput
            value={webText}
            onChangeText={handleWebChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={c.textTertiary}
            style={[TYPE.body, styles.input, { color: c.text }]}
            autoCapitalize="none"
          />
          <Icon name="calendar" size={18} color={c.textTertiary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {labelNode}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Select a date'}
        accessibilityValue={{ text: value ? format(value, 'MMMM d, yyyy') : 'none' }}
        style={[styles.field, { backgroundColor: c.inputBg }]}
        onPress={() => setShow(true)}
      >
        <Text variant="body" color={value ? c.text : c.textTertiary} style={{ flex: 1 }}>
          {value ? format(value, 'MMMM d, yyyy') : placeholder}
        </Text>
        <Icon name="calendar" size={18} color={c.textTertiary} />
      </Pressable>

      {show && (
        <View>
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={handleNativeChange}
          />
          {Platform.OS === 'ios' && (
            <Pressable
              accessibilityRole="button"
              style={styles.done}
              onPress={() => setShow(false)}
            >
              <Text variant="button" color={COLORS.primaryDark}>
                Done
              </Text>
            </Pressable>
          )}
        </View>
      )}
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
    paddingHorizontal: SPACE.lg,
    minHeight: MIN_TAP + 6,
  },
  input: { flex: 1, paddingVertical: SPACE.md },
  done: { alignSelf: 'flex-end', paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md },
});

export default DateField;
