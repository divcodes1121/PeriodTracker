import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDaysInMonth,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import Text from './Text';
import Icon from './Icon';
import Button from './Button';
import Surface from './Surface';
import { useTheme } from '../theme/useTheme';
import { COLORS } from '../constants';
import { RADIUS, SPACE, MOTION, MIN_TAP } from '../theme/tokens';
import { CONTENT_MAX_WIDTH } from '../utils/responsive';

type Variant = 'calendar' | 'wheel';

interface DateFieldProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  /**
   * 'calendar' (default) — month grid, best for nearby dates (last period).
   * 'wheel' — day/month/year columns, best for far dates (date of birth).
   */
  variant?: Variant;
}

const ITEM_H = 44;
const VISIBLE = 5;
const WHEEL_H = ITEM_H * VISIBLE;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = Array.from({ length: 12 }, (_, m) => format(new Date(2000, m, 1), 'MMM'));

const clampDate = (d: Date, min?: Date, max?: Date): Date => {
  let out = d;
  if (min && out < startOfDay(min)) out = startOfDay(min);
  if (max && out > startOfDay(max)) out = startOfDay(max);
  return out;
};

/* ------------------------------ Wheel picker ------------------------------ */

interface WheelColumnProps {
  values: string[];
  index: number;
  onIndex: (i: number) => void;
  flex: number;
}

/**
 * One snap-scrolling wheel column. Rows are also tappable — the tap scrolls
 * the row into the center band and selects it, which doubles as the a11y and
 * web-friendly path.
 */
const WheelColumn = memo(function WheelColumn({ values, index, onIndex, flex }: WheelColumnProps) {
  const { colors: c } = useTheme();
  const ref = useRef<ScrollView>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      // Center the initial value without animation once laid out.
      setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_H, animated: false }), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = (y: number) => {
    const i = Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM_H)));
    if (i !== index) {
      Haptics.selectionAsync().catch(() => {});
      onIndex(i);
    }
  };

  return (
    <ScrollView
      ref={ref}
      style={{ flex, height: WHEEL_H }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.y)}
      contentContainerStyle={{ paddingVertical: (WHEEL_H - ITEM_H) / 2 }}
    >
      {values.map((v, i) => (
        <Pressable
          key={`${v}-${i}`}
          accessibilityRole="button"
          accessibilityLabel={v}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
            onIndex(i);
          }}
          style={styles.wheelRow}
        >
          <Text
            variant={i === index ? 'headline' : 'body'}
            color={i === index ? c.text : c.textTertiary}
            tabular
          >
            {v}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
});

function WheelPicker({
  draft,
  onDraft,
  minimumDate,
  maximumDate,
}: {
  draft: Date;
  onDraft: (d: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { colors: c } = useTheme();
  const minYear = minimumDate ? minimumDate.getFullYear() : 1940;
  const maxYear = maximumDate ? maximumDate.getFullYear() : new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i)),
    [minYear, maxYear]
  );
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1)), []);

  // The wheel allows impossible combinations (Feb 31) while spinning; the
  // draft is clamped to a real date immediately, so the preview stays honest.
  const set = (part: 'd' | 'm' | 'y', i: number) => {
    const y = part === 'y' ? minYear + i : draft.getFullYear();
    const m = part === 'm' ? i : draft.getMonth();
    const d = part === 'd' ? i + 1 : draft.getDate();
    onDraft(new Date(y, m, Math.min(d, getDaysInMonth(new Date(y, m, 1)))));
  };

  return (
    <View style={styles.wheelWrap}>
      {/* Center selection band */}
      <View pointerEvents="none" style={[styles.wheelBand, { backgroundColor: `${COLORS.primary}14` }]} />
      <View style={styles.wheelRowWrap}>
        <WheelColumn values={days} index={draft.getDate() - 1} onIndex={(i) => set('d', i)} flex={0.8} />
        <WheelColumn values={MONTHS} index={draft.getMonth()} onIndex={(i) => set('m', i)} flex={1} />
        <WheelColumn
          values={years}
          index={Math.min(years.length - 1, Math.max(0, draft.getFullYear() - minYear))}
          onIndex={(i) => set('y', i)}
          flex={1}
        />
      </View>
      {/* Edge fades so the wheel reads as a curved surface */}
      <LinearGradient
        pointerEvents="none"
        colors={[c.card, `${c.card}00`]}
        style={[styles.wheelFade, { top: 0 }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[`${c.card}00`, c.card]}
        style={[styles.wheelFade, { bottom: 0 }]}
      />
    </View>
  );
}

