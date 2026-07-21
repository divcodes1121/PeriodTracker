import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
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
import Notice from '../components/Notice';
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
  /**
   * Delete confirmation is inline rather than an Alert.
   *
   * RN-web's Alert.alert is a no-op, so the previous modal confirm meant the
   * Delete button simply did not exist on web and entries could never be
   * removed at all. Inline confirmation works identically on every platform,
   * and it keeps the entry you are about to delete visible while you decide —
   * which a modal covering the list does not.
   */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  /** Validation feedback, for the same reason. */
  const [notice, setNotice] = useState<string | null>(null);

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
      setNotice('The end date must be on or after the start date.');
      return;
    }
    if (periodEntries.some((e) => isSameDay(e.startDate, startDate))) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setNotice('A period is already logged with that start date.');
      return;
    }
    setNotice(null);

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
    navigation.goBack();
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    deletePeriodEntry(id);
    setPendingDelete(null);
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
        <Notice message={notice} />
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
                  {pendingDelete === p.id ? (
                    <Animated.View
                      entering={FadeIn.duration(MOTION.instant)}
                      style={styles.confirmRow}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cancel delete"
                        hitSlop={8}
                        onPress={() => setPendingDelete(null)}
                        style={[styles.confirmBtn, { backgroundColor: c.fill }]}
                      >
                        <Text variant="caption" tone="secondary">
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Confirm delete period from ${format(
                          p.startDate,
                          'MMMM d'
                        )}`}
                        hitSlop={8}
                        onPress={() => handleDelete(p.id)}
                        style={[styles.confirmBtn, { backgroundColor: COLORS.error }]}
                      >
                        <Text variant="caption" color="#FFFFFF">
                          Delete
                        </Text>
                      </Pressable>
                    </Animated.View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete period from ${format(p.startDate, 'MMMM d')}`}
                      hitSlop={10}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setPendingDelete(p.id);
                      }}
                    >
                      <Icon name="trash" size={17} color={c.textTertiary} />
                    </Pressable>
                  )}
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

  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  confirmBtn: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.pill,
  },
});

export default PeriodLoggerScreen;
