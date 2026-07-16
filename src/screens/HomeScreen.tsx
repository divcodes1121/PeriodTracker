import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, PHASE_GRADIENTS } from '../constants';
import { fontScale, scale } from '../utils/responsive';
import { useTheme } from '../theme/useTheme';
import type { ThemePalette } from '../theme/palette';
import { useAppStore } from '../store/appStore';
import {
  getDayOfCycle,
  getCyclePhase,
  getFertilityWindow,
  formatCountdown,
  getPredictedNextPeriod,
  daysUntil,
  deriveCycleContext,
} from '../utils/cycleCalculations';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import CycleRing from '../components/CycleRing';
import Ripple from '../components/Ripple';
import EmojiChip from '../components/EmojiChip';
import ThemeToggle from '../components/ThemeToggle';

interface QuickActionProps {
  emoji: string;
  label: string;
  colors: [string, string];
  textColor: string;
  onPress: () => void;
  delay: number;
}

/** Glass tile with a ripple tap, springy press, haptics, and a 3D emoji chip. */
const QuickAction: React.FC<QuickActionProps> = ({ emoji, label, colors, textColor, onPress, delay }) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()} style={qa.wrap}>
    <Ripple onPress={onPress} borderRadius={22} style={qa.ripple}>
      <GlassCard padded={false}>
        <View style={qa.inner}>
          <EmojiChip emoji={emoji} size={scale(46)} colors={colors} onPress={onPress} />
          <Text style={[qa.label, { color: textColor }]}>{label}</Text>
        </View>
      </GlassCard>
    </Ripple>
  </Animated.View>
);

