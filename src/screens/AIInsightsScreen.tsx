import { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, GRADIENT } from '../constants';
import { fontScale, scale } from '../utils/responsive';
import { useAppStore } from '../store/appStore';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import EmojiChip from '../components/EmojiChip';
import { AIInsight, PeriodEntry } from '../types';
import {
  daysUntil,
  formatCountdown,
  getCyclePhase,
  getDayOfCycle,
  getPredictedNextPeriod,
} from '../utils/cycleCalculations';

type InsightTone = AIInsight['type'];

interface DisplayInsight {
  id: string;
  title: string;
  description: string;
  type: InsightTone;
  confidence: number;
  tag: string;
}

const DAY_MS = 1000 * 60 * 60 * 24;

const toneStyles: Record<InsightTone, { label: string; color: string; background: string }> = {
  prediction: { label: 'Prediction', color: COLORS.info, background: '#EAF4FF' },
  trend: { label: 'Trend', color: COLORS.primaryDark, background: '#FFF0F6' },
  recommendation: { label: 'Tip', color: COLORS.success, background: '#ECF8EF' },
  warning: { label: 'Watch', color: COLORS.warning, background: '#FFF6E8' },
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
};

const buildCycleLengths = (entries: PeriodEntry[]) => {
  const starts = entries
    .map((entry) => entry.startDate)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  return starts
    .slice(1)
    .map((start, index) => Math.round((start.getTime() - starts[index].getTime()) / DAY_MS))
    .filter((length) => length >= 15 && length <= 60);
};

