import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
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
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';
import { useAppStore } from '../store/appStore';
import {
  getCyclePhase,
  getPhaseRecommendations,
} from '../utils/cycleCalculations';
import Button from '../components/Button';
import Card from '../components/Card';

const CalendarScreen = ({ navigation }: any) => {
  const { user } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const daysInMonth = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  const getCycleDayForDate = React.useCallback(
    (date: Date): number | null => {
      if (!user) return null;
      const daysSinceStart = Math.floor(
        (date.getTime() - user.lastPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const dayOfCycle = (daysSinceStart % user.cycleLength) + 1;
      return dayOfCycle > 0 && dayOfCycle <= user.cycleLength ? dayOfCycle : null;
    },
    [user]
  );

  const getPhaseColorForDate = (date: Date): string => {
    const dayOfCycle = getCycleDayForDate(date);
    if (!dayOfCycle) return COLORS.textTertiary;
    const phase = getCyclePhase(dayOfCycle);
    return phase?.color || COLORS.textTertiary;
  };

  const selectedDateInfo = useMemo(() => {
    if (!selectedDate) return null;
    const dayOfCycle = getCycleDayForDate(selectedDate);
    if (!dayOfCycle) return null;
    const phase = getCyclePhase(dayOfCycle);
    return {
      dayOfCycle,
      phase,
      date: selectedDate,
    };
  }, [getCycleDayForDate, selectedDate]);

  const renderCalendarDay = ({ item }: { item: Date }) => {
    const isCurrentMonth = isSameMonth(item, currentMonth);
    const isSelected = selectedDate && isSameDay(item, selectedDate);
    const phaseColor = getPhaseColorForDate(item);
    const dayOfCycle = getCycleDayForDate(item);

    return (
      <TouchableOpacity
        style={[styles.dayCell, isSelected && styles.selectedDay]}
        onPress={() => setSelectedDate(item)}
      >
        <View
          style={[
            styles.dayCircle,
            !isCurrentMonth && styles.otherMonthDay,
            isSelected && styles.selectedDayCircle,
            { backgroundColor: isSelected ? phaseColor : 'transparent' },
          ]}
        >
          <Text
            style={[
              styles.dayText,
              !isCurrentMonth && styles.otherMonthText,
              isSelected && styles.selectedDayText,
            ]}
          >
            {format(item, 'd')}
          </Text>
          {isCurrentMonth && dayOfCycle && (
            <View
              style={[
                styles.phaseIndicator,
                { backgroundColor: isSelected ? COLORS.white : phaseColor },
              ]}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const paddedDays = Array(monthStart.getDay())
    .fill(null)
    .map(() => new Date(0))
    .concat(daysInMonth);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={TYPOGRAPHY.h2}>📅 Your Cycle Calendar</Text>
        </View>

        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <Button
            title="←"
            onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
            variant="outline"
            size="small"
          />
          <Text style={TYPOGRAPHY.h3}>{format(currentMonth, 'MMMM yyyy')}</Text>
          <Button
            title="→"
            onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
            variant="outline"
            size="small"
          />
        </View>

        {/* Day Labels */}
        <View style={styles.dayLabels}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.dayLabel}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          <FlatList
            data={paddedDays.slice(0, 42)}
            renderItem={renderCalendarDay}
            keyExtractor={(item, index) => `${index}`}
            numColumns={7}
            scrollEnabled={false}
            columnWrapperStyle={styles.row}
          />
        </View>

        {/* Legend */}
        <Card style={styles.legendCard}>
          <Text style={TYPOGRAPHY.h4}>Phase Colors</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.menstrual }]} />
              <Text style={TYPOGRAPHY.caption}>Menstrual</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.follicular }]} />
              <Text style={TYPOGRAPHY.caption}>Follicular</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.ovulation }]} />
              <Text style={TYPOGRAPHY.caption}>Ovulation</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: COLORS.luteal }]} />
              <Text style={TYPOGRAPHY.caption}>Luteal</Text>
            </View>
          </View>
        </Card>

        {/* Selected Date Info */}
        {selectedDateInfo && (
          <Card style={styles.infoCard}>
            <Text style={TYPOGRAPHY.h4}>
              {format(selectedDateInfo.date, 'EEEE, MMMM d')} (Day{' '}
              {selectedDateInfo.dayOfCycle})
            </Text>
            <View style={styles.phaseContainer}>
              <View
                style={[
                  styles.phaseBadge,
                  { backgroundColor: selectedDateInfo.phase?.color },
                ]}
              >
                <Text style={[TYPOGRAPHY.button, { color: COLORS.white }]}>
                  {selectedDateInfo.phase?.name}
                </Text>
              </View>
              <Text style={[TYPOGRAPHY.body2, { marginTop: SPACING.md }]}>
                {selectedDateInfo.phase?.description}
              </Text>
            </View>

            {/* Recommendations */}
            <View style={styles.recommendationsSection}>
              <Text style={TYPOGRAPHY.h4}>💡 Recommendations</Text>
              {getPhaseRecommendations((selectedDateInfo.phase?.name as string) || null).map((rec, idx) => (
                <Text key={idx} style={[TYPOGRAPHY.body2, { marginTop: SPACING.sm }]}>
                  • {rec}
                </Text>
              ))}
            </View>
          </Card>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  dayLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  dayLabel: {
    ...TYPOGRAPHY.caption,
    flex: 1,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  calendarGrid: {
    marginBottom: SPACING.xl,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: '85%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.divider,
  },
  selectedDay: {},
  selectedDayCircle: {
    borderColor: COLORS.primary,
  },
  dayText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.text,
  },
  selectedDayText: {
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthText: {
    color: COLORS.textTertiary,
  },
  phaseIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendCard: {
    marginBottom: SPACING.lg,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  infoCard: {
    marginBottom: SPACING.lg,
  },
  phaseContainer: {
    marginTop: SPACING.md,
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  recommendationsSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
});

export default CalendarScreen;
