import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import InsightCard, { InsightTone } from '../components/InsightCard';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/appStore';
import { COLORS } from '../constants';
import { SPACE, RADIUS } from '../theme/tokens';
import {
  daysUntil,
  formatCountdown,
  getCyclePhase,
  getDayOfCycle,
  getPredictedNextPeriod,
  buildCycleLengths,
  deriveCycleContext,
} from '../utils/cycleCalculations';

interface DisplayInsight {
  id: string;
  title: string;
  description: string;
  type: InsightTone;
  confidence: number;
  tag: string;
  /** Plain-language evidence behind the claim. */
  reasoning?: string;
  series?: number[];
}

const TONE_LABEL: Record<InsightTone, string> = {
  prediction: 'Prediction',
  trend: 'Trend',
  recommendation: 'Tip',
  warning: 'Watch',
};

const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((t, v) => t + v, 0) / values.length;

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
  const { colors: c } = useTheme();

  const insights = useMemo<DisplayInsight[]>(() => {
    const saved = aiInsights.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      type: i.type,
      confidence: i.confidence,
      tag: TONE_LABEL[i.type],
    }));

    if (!enableAIInsights || !user) return saved;

    const generated: DisplayInsight[] = [];
    const cycleLengths = buildCycleLengths(periodEntries);
    const { lastPeriodStart, cycleLength, periodLength } = deriveCycleContext(user, periodEntries);
    const dayOfCycle = getDayOfCycle(lastPeriodStart, cycleLength);
    const currentPhase = getCyclePhase(dayOfCycle, cycleLength, periodLength);
    const nextPeriod = getPredictedNextPeriod(lastPeriodStart, cycleLength);
    const daysToPeriod = daysUntil(nextPeriod);
    const recentMood = moodEntries.slice(-7);
    const recentHealth = healthMetrics.slice(-7);
    const recentSymptoms = symptomLogs.slice(-14).flatMap((l) => l.symptoms);

    generated.push({
      id: 'phase-guidance',
      title: `${currentPhase?.name ?? 'Cycle'} phase guidance`,
      description:
        currentPhase?.description ??
        'Keep logging your cycle and check-ins to unlock more precise phase guidance.',
      type: 'recommendation',
      confidence: currentPhase ? 0.82 : 0.62,
      tag: `Day ${dayOfCycle}`,
      reasoning: currentPhase
        ? `You are on day ${dayOfCycle} of a ${cycleLength}-day cycle, which falls in the ${currentPhase.name} phase (days ${currentPhase.startDay}–${currentPhase.endDay}).`
        : 'Based on your onboarding cycle length, since no periods have been logged yet.',
    });

    if (daysToPeriod >= 0 && daysToPeriod <= 5) {
      generated.push({
        id: 'period-prep',
        title: 'Period preparation window',
        description: `Your next period is ${formatCountdown(daysToPeriod).toLowerCase()}. Prioritize sleep, hydration, and lighter planning.`,
        type: 'prediction',
        confidence: Math.min(0.9, 0.72 + cycleLengths.length * 0.03),
        tag: 'Upcoming',
        reasoning: `Projected from your last logged start plus a ${cycleLength}-day average. Confidence rises with each cycle you log — currently ${cycleLengths.length}.`,
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
        reasoning: `Measured as the gap between consecutive period starts across ${cycleLengths.length} logged cycles.`,
        series: cycleLengths,
      });
    }

    if (recentMood.length >= 3) {
      const avgEnergy = average(recentMood.map((e) => e.energy));
      const avgSleep = average(recentMood.map((e) => e.sleep));
      const avgWater = average(recentMood.map((e) => e.waterIntake));

      if (avgEnergy <= 2.8) {
        generated.push({
          id: 'energy-support',
          title: 'Lower energy pattern',
          description: `Your recent energy average is ${avgEnergy.toFixed(1)}/5. Consider gentler workouts and earlier wind-down time during this phase.`,
          type: 'recommendation',
          confidence: 0.78,
          tag: 'Energy',
          reasoning: `Averaged across your last ${recentMood.length} check-ins.`,
          series: recentMood.map((e) => e.energy),
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
          reasoning: `Your last ${recentMood.length} check-ins fall below the 7-hour mark.`,
          series: recentMood.map((e) => e.sleep),
        });
      }

      if (avgWater < 7 || recentHealth.some((m) => m.waterIntake && m.waterIntake < 7)) {
        generated.push({
          id: 'hydration-support',
          title: 'Hydration dip spotted',
          description:
            'Your recent water logs trend lower than your target. A small reminder during this phase may reduce fatigue and headaches.',
          type: 'recommendation',
          confidence: 0.74,
          tag: 'Hydration',
          reasoning: 'Drawn from water intake recorded in your recent check-ins and health metrics.',
        });
      }
    }

    if (recentSymptoms.length > 0) {
      const counts = recentSymptoms.reduce<Record<string, number>>((acc, s) => {
        acc[s.type] = (acc[s.type] ?? 0) + 1;
        return acc;
      }, {});
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

      if (top) {
        generated.push({
          id: 'symptom-pattern',
          title: `${top[0].replace('_', ' ')} pattern`,
          description:
            'This symptom appears most often in your recent logs. Keep tracking severity so the app can learn whether it clusters before your period.',
          type: 'trend',
          confidence: Math.min(0.88, 0.68 + top[1] * 0.04),
          tag: 'Symptoms',
          reasoning: `Logged ${top[1]} time${top[1] === 1 ? '' : 's'} across your last 14 days of symptom entries.`,
        });
      }
    }

    return [...saved, ...generated].slice(0, 8);
  }, [aiInsights, enableAIInsights, healthMetrics, moodEntries, periodEntries, symptomLogs, user]);

  return (
    <Screen title="Insights" subtitle="Patterns found in your own logs">
      {!enableAIInsights && (
        <Reveal index={0}>
          <Surface>
            <View style={[styles.emptyIcon, { backgroundColor: c.fill }]}>
              <Icon name="sparkles" size={20} color={c.textSecondary} />
            </View>
            <Text variant="title3" style={{ marginTop: SPACE.lg }}>
              Insights are off
            </Text>
            <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.sm }}>
              Turn them on in Settings whenever you want personalised cycle and wellness patterns.
            </Text>
          </Surface>
        </Reveal>
      )}

      {enableAIInsights && insights.length === 0 && (
        <Reveal index={0}>
          <Surface>
            <View style={[styles.emptyIcon, { backgroundColor: COLORS.primarySoft }]}>
              <Icon name="leaf" size={20} color={COLORS.primaryDark} />
            </View>
            <Text variant="title3" style={{ marginTop: SPACE.lg }}>
              Nothing to show yet
            </Text>
            <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.sm }}>
              Log a period, some symptoms and a few check-ins. Patterns appear here as soon as
              there is enough to be honest about.
            </Text>
          </Surface>
        </Reveal>
      )}

      {insights.map((i, idx) => (
        <Reveal key={i.id} index={idx}>
          <InsightCard
            title={i.title}
            body={i.description}
            tone={i.type}
            tag={i.tag}
            confidence={i.confidence}
            reasoning={i.reasoning}
            series={i.series}
            hero={idx === 0}
          />
        </Reveal>
      ))}
    </Screen>
  );
};

const styles = StyleSheet.create({
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AIInsightsScreen;
