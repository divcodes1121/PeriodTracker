import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import { useTheme } from '../theme/useTheme';
import { usePhaseColor, phaseInk } from '../theme/usePhaseColor';
import { useAppStore } from '../store/appStore';
import {
  getCyclePhase,
  getPhaseRecommendations,
  getCycleDayForDate,
  deriveCycleContext,
  getPhaseRanges,
} from '../utils/cycleCalculations';
import { SPACE, RADIUS, MOTION, MIN_TAP } from '../theme/tokens';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** A single day cell: number, today-ring, selection fill, phase dot. */
function DayCell({
  day,
  selected,
  today,
  dimmed,
  phaseColor,
  phaseInk,
  onPress,
}: {
  day: Date;
  selected: boolean;
  today: boolean;
  dimmed: boolean;
  /** Surface-safe hue for the dot and today-ring (≥3:1 on the card). */
  phaseColor: string;
  /** Deep ink for the selected fill, so the white day number clears AA. */
  phaseInk: string;
  onPress: () => void;
}) {
  const { colors: c } = useTheme();
  const press = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.1 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={format(day, 'EEEE, MMMM d')}
      onPressIn={() => (press.value = withSpring(1, MOTION.springSnap))}
      onPressOut={() => (press.value = withSpring(0, MOTION.spring))}
      onPress={onPress}
      style={styles.cell}
    >
      <Animated.View
        style={[
          styles.dayCircle,
          selected && { backgroundColor: phaseInk },
          today && !selected && { borderWidth: 1.5, borderColor: phaseColor },
          style,
        ]}
      >
        <Text
          variant="callout"
          color={selected ? '#FFFFFF' : dimmed ? c.textTertiary : c.text}
          style={selected || today ? { fontWeight: '600' } : undefined}
          tabular
        >
          {format(day, 'd')}
        </Text>
      </Animated.View>
      <View
        style={[
          styles.dot,
          { backgroundColor: selected ? 'transparent' : phaseColor, opacity: dimmed ? 0.3 : 0.75 },
        ]}
      />
    </Pressable>
  );
}

