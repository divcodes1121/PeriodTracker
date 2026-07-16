import { useMemo, useState } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { format, isSameDay, differenceInDays } from 'date-fns';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { v4 as uuidv4 } from 'uuid';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Button from '../components/Button';
import Pill from '../components/Pill';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import DateField from '../components/DateField';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/appStore';
import { PeriodEntry } from '../types';
import { FLOW_INTENSITY, COLORS } from '../constants';
import { SPACE, RADIUS, MOTION } from '../theme/tokens';

type Flow = 'light' | 'medium' | 'heavy';
const FLOWS: Flow[] = ['light', 'medium', 'heavy'];

const PeriodLoggerScreen = ({ navigation }: any) => {
  const { user, periodEntries, addPeriodEntry, deletePeriodEntry } = useAppStore();
  const { colors: c } = useTheme();

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [flow, setFlow] = useState<Flow>('medium');

  const recent = useMemo(
    () =>
      [...periodEntries]
        .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
        .slice(0, 6),
    [periodEntries]
  );

  const handleSave = () => {
    if (!user) return;
    if (endDate && endDate < startDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('Check the dates', 'The end date must be on or after the start date.');
      return;
    }
    if (periodEntries.some((e) => isSameDay(e.startDate, startDate))) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('Already logged', 'A period is already logged with that start date.');
      return;
    }

    const now = new Date();
    const entry: PeriodEntry = {
      id: uuidv4(),
      userId: user.id,
      startDate,
      endDate,
      flowIntensity: flow,
      symptoms: [],
      mood: null,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    addPeriodEntry(entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('Period logged', 'Your predictions now use your logged periods.');
    navigation.goBack();
  };

  const confirmDelete = (id: string) => {
    Alert.alert('Delete this period?', 'It will be removed from your history and predictions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          deletePeriodEntry(id);
        },
      },
    ]);
  };

  return (
    <Screen title="Log period" subtitle="This is what makes predictions yours">
      {/* Dates */}
      <Reveal index={0}>
        <Surface style={{ marginBottom: SPACE.lg }}>
          <DateField
            label="Started"
            value={startDate}
            onChange={setStartDate}
            maximumDate={new Date()}
          />
          <DateField
            label="Ended"
            value={endDate}
            onChange={setEndDate}
            placeholder="Still ongoing"
            minimumDate={startDate}
            maximumDate={new Date()}
          />
        </Surface>
      </Reveal>

      {/* Flow */}
      <Reveal index={1}>
        <Surface style={{ marginBottom: SPACE.xl }}>
          <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.lg }}>
            Flow
          </Text>
          <View style={styles.pills}>
            {FLOWS.map((f) => (
              <Pill
                key={f}
                label={FLOW_INTENSITY[f].label}
                icon="drop"
                selected={flow === f}
                onPress={() => setFlow(f)}
                accent={COLORS.menstrual}
              />
            ))}
          </View>
        </Surface>
      </Reveal>

      <Reveal index={2}>
        <Button label="Save period" onPress={handleSave} accent={COLORS.menstrual} />
      </Reveal>

      {/* History */}
      <Reveal index={3}>
        <Text variant="overline" tone="secondary" style={styles.historyLabel}>
          History
        </Text>
        <Surface>
          {recent.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: COLORS.primarySoft }]}>
                <Icon name="drop" size={18} color={COLORS.primaryDark} />
              </View>
              <Text variant="callout" tone="secondary" style={{ flex: 1 }}>
                Nothing logged yet. Your first entry starts your real cycle history.
              </Text>
            </View>
          ) : (
            recent.map((p, i) => (
              <Animated.View
                key={p.id}
                entering={FadeIn.duration(MOTION.fast)}
                exiting={FadeOut.duration(MOTION.instant)}
                layout={LinearTransition.springify().damping(MOTION.springSoft.damping)}
              >
                <View style={[styles.row, i > 0 && { borderTopColor: c.separator, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[styles.dot, { backgroundColor: COLORS.menstrual }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body">
                      {format(p.startDate, 'MMM d, yyyy')}
                      {p.endDate ? ` – ${format(p.endDate, 'MMM d')}` : ''}
                    </Text>
                    <Text variant="caption" tone="tertiary" style={{ marginTop: 1 }}>
                      {FLOW_INTENSITY[p.flowIntensity].label} flow
                      {p.endDate
                        ? ` · ${differenceInDays(p.endDate, p.startDate) + 1} days`
                        : ' · ongoing'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete period from ${format(p.startDate, 'MMMM d')}`}
                    hitSlop={10}
                    onPress={() => confirmDelete(p.id)}
                  >
                    <Icon name="trash" size={17} color={c.textTertiary} />
                  </Pressable>
                </View>
              </Animated.View>
            ))
          )}
        </Surface>
      </Reveal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', gap: SPACE.sm },
  historyLabel: { marginTop: SPACE.h1, marginBottom: SPACE.md, marginLeft: SPACE.xs },
  empty: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

export default PeriodLoggerScreen;