const AIInsightsScreen = () => {
  const {
    user,
    aiInsights,
    periodEntries,
    symptomLogs,
    moodEntries,
    healthMetrics,
    enableAIInsights,
  } = useAppStore();

  const insights = useMemo<DisplayInsight[]>(() => {
    const savedInsights = aiInsights.map((insight) => ({
      id: insight.id,
      title: insight.title,
      description: insight.description,
      type: insight.type,
      confidence: insight.confidence,
      tag: toneStyles[insight.type].label,
    }));

    if (!enableAIInsights || !user) {
      return savedInsights;
    }

    const generated: DisplayInsight[] = [];
    const cycleLengths = buildCycleLengths(periodEntries);
    const dayOfCycle = getDayOfCycle(user.lastPeriodStart, user.cycleLength);
    const currentPhase = getCyclePhase(dayOfCycle);
    const nextPeriod = getPredictedNextPeriod(user.lastPeriodStart, user.cycleLength);
    const daysToPeriod = daysUntil(nextPeriod);
    const recentMood = moodEntries.slice(-7);
    const recentHealth = healthMetrics.slice(-7);
    const recentSymptoms = symptomLogs.slice(-14).flatMap((log) => log.symptoms);

    generated.push({
      id: 'phase-guidance',
      title: `${currentPhase?.name ?? 'Cycle'} phase guidance`,
      description:
        currentPhase?.description ??
        'Keep logging your cycle and check-ins to unlock more precise phase guidance.',
      type: 'recommendation',
      confidence: currentPhase ? 0.82 : 0.62,
      tag: `Day ${dayOfCycle}`,
    });

    if (daysToPeriod >= 0 && daysToPeriod <= 5) {
      generated.push({
        id: 'period-prep',
        title: 'Period preparation window',
        description: `Your next period is ${formatCountdown(daysToPeriod).toLowerCase()}. Prioritize sleep, hydration, and lighter planning.`,
        type: 'prediction',
        confidence: Math.min(0.9, 0.72 + cycleLengths.length * 0.03),
        tag: 'Upcoming',
      });
    }

    if (cycleLengths.length >= 2) {
      const avgCycle = Math.round(average(cycleLengths));
      const shortest = Math.min(...cycleLengths);
      const longest = Math.max(...cycleLengths);
      const variation = longest - shortest;

      generated.push({
        id: 'cycle-consistency',
        title: variation > 7 ? 'Cycle variation detected' : 'Cycle rhythm looks steady',
        description:
          variation > 7
            ? `Your recent cycles range from ${shortest} to ${longest} days. More logs will help separate normal variation from a recurring pattern.`
            : `Your recent average is ${avgCycle} days, with only ${variation} days of variation across logged cycles.`,
        type: variation > 7 ? 'warning' : 'trend',
        confidence: Math.min(0.94, 0.66 + cycleLengths.length * 0.05),
        tag: `${cycleLengths.length} cycles`,
      });
    }

    if (recentMood.length >= 3) {
      const avgEnergy = average(recentMood.map((entry) => entry.energy));
      const avgSleep = average(recentMood.map((entry) => entry.sleep));
      const avgWater = average(recentMood.map((entry) => entry.waterIntake));

      if (avgEnergy <= 2.8) {
        generated.push({
          id: 'energy-support',
          title: 'Lower energy pattern',
          description: `Your recent energy average is ${avgEnergy.toFixed(1)}/5. Consider gentler workouts and earlier wind-down time during this phase.`,
          type: 'recommendation',
          confidence: 0.78,
          tag: 'Energy',
        });
      }

      if (avgSleep < 7) {
        generated.push({
          id: 'sleep-support',
          title: 'Sleep may need attention',
          description: `Recent check-ins average ${avgSleep.toFixed(1)} hours of sleep. A steadier bedtime can improve next-cycle predictions.`,
          type: 'warning',
          confidence: 0.76,
          tag: 'Sleep',
        });
      }

      if (
        avgWater < 7 ||
        recentHealth.some((metric) => metric.waterIntake && metric.waterIntake < 7)
      ) {
        generated.push({
          id: 'hydration-support',
          title: 'Hydration dip spotted',
          description:
            'Your recent water logs trend lower than your target. A small reminder during this phase may reduce fatigue and headaches.',
          type: 'recommendation',
          confidence: 0.74,
          tag: 'Hydration',
        });
      }
    }

    if (recentSymptoms.length > 0) {
      const symptomCounts = recentSymptoms.reduce<Record<string, number>>((counts, symptom) => {
        counts[symptom.type] = (counts[symptom.type] ?? 0) + 1;
        return counts;
      }, {});
      const topSymptom = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1])[0];

      if (topSymptom) {
        generated.push({
          id: 'symptom-pattern',
          title: `${topSymptom[0].replace('_', ' ')} pattern`,
          description:
            'This symptom appears most often in your recent logs. Keep tracking severity so the app can learn whether it clusters before your period.',
          type: 'trend',
          confidence: Math.min(0.88, 0.68 + topSymptom[1] * 0.04),
          tag: 'Symptoms',
        });
      }
    }

    return [...savedInsights, ...generated].slice(0, 8);
  }, [aiInsights, enableAIInsights, healthMetrics, moodEntries, periodEntries, symptomLogs, user]);

  const topInsight = insights[0];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <Text style={styles.title}>AI Insights</Text>
            <Text style={styles.subtitle}>
              Personalized patterns from your cycle & wellness logs
            </Text>
          </Animated.View>

          {topInsight && (
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <LinearGradient
                colors={GRADIENT.primary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTop}>
                  <EmojiChip emoji="✨" size={scale(46)} colors={['#FFFFFF', '#FFE3EF']} float />
                  <Text style={styles.heroLabel}>Top insight</Text>
                </View>
                <Text style={styles.heroTitle}>{topInsight.title}</Text>
                <Text style={styles.heroBody}>{topInsight.description}</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {!enableAIInsights && (
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <GlassCard style={styles.card}>
                <Text style={styles.cardTitle}>Insights are turned off</Text>
                <Text style={styles.muted}>
                  Turn them on in Settings when you want personalized cycle and wellness patterns.
                </Text>
              </GlassCard>
            </Animated.View>
          )}

          {enableAIInsights && insights.length === 0 && (
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <GlassCard style={styles.card}>
                <EmojiChip emoji="🌱" size={scale(48)} float />
                <Text style={[styles.cardTitle, { marginTop: SPACING.md }]}>
                  Start building your pattern
                </Text>
                <Text style={styles.muted}>
                  Log a period, symptoms, and daily check-ins to unlock useful predictions.
                </Text>
              </GlassCard>
            </Animated.View>
          )}

          {insights.map((insight, idx) => {
            const tone = toneStyles[insight.type];
            return (
              <Animated.View key={insight.id} entering={FadeInDown.delay(180 + idx * 60).springify()}>
                <GlassCard style={styles.card}>
                  <View style={styles.insightHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: tone.background }]}>
                      <Text style={[TYPOGRAPHY.caption, { color: tone.color, fontWeight: '700' }]}>
                        {insight.tag}
                      </Text>
                    </View>
                    <View style={styles.confidencePill}>
                      <Text style={[TYPOGRAPHY.caption, { color: tone.color }]}>
                        {Math.round(insight.confidence * 100)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightBody}>{insight.description}</Text>
                </GlassCard>
              </Animated.View>
            );
          })}

          <View style={{ height: scale(110) }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.lg },
  scroll: { paddingTop: SPACING.md },
  header: { marginTop: SPACING.md, marginBottom: SPACING.lg },
  title: { ...TYPOGRAPHY.h2, fontSize: fontScale(28), color: COLORS.text },
  subtitle: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary, marginTop: 2 },

  heroCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  heroLabel: { ...TYPOGRAPHY.caption, color: COLORS.white, opacity: 0.9, letterSpacing: 1 },
  heroTitle: { ...TYPOGRAPHY.h3, color: COLORS.white },
  heroBody: { ...TYPOGRAPHY.body2, color: COLORS.white, marginTop: SPACING.sm, opacity: 0.95 },

  card: { marginBottom: SPACING.lg },
  cardTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  muted: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary, marginTop: SPACING.sm },

  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  typeBadge: {
    minWidth: 64,
    height: 28,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  confidencePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  insightTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  insightBody: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary, marginTop: SPACING.sm, lineHeight: 20 },
});

export default AIInsightsScreen;