const qa = StyleSheet.create({
  wrap: { width: '48%' },
  ripple: { width: '100%' },
  inner: {
    height: scale(108),
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  label: { ...TYPOGRAPHY.body2, fontSize: fontScale(14), fontWeight: '600', textAlign: 'center' },
});

const HomeScreen = ({ navigation }: any) => {
  const { user, periodEntries } = useAppStore();
  const { colors: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [refreshing, setRefreshing] = useState(false);

  const cycleInfo = useMemo(() => {
    if (!user) return null;
    const { lastPeriodStart, cycleLength, periodLength } = deriveCycleContext(user, periodEntries);
    const dayOfCycle = getDayOfCycle(lastPeriodStart, cycleLength);
    const phase = getCyclePhase(dayOfCycle, cycleLength, periodLength);
    const fertility = getFertilityWindow(lastPeriodStart, cycleLength);
    const nextPeriod = getPredictedNextPeriod(lastPeriodStart, cycleLength);
    return {
      dayOfCycle,
      phase,
      fertility,
      daysUntilPeriod: daysUntil(nextPeriod),
      progress: dayOfCycle / cycleLength,
    };
  }, [user, periodEntries]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (!user || !cycleInfo) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.loadingWrap}>
          <Text style={[TYPOGRAPHY.h2, { color: c.text }]}>Loading...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const rawPhase = cycleInfo.phase?.name ?? 'menstrual';
  const phaseName = rawPhase.charAt(0).toUpperCase() + rawPhase.slice(1);
  const phaseGradient = PHASE_GRADIENTS[phaseName] ?? PHASE_GRADIENTS.Menstrual;
  const ringColors: [string, string] = [phaseGradient[0], phaseGradient[1]];
  const progressPct = Math.round(cycleInfo.progress * 100);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting + theme toggle */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Hello, {user.name} 👋</Text>
              <Text style={styles.subGreeting}>Here's your cycle at a glance</Text>
            </View>
            <ThemeToggle />
          </Animated.View>

          {/* Hero ring */}
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <GlassCard style={styles.heroCard}>
              <CycleRing progress={cycleInfo.progress} colors={ringColors} size={230} strokeWidth={18} trackColor={c.trackNeutral}>
                <Text style={styles.ringLabel}>DAY</Text>
                <Text style={styles.ringDay}>{cycleInfo.dayOfCycle}</Text>
                <View style={[styles.phasePill, { backgroundColor: phaseGradient[1] }]}>
                  <Text style={styles.phasePillText}>{phaseName}</Text>
                </View>
              </CycleRing>
              <Text style={styles.heroDescription} numberOfLines={2}>
                {cycleInfo.phase?.description}
              </Text>
              <View style={styles.wellnessRow}>
                <Text style={styles.wellnessLabel}>Wellness</Text>
                <View style={styles.wellnessBarTrack}>
                  <View
                    style={[
                      styles.wellnessBarFill,
                      {
                        width: `${(cycleInfo.phase?.wellnessScore ?? 5) * 10}%`,
                        backgroundColor: phaseGradient[1],
                      },
                    ]}
                  />
                </View>
                <Text style={styles.wellnessScore}>{cycleInfo.phase?.wellnessScore ?? 5}/10</Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Stat row */}
          <View style={styles.statRow}>
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statCol}>
              <GlassCard style={styles.statCard}>
                <EmojiChip emoji="🩸" size={scale(40)} colors={['#FFFFFF', '#FFD9E6']} float delay={0} onPress={() => navigation.navigate('Calendar')} />
                <Text style={styles.statValue}>{formatCountdown(cycleInfo.daysUntilPeriod)}</Text>
                <Text style={styles.statCaption}>Next period</Text>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.statCol}>
              <GlassCard style={styles.statCard}>
                <EmojiChip emoji="💚" size={scale(40)} colors={['#FFFFFF', '#D9F5E4']} float delay={300} onPress={() => navigation.navigate('Calendar')} />
                <Text style={styles.statValue}>
                  {cycleInfo.fertility.daysFromNow < 0
                    ? 'Active'
                    : formatCountdown(cycleInfo.fertility.daysFromNow)}
                </Text>
                <Text style={styles.statCaption}>Fertility</Text>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.statCol}>
              <GlassCard style={styles.statCard}>
                <EmojiChip emoji="🌙" size={scale(40)} colors={['#FFFFFF', '#EADDFF']} float delay={600} onPress={() => navigation.navigate('Analytics')} />
                <Text style={styles.statValue}>{progressPct}%</Text>
                <Text style={styles.statCaption}>Cycle done</Text>
              </GlassCard>
            </Animated.View>
          </View>

          {/* Log period — primary action */}
          <Animated.View entering={FadeInDown.delay(390).springify()}>
            <Ripple onPress={() => navigation.navigate('PeriodLogger')} borderRadius={20} style={styles.logPeriodBtn} rippleColor="rgba(255,255,255,0.35)">
              <EmojiChip emoji="🩸" size={scale(38)} colors={['#FFFFFF', '#FFD9E6']} onPress={() => navigation.navigate('PeriodLogger')} />
              <View style={styles.logPeriodText}>
                <Text style={styles.logPeriodTitle}>Log Period</Text>
                <Text style={styles.logPeriodSub}>Keep predictions accurate</Text>
              </View>
              <Text style={styles.logPeriodChevron}>→</Text>
            </Ripple>
          </Animated.View>

          {/* Quick actions */}
          <Animated.View entering={FadeIn.delay(400)}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </Animated.View>
          <View style={styles.actionGrid}>
            <QuickAction emoji="📝" label="Log Symptoms" colors={['#FFFFFF', '#FFD9E6']} textColor={c.text} delay={440} onPress={() => navigation.navigate('SymptomLogger')} />
            <QuickAction emoji="✨" label="Daily Check-in" colors={['#FFFFFF', '#FFE9C7']} textColor={c.text} delay={500} onPress={() => navigation.navigate('MoodTracker')} />
            <QuickAction emoji="📅" label="Calendar" colors={['#FFFFFF', '#D9F5E4']} textColor={c.text} delay={560} onPress={() => navigation.navigate('Calendar')} />
            <QuickAction emoji="📊" label="Analytics" colors={['#FFFFFF', '#EADDFF']} textColor={c.text} delay={620} onPress={() => navigation.navigate('Analytics')} />
          </View>

          {/* AI insight preview */}
          <Animated.View entering={FadeInDown.delay(680).springify()}>
            <Pressable onPress={() => navigation.navigate('AIInsights')}>
              <GlassCard style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightTitle}>✨ AI Insight</Text>
                  <Text style={styles.insightLink}>View all →</Text>
                </View>
                <Text style={styles.insightBody}>
                  Based on your recent cycles, you may notice mild fatigue and cravings 2–3 days
                  before your period. Plan for extra rest.
                </Text>
              </GlassCard>
            </Pressable>
          </Animated.View>

          <View style={{ height: scale(110) }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const makeStyles = (c: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
    header: {
      marginTop: SPACING.md,
      marginBottom: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerText: { flex: 1 },
    greeting: { ...TYPOGRAPHY.h2, color: c.text },
    subGreeting: { ...TYPOGRAPHY.body2, color: c.textSecondary, marginTop: 2 },

    heroCard: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.lg },
    ringLabel: { ...TYPOGRAPHY.caption, color: c.textSecondary, letterSpacing: 2 },
    ringDay: { fontSize: fontScale(56), fontWeight: '800', color: c.text, lineHeight: fontScale(60) },
    phasePill: {
      marginTop: SPACING.sm,
      paddingHorizontal: SPACING.md,
      paddingVertical: 4,
      borderRadius: 999,
    },
    phasePillText: { ...TYPOGRAPHY.caption, color: COLORS.white, fontWeight: '700' },
    heroDescription: {
      ...TYPOGRAPHY.body2,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: SPACING.lg,
      paddingHorizontal: SPACING.md,
    },
    wellnessRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.lg,
      alignSelf: 'stretch',
    },
    wellnessLabel: { ...TYPOGRAPHY.caption, color: c.textSecondary },
    wellnessBarTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.trackNeutral,
      overflow: 'hidden',
    },
    wellnessBarFill: { height: '100%', borderRadius: 4 },
    wellnessScore: { ...TYPOGRAPHY.caption, color: c.text, fontWeight: '700' },

    statRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
    statCol: { flex: 1 },
    statCard: { alignItems: 'center', paddingVertical: SPACING.lg },
    statValue: { ...TYPOGRAPHY.body1, fontWeight: '800', color: c.text, textAlign: 'center', marginTop: SPACING.xs },
    statCaption: { ...TYPOGRAPHY.caption, color: c.textSecondary, marginTop: 2 },

    logPeriodBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      backgroundColor: COLORS.primary,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.xl,
    },
    logPeriodText: { flex: 1 },
    logPeriodTitle: { ...TYPOGRAPHY.body1, fontWeight: '800', color: COLORS.white },
    logPeriodSub: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    logPeriodChevron: { ...TYPOGRAPHY.h3, color: COLORS.white },

    sectionTitle: { ...TYPOGRAPHY.h4, color: c.text, marginBottom: SPACING.md },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: SPACING.md,
      marginBottom: SPACING.xl,
    },

    insightCard: {},
    insightHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    insightTitle: { ...TYPOGRAPHY.h4, color: c.text },
    insightLink: { ...TYPOGRAPHY.body2, color: COLORS.primary, fontWeight: '600' },
    insightBody: { ...TYPOGRAPHY.body2, color: c.textSecondary, lineHeight: 20 },
  });

export default HomeScreen;