/* ---------------------------- Calendar picker ----------------------------- */

function CalendarPicker({
  draft,
  onDraft,
  minimumDate,
  maximumDate,
}: {
  draft: Date;
  onDraft: (d: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const { colors: c } = useTheme();
  const [month, setMonth] = useState(startOfMonth(draft));

  useEffect(() => setMonth(startOfMonth(draft)), [draft]);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }),
    [month]
  );
  const cells: (Date | null)[] = [...Array(startOfMonth(month).getDay()).fill(null), ...days];

  const outOfRange = (d: Date) =>
    (minimumDate ? d < startOfDay(minimumDate) : false) ||
    (maximumDate ? d > startOfDay(maximumDate) : false);

  const nav = (dir: number) => {
    Haptics.selectionAsync().catch(() => {});
    setMonth((m) => (dir < 0 ? subMonths(m, 1) : addMonths(m, 1)));
  };

  return (
    <View>
      <View style={styles.calNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={8}
          onPress={() => nav(-1)}
          style={[styles.calNavBtn, { backgroundColor: c.fill }]}
        >
          <Icon name="chevronLeft" size={16} color={c.textSecondary} />
        </Pressable>
        <Animated.View key={format(month, 'yyyy-MM')} entering={FadeIn.duration(MOTION.fast)}>
          <Text variant="headline">{format(month, 'MMMM yyyy')}</Text>
        </Animated.View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={8}
          onPress={() => nav(1)}
          style={[styles.calNavBtn, { backgroundColor: c.fill }]}
        >
          <Icon name="chevronRight" size={16} color={c.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.calWeekRow}>
        {WEEKDAYS.map((d, i) => (
          <View key={i} style={styles.calCell}>
            <Text variant="overline" tone="tertiary">
              {d}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.calGrid}>
        {cells.map((day, i) =>
          day ? (
            <CalendarDay
              key={day.toISOString()}
              day={day}
              selected={isSameDay(day, draft)}
              today={isToday(day)}
              disabled={outOfRange(day)}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onDraft(startOfDay(day));
              }}
            />
          ) : (
            <View key={`b-${i}`} style={styles.calCell} />
          )
        )}
      </View>
    </View>
  );
}