const CalendarScreen = () => {
  const { user, periodEntries } = useAppStore();
  const { colors: c } = useTheme();
  const phaseColor = usePhaseColor();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const cycle = useMemo(
    () => (user ? deriveCycleContext(user, periodEntries) : null),
    [user, periodEntries]
  );

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }),
    [currentMonth]
  );

  const phaseFor = useCallback(
    (date: Date) => {
      if (!cycle) return null;
      const day = getCycleDayForDate(date, cycle.lastPeriodStart, cycle.cycleLength);
      return getCyclePhase(day, cycle.cycleLength, cycle.periodLength);
    },
    [cycle]
  );

  const selectedInfo = useMemo(() => {
    if (!selectedDate || !cycle) return null;
    const day = getCycleDayForDate(selectedDate, cycle.lastPeriodStart, cycle.cycleLength);
    return { day, phase: getCyclePhase(day, cycle.cycleLength, cycle.periodLength) };
  }, [selectedDate, cycle]);

  const legend = useMemo(
    () => (cycle ? getPhaseRanges(cycle.cycleLength, cycle.periodLength) : []),
    [cycle]
  );

  const changeMonth = (dir: number) => {
    Haptics.selectionAsync().catch(() => {});
    setCurrentMonth((m) => (dir < 0 ? subMonths(m, 1) : addMonths(m, 1)));
  };

  const leading = startOfMonth(currentMonth).getDay();
  const cells: (Date | null)[] = [...Array(leading).fill(null), ...days];

  return (
    <Screen title="Calendar">
      <Reveal index={0}>
        <Surface style={{ marginBottom: SPACE.lg }}>
          {/* Month navigation */}
          <View style={styles.monthNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              hitSlop={10}
              onPress={() => changeMonth(-1)}
              style={[styles.navBtn, { backgroundColor: c.fill }]}
            >
              <Icon name="chevronLeft" size={17} color={c.textSecondary} />
            </Pressable>

            <Animated.View key={format(currentMonth, 'yyyy-MM')} entering={FadeIn.duration(MOTION.fast)}>
              <Text variant="headline">{format(currentMonth, 'MMMM yyyy')}</Text>
            </Animated.View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              hitSlop={10}
              onPress={() => changeMonth(1)}
              style={[styles.navBtn, { backgroundColor: c.fill }]}
            >
              <Icon name="chevronRight" size={17} color={c.textSecondary} />
            </Pressable>
          </View>

          {/* Weekday header */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <View key={i} style={styles.weekCell}>
                <Text variant="overline" tone="secondary">
                  {d}
                </Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {cells.map((day, i) =>
              day ? (
                <DayCell
                  key={day.toISOString()}
                  day={day}
                  selected={!!selectedDate && isSameDay(day, selectedDate)}
                  today={isToday(day)}
                  dimmed={!isSameMonth(day, currentMonth)}
                  phaseColor={phaseColor(phaseFor(day)?.name)}
                  phaseInk={phaseInk(phaseFor(day)?.name)}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedDate(day);
                  }}
                />
              ) : (
                <View key={`blank-${i}`} style={styles.cell} />
              )
            )}
          </View>

          {/* Phase legend — derived from the user's own cycle, not a fixed 28 days */}
          <View style={[styles.legend, { borderTopColor: c.separator }]}>
            {legend.map((r) => (
              <View key={r.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: phaseColor(r.key) }]} />
                <Text variant="caption" tone="secondary">
                  {r.key[0].toUpperCase() + r.key.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </Surface>
      </Reveal>

      {/* Selected day panel — expands/collapses in place */}
      {selectedInfo && selectedDate && (
        <Animated.View
          key={selectedDate.toDateString()}
          entering={FadeIn.duration(MOTION.base)}
          exiting={FadeOut.duration(MOTION.instant)}
          layout={LinearTransition.springify().damping(MOTION.springSoft.damping)}
        >
          <Surface>
            <Text variant="overline" tone="secondary">
              {format(selectedDate, 'EEEE, MMMM d')}
            </Text>

            <View style={styles.panelHead}>
              <Text variant="title2">{titleCase(selectedInfo.phase?.name)}</Text>
              <View
                style={[
                  styles.dayBadge,
                  { backgroundColor: `${phaseColor(selectedInfo.phase?.name)}22` },
                ]}
              >
                <Text variant="overline" color={phaseColor(selectedInfo.phase?.name)}>
                  Day {selectedInfo.day}
                </Text>
              </View>
            </View>

            <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.sm }}>
              {selectedInfo.phase?.description}
            </Text>

            <View style={[styles.recs, { borderTopColor: c.separator }]}>
              <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.md }}>
                Suggestions
              </Text>
              {getPhaseRecommendations(selectedInfo.phase?.name ?? null).map((rec) => (
                <View key={rec} style={styles.recRow}>
                  <View style={[styles.recDot, { backgroundColor: c.textTertiary }]} />
                  <Text variant="callout" tone="secondary" style={{ flex: 1 }}>
                    {stripEmoji(rec)}
                  </Text>
                </View>
              ))}
            </View>
          </Surface>
        </Animated.View>
      )}
    </Screen>
  );
};

const titleCase = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : '—');

/**
 * Recommendation copy still carries leading emoji from the constants file.
 * The editorial language uses no decorative emoji, so strip it at the edge
 * rather than forking the data.
 */
const stripEmoji = (s: string) =>
  s.replace(/^[^\p{L}\p{N}]+/u, '').trim();

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.xl,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekRow: { flexDirection: 'row', marginBottom: SPACE.sm },
  weekCell: { flex: 1, alignItems: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    height: MIN_TAP + 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.lg,
    marginTop: SPACE.lg,
    paddingTop: SPACE.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  legendDot: { width: 6, height: 6, borderRadius: 3 },

  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginTop: SPACE.xs,
  },
  dayBadge: {
    paddingHorizontal: SPACE.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },

  recs: {
    marginTop: SPACE.xl,
    paddingTop: SPACE.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.xs },
  recDot: { width: 3, height: 3, borderRadius: 1.5 },
});

export default CalendarScreen;
