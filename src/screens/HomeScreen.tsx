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
import { useAppStore } from '../store/appStore';
import {
  getDayOfCycle,
  getCyclePhase,
  getFertilityWindow,
  formatCountdown,
  getPredictedNextPeriod,
  daysUntil,
} from '../utils/cycleCalculations';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import CycleRing from '../components/CycleRing';
import Ripple from '../components/Ripple';
import EmojiChip from '../components/EmojiChip';

interface QuickActionProps {
  emoji: string;
  label: string;
  colors: [string, string];
  onPress: () => void;
  delay: number;
}

/** Glass tile with a ripple tap, springy press, haptics, and a 3D emoji chip. */
const QuickAction: React.FC<QuickActionProps> = ({ emoji, label, colors, onPress, delay }) => {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.actionWrap}>
      <Ripple onPress={onPress} borderRadius={22} style={styles.actionRipple}>
        <GlassCard style={styles.actionCard} padded={false}>
          <View style={styles.actionInner}>
            <EmojiChip emoji={emoji} size={scale(46)} colors={colors} />
            <Text style={styles.actionLabel}>{label}</Text>
          </View>
        </GlassCard>
      </Ripple>
    </Animated.View>
  );
};

const HomeScreen = ({ navigation }: any) => {
  const { user } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const cycleInfo = useMemo(() => {
    if (!user) return null;
    const dayOfCycle = getDayOfCycle(user.lastPeriodStart, user.cycleLength);
    const phase = getCyclePhase(dayOfCycle);
    const fertility = getFertilityWindow(user.lastPeriodStart, user.cycleLength);
    const nextPeriod = getPredictedNextPeriod(user.lastPeriodStart, user.cycleLength);
    return {
      dayOfCycle,
      phase,
      fertility,
      daysUntilPeriod: daysUntil(nextPeriod),
      progress: dayOfCycle / user.cycleLength,
    };
  }, [user]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (!user || !cycleInfo) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.loadingWrap}>
          <Text style={TYPOGRAPHY.h2}>Loading...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // getCyclePhase returns the name lowercase (e.g. 'follicular'); PHASE_GRADIENTS
  // is keyed capitalized, so normalize before displaying and looking up.
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
          {/* Greeting */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
            <Text style={styles.greeting}>Hello, {user.name} 👋</Text>
            <Text style={styles.subGreeting}>Here's your cycle at a glance</Text>
          </Animated.View>

          {/* Hero ring */}
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            <GlassCard style={styles.heroCard}>
              <CycleRing progress={cycleInfo.progress} colors={ringColors} size={230} strokeWidth={18}>
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
                <EmojiChip emoji="🩸" size={scale(40)} colors={['#FFFFFF', '#FFD9E6']} float delay={0} />
                <Text style={styles.statValue}>{formatCountdown(cycleInfo.daysUntilPeriod)}</Text>
                <Text style={styles.statCaption}>Next period</Text>
              </GlassCard>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.statCol}>
              <GlassCard style={styles.statCard}>
                <EmojiChip emoji="💚" size={scale(40)} colors={['#FFFFFF', '#D9F5E4']} float delay={300} />
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
                <EmojiChip emoji="🌙" size={scale(40)} colors={['#FFFFFF', '#EADDFF']} float delay={600} />
                <Text style={styles.statValue}>{progressPct}%</Text>
                <Text style={styles.statCaption}>Cycle done</Text>
              </GlassCard>
            </Animated.View>
          </View>

          {/* Quick actions */}
          <Animated.View entering={FadeIn.delay(400)}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </Animated.View>
          <View style={styles.actionGrid}>
            <QuickAction emoji="📝" label="Log Symptoms" colors={['#FFFFFF', '#FFD9E6']} delay={440} onPress={() => navigation.navigate('SymptomLogger')} />
            <QuickAction emoji="✨" label="Daily Check-in" colors={['#FFFFFF', '#FFE9C7']} delay={500} onPress={() => navigation.navigate('MoodTracker')} />
            <QuickAction emoji="📅" label="Calendar" colors={['#FFFFFF', '#D9F5E4']} delay={560} onPress={() => navigation.navigate('Calendar')} />
            <QuickAction emoji="📊" label="Analytics" colors={['#FFFFFF', '#EADDFF']} delay={620} onPress={() => navigation.navigate('Analytics')} />
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  header: { marginTop: SPACING.md, marginBottom: SPACING.lg },
  greeting: { ...TYPOGRAPHY.h2, color: COLORS.text },
  subGreeting: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary, marginTop: 2 },

  heroCard: { alignItems: 'center', paddingVertical: SPACING.xl, marginBottom: SPACING.lg },
  ringLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, letterSpacing: 2 },
  ringDay: { fontSize: fontScale(56), fontWeight: '800', color: COLORS.text, lineHeight: fontScale(60) },
  phasePill: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 999,
  },
  phasePillText: { ...TYPOGRAPHY.caption, color: COLORS.white, fontWeight: '700' },
  heroDescription: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
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
  wellnessLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  wellnessBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  wellnessBarFill: { height: '100%', borderRadius: 4 },
  wellnessScore: { ...TYPOGRAPHY.caption, color: COLORS.text, fontWeight: '700' },

  statRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  statCol: { flex: 1 },
  statCard: { alignItems: 'center', paddingVertical: SPACING.lg },
  statEmoji: { fontSize: 22, marginBottom: SPACING.xs },
  statValue: { ...TYPOGRAPHY.body1, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  statCaption: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },

  sectionTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: SPACING.md },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionWrap: { width: '47%', flexGrow: 1 },
  actionRipple: { flex: 1 },
  actionCard: { height: scale(104) },
  actionInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  actionLabel: { ...TYPOGRAPHY.body2, fontSize: fontScale(14), color: COLORS.text, fontWeight: '600' },

  insightCard: {},
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  insightTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  insightLink: { ...TYPOGRAPHY.body2, color: COLORS.primary, fontWeight: '600' },
  insightBody: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary, lineHeight: 20 },
});

export default HomeScreen;
