import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, GRADIENT } from '../constants';
import { useAppStore } from '../store/appStore';
import AnimatedCard from '../components/AnimatedCard';
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
    const recentSymptoms = periodEntries.slice(-6).flatMap((entry) => entry.symptoms);

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
  }, [aiInsights, enableAIInsights, healthMetrics, moodEntries, periodEntries, user]);

  const topInsight = insights[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={TYPOGRAPHY.h2}>AI Insights</Text>
          <Text style={[TYPOGRAPHY.body2, { color: COLORS.textSecondary }]}>
            Personalized patterns based on your cycle and wellness logs
          </Text>
        </View>

        {topInsight && (
          <LinearGradient
            colors={GRADIENT.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroLabel}>Top insight</Text>
            <Text style={styles.heroTitle}>{topInsight.title}</Text>
            <Text style={styles.heroBody}>{topInsight.description}</Text>
          </LinearGradient>
        )}

        {!enableAIInsights && (
          <AnimatedCard style={styles.card}>
            <Text style={TYPOGRAPHY.h4}>Insights are turned off</Text>
            <Text style={[TYPOGRAPHY.body2, styles.mutedCopy]}>
              Turn them on in Settings when you want personalized cycle and wellness patterns.
            </Text>
          </AnimatedCard>
        )}

        {enableAIInsights && insights.length === 0 && (
          <AnimatedCard style={styles.card}>
            <Text style={TYPOGRAPHY.h4}>Start building your pattern</Text>
            <Text style={[TYPOGRAPHY.body2, styles.mutedCopy]}>
              Log a period, symptoms, and daily check-ins to unlock useful predictions.
            </Text>
          </AnimatedCard>
        )}

        {insights.map((insight, idx) => {
          const tone = toneStyles[insight.type];

          return (
            <AnimatedCard key={insight.id} delay={idx} style={styles.card}>
              <View style={styles.insightHeader}>
                <View style={[styles.typeBadge, { backgroundColor: tone.background }]}>
                  <Text style={[TYPOGRAPHY.caption, { color: tone.color }]}>{insight.tag}</Text>
                </View>
                <View style={styles.insightTitleContainer}>
                  <Text style={TYPOGRAPHY.h4}>{insight.title}</Text>
                  <View style={styles.confidenceBadge}>
                    <Text style={[TYPOGRAPHY.caption, { color: tone.color }]}>
                      {Math.round(insight.confidence * 100)}% confidence
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={[TYPOGRAPHY.body2, { marginTop: SPACING.md }]}>
                {insight.description}
              </Text>
            </AnimatedCard>
          );
        })}

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
  heroCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    opacity: 0.85,
    marginBottom: SPACING.sm,
  },
  heroTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
  },
  heroBody: {
    ...TYPOGRAPHY.body2,
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  card: {
    marginBottom: SPACING.lg,
  },
  insightHeader: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  typeBadge: {
    minWidth: 72,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  insightTitleContainer: {
    flex: 1,
  },
  confidenceBadge: {
    marginTop: SPACING.sm,
  },
  mutedCopy: {
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
});

export default AIInsightsScreen;
