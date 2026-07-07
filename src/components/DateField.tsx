import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isValid, parseISO } from 'date-fns';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';
import { useTheme } from '../theme/useTheme';

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
const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  maximumDate,
  minimumDate,
}) => {
  const { colors: c } = useTheme();
  const [show, setShow] = useState(false);
  const [webText, setWebText] = useState(value ? format(value, 'yyyy-MM-dd') : '');
  const fieldStyle = { backgroundColor: c.inputBg, borderWidth: 1, borderColor: c.inputBorder };

  const handleNativeChange = (_event: unknown, selected?: Date) => {
    // Android closes on selection; iOS stays open until the user taps Done.
    setShow(Platform.OS === 'ios');
    if (selected) onChange(selected);
  };

  const handleWebChange = (text: string) => {
    setWebText(text);
    const parsed = parseISO(text);
    if (isValid(parsed)) onChange(parsed);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrapper}>
        {label ? <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text> : null}
        <TextInput
          value={webText}
          onChangeText={handleWebChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.textTertiary}
          style={[styles.input, fieldStyle, { color: c.text }]}
          autoCapitalize="none"
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.input, fieldStyle]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={[value ? styles.valueText : styles.placeholderText, { color: value ? c.text : c.textTertiary }]}>
          {value ? format(value, 'MMMM d, yyyy') : placeholder}
        </Text>
      </TouchableOpacity>

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
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShow(false)}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  valueText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.text,
  },
  placeholderText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textTertiary,
  },
  doneButton: {
    alignSelf: 'flex-end',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  doneText: {
    ...TYPOGRAPHY.button,
    color: COLORS.primary,
  },
});

export default DateField;
