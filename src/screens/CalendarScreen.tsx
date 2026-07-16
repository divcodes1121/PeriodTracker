import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';
import { fontScale, scale } from '../utils/responsive';
import { useTheme } from '../theme/useTheme';
import type { ThemePalette } from '../theme/palette';
import { useAppStore } from '../store/appStore';
import {
  getCyclePhase,
  getPhaseRecommendations,
  getCycleDayForDate,
  deriveCycleContext,
} from '../utils/cycleCalculations';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import Ripple from '../components/Ripple';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarScreen = () => {
  const { user, periodEntries } = useAppStore();
  const { colors: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const cycle = useMemo(
    () => (user ? deriveCycleContext(user, periodEntries) : null),
    [user, periodEntries]
  );

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const daysInMonth = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  const cycleDayFor = React.useCallback(
    (date: Date): number | null =>
      cycle ? getCycleDayForDate(date, cycle.lastPeriodStart, cycle.cycleLength) : null,
    [cycle]
  );

  const getPhaseColorForDate = (date: Date): string => {
    const dayOfCycle = cycleDayFor(date);
    if (!dayOfCycle || !cycle) return c.textTertiary;
    return getCyclePhase(dayOfCycle, cycle.cycleLength, cycle.periodLength)?.color || c.textTertiary;
  };

  const selectedDateInfo = useMemo(() => {
    if (!selectedDate || !cycle) return null;
    const dayOfCycle = cycleDayFor(selectedDate);
    if (!dayOfCycle) return null;
    return {
      dayOfCycle,
      phase: getCyclePhase(dayOfCycle, cycle.cycleLength, cycle.periodLength),
      date: selectedDate,
    };
  }, [cycleDayFor, selectedDate, cycle]);

  const leadingBlanks = monthStart.getDay();
  const cells: (Date | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...daysInMonth,
  ];

  const changeMonth = (dir: number) => {
    Haptics.selectionAsync().catch(() => {});
    setCurrentMonth(dir < 0 ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

  const selectDay = (day: Date) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedDate(day);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <Text style={styles.title}>Calendar</Text>
            <Text style={styles.subtitle}>Your cycle, month by month</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <GlassCard style={styles.calendarCard}>
              {/* Month nav */}
              <View style={styles.monthNav}>
                <Ripple onPress={() => changeMonth(-1)} borderRadius={999} style={styles.navBtn}>
                  <Text style={styles.navArrow}>‹</Text>
                </Ripple>
                <Text style={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy')}</Text>
                <Ripple onPress={() => changeMonth(1)} borderRadius={999} style={styles.navBtn}>
                  <Text style={styles.navArrow}>›</Text>
                </Ripple>
              </View>

              {/* Weekday labels */}
              <View style={styles.weekRow}>
                {WEEKDAYS.map((d) => (
                  <Text key={d} style={styles.weekday}>{d}</Text>
                ))}
              </View>

              {/* Day grid */}
              <View style={styles.grid}>
                {cells.map((day, i) => {
                  if (!day) return <View key={`b-${i}`} style={styles.cell} />;
                  const isCurrent = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const phaseColor = getPhaseColorForDate(day);
                  const cycleDay = cycleDayFor(day);
                  return (
                    <Pressable key={day.toISOString()} style={styles.cell} onPress={() => selectDay(day)}>
                      <View
                        style={[
                          styles.dayCircle,
                          isSelected && { backgroundColor: phaseColor, borderColor: phaseColor },
                        ]}
                      >
                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                          {format(day, 'd')}
                        </Text>
                      </View>
                      {isCurrent && cycleDay && (
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: isSelected ? COLORS.white : phaseColor },
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Legend */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>Phase colors</Text>
              <View style={styles.legendRow}>
                {[
                  ['Menstrual', COLORS.menstrual],
                  ['Follicular', COLORS.follicular],
                  ['Ovulation', COLORS.ovulation],
                  ['Luteal', COLORS.luteal],
                ].map(([label, color]) => (
                  <View key={label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color as string }]} />
                    <Text style={styles.legendText}>{label}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Selected day info */}
          {selectedDateInfo && (
            <Animated.View entering={FadeInDown.delay(280).springify()}>
              <GlassCard style={styles.card}>
                <Text style={styles.cardTitle}>
                  {format(selectedDateInfo.date, 'EEEE, MMMM d')} · Day {selectedDateInfo.dayOfCycle}
                </Text>
                <View style={[styles.phaseBadge, { backgroundColor: selectedDateInfo.phase?.color }]}>
                  <Text style={styles.phaseBadgeText}>{selectedDateInfo.phase?.name}</Text>
                </View>
                <Text style={styles.phaseDesc}>{selectedDateInfo.phase?.description}</Text>

                <View style={styles.recSection}>
                  <Text style={styles.recTitle}>💡 Recommendations</Text>
                  {getPhaseRecommendations((selectedDateInfo.phase?.name as string) || null).map(
                    (rec, idx) => (
                      <Text key={idx} style={styles.recItem}>• {rec}</Text>
                    )
                  )}
                </View>
              </GlassCard>
            </Animated.View>
          )}

          <View style={{ height: scale(110) }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const makeStyles = (c: ThemePalette) =>
  StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.lg },
  scroll: { paddingTop: SPACING.md },
  header: { marginTop: SPACING.md, marginBottom: SPACING.lg },
  title: { ...TYPOGRAPHY.h2, fontSize: fontScale(28), color: c.text },
  subtitle: { ...TYPOGRAPHY.body2, color: c.textSecondary, marginTop: 2 },

  calendarCard: { marginBottom: SPACING.lg },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.pillBg,
  },
  navArrow: { fontSize: 26, color: COLORS.primary, lineHeight: 30 },
  monthLabel: { ...TYPOGRAPHY.h4, color: c.text },

  weekRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  weekday: { flex: 1, textAlign: 'center', ...TYPOGRAPHY.caption, color: c.textSecondary },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: '78%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayText: { ...TYPOGRAPHY.body2, color: c.text },
  dayTextSelected: { color: COLORS.white, fontWeight: '700' },
  dot: { position: 'absolute', bottom: scale(6), width: 5, height: 5, borderRadius: 2.5 },

  card: { marginBottom: SPACING.lg },
  cardTitle: { ...TYPOGRAPHY.h4, color: c.text, marginBottom: SPACING.md },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { ...TYPOGRAPHY.caption, color: c.text },

  phaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: 999,
  },
  phaseBadgeText: { ...TYPOGRAPHY.caption, color: COLORS.white, fontWeight: '700' },
  phaseDesc: { ...TYPOGRAPHY.body2, color: c.textSecondary, marginTop: SPACING.md },
  recSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: c.divider,
  },
  recTitle: { ...TYPOGRAPHY.h4, color: c.text, marginBottom: SPACING.sm },
  recItem: { ...TYPOGRAPHY.body2, color: c.textSecondary, marginTop: SPACING.xs },
});

export default CalendarScreen;