const CalendarDay = memo(function CalendarDay({
  day,
  selected,
  today,
  disabled,
  onPress,
}: {
  day: Date;
  selected: boolean;
  today: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors: c } = useTheme();
  const pop = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    pop.value = withSpring(selected ? 1 : 0, MOTION.springSnap);
  }, [selected, pop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pop.value * 0.08 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={format(day, 'MMMM d, yyyy')}
      disabled={disabled}
      onPress={onPress}
      style={styles.calCell}
    >
      <Animated.View
        style={[
          styles.calDay,
          selected && { backgroundColor: COLORS.primaryDark },
          today && !selected && { borderWidth: 1.5, borderColor: COLORS.primaryDark },
          style,
        ]}
      >
        <Text
          variant="callout"
          color={selected ? '#FFFFFF' : disabled ? c.textTertiary : c.text}
          style={[{ opacity: disabled ? 0.45 : 1 }, (selected || today) && { fontWeight: '600' }]}
          tabular
        >
          {format(day, 'd')}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

/* --------------------------------- Field ---------------------------------- */

/**
 * Date input with a hand-built picker sheet — the same experience on iOS,
 * Android and web (no native module, no typed YYYY-MM-DD fallback).
 *
 * The trigger is a filled field; tapping it slides up a sheet holding either a
 * month-grid calendar (nearby dates) or a day/month/year wheel (birthdays),
 * plus quick chips when "today / yesterday" are likely answers. The draft is
 * only committed on "Set date", so exploring is free.
 */
const DateField = ({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  maximumDate,
  minimumDate,
  variant = 'calendar',
}: DateFieldProps) => {
  const { colors: c, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(new Date());
  const press = useSharedValue(0);

  const today = startOfDay(new Date());
  const defaultDraft = () =>
    clampDate(
      value ?? (variant === 'wheel' ? subYears(today, 25) : today),
      minimumDate,
      maximumDate
    );

  const openSheet = () => {
    Haptics.selectionAsync().catch(() => {});
    setDraft(defaultDraft());
    setOpen(true);
  };

  const confirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onChange(clampDate(startOfDay(draft), minimumDate, maximumDate));
    setOpen(false);
  };

  const chipDates = useMemo(() => {
    if (variant !== 'calendar') return [];
    const candidates = [
      { label: 'Today', date: today },
      { label: 'Yesterday', date: subDays(today, 1) },
    ];
    return candidates.filter(
      ({ date }) =>
        !(minimumDate && date < startOfDay(minimumDate)) &&
        !(maximumDate && date > startOfDay(maximumDate))
    );
  }, [variant, today, minimumDate, maximumDate]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.012 }],
  }));

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.sm }}>
          {label}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Select a date'}
        accessibilityValue={{ text: value ? format(value, 'MMMM d, yyyy') : 'none' }}
        onPressIn={() => (press.value = withSpring(1, MOTION.springSnap))}
        onPressOut={() => (press.value = withSpring(0, MOTION.spring))}
        onPress={openSheet}
      >
        <Animated.View style={[styles.field, { backgroundColor: c.inputBg }, pressStyle]}>
          <Text variant="body" color={value ? c.text : c.textTertiary} style={{ flex: 1 }}>
            {value ? format(value, 'MMMM d, yyyy') : placeholder}
          </Text>
          <View
            style={[
              styles.fieldIcon,
              { backgroundColor: isDark ? 'rgba(217,124,155,0.16)' : COLORS.primarySoft },
            ]}
          >
            <Icon name="calendar" size={15} color={isDark ? COLORS.primary : COLORS.primaryDark} />
          </View>
        </Animated.View>
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={styles.modalRoot}>
          <Animated.View
            entering={FadeIn.duration(MOTION.fast)}
            exiting={FadeOut.duration(MOTION.instant)}
            style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close date picker"
              style={StyleSheet.absoluteFill}
              onPress={() => setOpen(false)}
            />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.springify().damping(19).stiffness(160)}
            style={styles.sheetWrap}
            pointerEvents="box-none"
          >
            <Surface elevation="lg" style={styles.sheet}>
              <View style={[styles.grabber, { backgroundColor: c.fillStrong }]} />

              <Text variant="overline" tone="secondary">
                {label ?? 'Date'}
              </Text>
              <Animated.View key={format(draft, 'yyyy-MM-dd')} entering={FadeIn.duration(MOTION.instant)}>
                <Text variant="title2" style={{ marginTop: 2 }}>
                  {format(draft, 'MMMM d, yyyy')}
                </Text>
              </Animated.View>

              <View style={styles.pickerBody}>
                {variant === 'wheel' ? (
                  <WheelPicker draft={draft} onDraft={setDraft} minimumDate={minimumDate} maximumDate={maximumDate} />
                ) : (
                  <CalendarPicker draft={draft} onDraft={setDraft} minimumDate={minimumDate} maximumDate={maximumDate} />
                )}
              </View>

              {chipDates.length > 0 && (
                <View style={styles.chips}>
                  {chipDates.map(({ label: chip, date }) => (
                    <Pressable
                      key={chip}
                      accessibilityRole="button"
                      accessibilityLabel={chip}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setDraft(date);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSameDay(draft, date)
                            ? isDark
                              ? 'rgba(217,124,155,0.22)'
                              : `${COLORS.primary}22`
                            : c.pillBg,
                        },
                      ]}
                    >
                      <Text
                        variant="subhead"
                        color={isSameDay(draft, date) ? (isDark ? c.text : COLORS.primaryDark) : c.textSecondary}
                      >
                        {chip}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Button label="Set date" onPress={confirm} style={{ marginTop: SPACE.lg }} />
            </Surface>
          </Animated.View>
        </View>
      </Modal>
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
    paddingVertical: SPACE.sm,
    minHeight: MIN_TAP + 6,
  },
  fieldIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetWrap: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: SPACE.md,
    paddingBottom: SPACE.md,
  },
  sheet: { borderRadius: RADIUS.sheet },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: SPACE.lg,
  },
  pickerBody: { marginTop: SPACE.lg },

  wheelWrap: { height: WHEEL_H },
  wheelRowWrap: { flexDirection: 'row', gap: SPACE.sm },
  wheelRow: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  wheelBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (WHEEL_H - ITEM_H) / 2,
    height: ITEM_H,
    borderRadius: RADIUS.sm,
  },
  wheelFade: { position: 'absolute', left: 0, right: 0, height: ITEM_H },

  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.md,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calWeekRow: { flexDirection: 'row', marginBottom: SPACE.xs },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chips: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg },
  chip: {
    minHeight: MIN_TAP - 10,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.lg,
    justifyContent: 'center',
  },
});

export default DateField;
