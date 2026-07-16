import { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format, isSameDay } from 'date-fns';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, FLOW_INTENSITY } from '../constants';
import { fontScale, scale } from '../utils/responsive';
import { useTheme } from '../theme/useTheme';
import type { ThemePalette } from '../theme/palette';
import { useAppStore } from '../store/appStore';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import EmojiChip from '../components/EmojiChip';
import Ripple from '../components/Ripple';
import DateField from '../components/DateField';
import { v4 as uuidv4 } from 'uuid';
import { PeriodEntry } from '../types';

type Flow = 'light' | 'medium' | 'heavy';

const PeriodLoggerScreen = ({ navigation }: any) => {
  const { user, periodEntries, addPeriodEntry, deletePeriodEntry } = useAppStore();
  const { colors: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [flowIntensity, setFlowIntensity] = useState<Flow>('medium');

  const recentPeriods = useMemo(
    () => [...periodEntries].sort((a, b) => b.startDate.getTime() - a.startDate.getTime()).slice(0, 6),
    [periodEntries]
  );

  const handleSave = () => {
    if (!user) return;
    if (endDate && endDate < startDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('Check the dates', 'The end date must be on or after the start date.');
      return;
    }
    const clash = periodEntries.some((e) => isSameDay(e.startDate, startDate));
    if (clash) {
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
      flowIntensity,
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
    Alert.alert('Delete this period?', 'This removes it from your history and predictions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          deletePeriodEntry(id);
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <Text style={styles.title}>Log Period</Text>
            <Text style={styles.subtitle}>Record when your period started</Text>
          </Animated.View>

          {/* Dates */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>Dates</Text>
              <DateField
                label="Started"
                value={startDate}
                onChange={setStartDate}
                maximumDate={new Date()}
              />
              <DateField
                label="Ended (optional)"
                value={endDate}
                onChange={setEndDate}
                placeholder="Still ongoing"
                minimumDate={startDate}
                maximumDate={new Date()}
              />
            </GlassCard>
          </Animated.View>

          {/* Flow intensity */}
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>Flow intensity</Text>
              <View style={styles.flowRow}>
                {(['light', 'medium', 'heavy'] as const).map((intensity) => {
                  const active = flowIntensity === intensity;
                  return (
                    <Ripple
                      key={intensity}
                      borderRadius={16}
                      style={[styles.flowBtn, active && styles.flowBtnActive]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setFlowIntensity(intensity);
                      }}
                    >
                      <View style={styles.flowInner}>
                        <Text style={styles.flowEmoji}>{FLOW_INTENSITY[intensity].emoji}</Text>
                        <Text style={[styles.flowLabel, active && styles.flowLabelActive]}>
                          {FLOW_INTENSITY[intensity].label}
                        </Text>
                      </View>
                    </Ripple>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Save */}
          <Animated.View entering={FadeInDown.delay(240).springify()}>
            <Ripple onPress={handleSave} borderRadius={18} style={styles.saveBtn} rippleColor="rgba(255,255,255,0.4)">
              <Text style={styles.saveText}>Save Period</Text>
            </Ripple>
          </Animated.View>

          {/* History */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <GlassCard style={[styles.card, { marginTop: SPACING.lg }]}>
              <Text style={styles.cardTitle}>Recent periods</Text>
              {recentPeriods.length === 0 ? (
                <View style={styles.emptyRow}>
                  <EmojiChip emoji="🩸" size={scale(40)} colors={['#FFFFFF', '#FFD9E6']} float />
                  <Text style={styles.muted}>
                    No periods logged yet. Your first entry starts your real cycle history.
                  </Text>
                </View>
              ) : (
                recentPeriods.map((p) => (
                  <View key={p.id} style={styles.periodRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.periodMain}>
                        {format(p.startDate, 'MMM d, yyyy')}
                        {p.endDate ? ` – ${format(p.endDate, 'MMM d')}` : ''}
                      </Text>
                      <Text style={styles.muted}>
                        {FLOW_INTENSITY[p.flowIntensity].label} flow
                      </Text>
                    </View>
                    <Pressable hitSlop={8} onPress={() => confirmDelete(p.id)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </GlassCard>
          </Animated.View>

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

    card: { marginBottom: SPACING.lg },
    cardTitle: { ...TYPOGRAPHY.h4, color: c.text, marginBottom: SPACING.md },
    muted: { ...TYPOGRAPHY.body2, color: c.textSecondary, marginTop: 4, flex: 1 },

    flowRow: { flexDirection: 'row', gap: SPACING.md },
    flowBtn: { flex: 1, backgroundColor: c.pillBg, borderWidth: 1, borderColor: c.pillBorder },
    flowBtnActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
    flowInner: { alignItems: 'center', paddingVertical: SPACING.md, gap: 4 },
    flowEmoji: { fontSize: 18 },
    flowLabel: { ...TYPOGRAPHY.caption, color: c.textSecondary, fontWeight: '600' },
    flowLabelActive: { color: COLORS.primaryDark },

    saveBtn: {
      height: 56,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    },
    saveText: { ...TYPOGRAPHY.button, color: COLORS.white, fontSize: 16 },

    emptyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    periodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    periodMain: { ...TYPOGRAPHY.body1, fontWeight: '700', color: c.text },
    deleteText: { ...TYPOGRAPHY.body2, color: COLORS.error, fontWeight: '600' },
  });

export default PeriodLoggerScreen;
