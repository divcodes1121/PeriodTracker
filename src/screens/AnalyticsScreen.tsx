import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import BarChart from '../components/BarChart';
import Sparkline from '../components/Sparkline';
import AnimatedNumber from '../components/AnimatedNumber';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/appStore';
import { COLORS } from '../constants';
import { SPACE, RADIUS } from '../theme/tokens';
import {
  generateCycleStats,
  daysUntil,
  getPredictedNextPeriod,
  buildCycleLengths,
  deriveCycleContext,
} from '../utils/cycleCalculations';

/** One big number with a quiet label. */
function Stat({ value, label, unit }: { value: number; label: string; unit?: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValue}>
        <AnimatedNumber value={value} variant="title1" />
        {unit ? (
          <Text variant="caption" tone="tertiary" style={{ marginBottom: 3 }}>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="overline" tone="tertiary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const AnalyticsScreen = () => {
  const { user, periodEntries, moodEntries, symptomLogs } = useAppStore();
  const { colors: c, isDark } = useTheme();

  const cycleLengths = useMemo(() => buildCycleLengths(periodEntries), [periodEntries]);

  const stats = useMemo(() => {
    if (!user || cycleLengths.length === 0) return null;
    const { lastPeriodStart } = deriveCycleContext(user, periodEntries);
    return generateCycleStats(lastPeriodStart, user.periodLength, cycleLengths);
  }, [user, periodEntries, cycleLengths]);

  const nextPeriod = useMemo(() => {
    if (!user) return null;
    const { lastPeriodStart, cycleLength } = deriveCycleContext(user, periodEntries);
    return getPredictedNextPeriod(lastPeriodStart, cycleLength);
  }, [user, periodEntries]);

  /** Prediction confidence grows with logged history and falls with variability. */
  const confidence = useMemo(() => {
    if (cycleLengths.length === 0) return 0;
    const history = Math.min(cycleLengths.length / 6, 1);
    const steadiness = stats ? Math.max(0, 1 - stats.cycleVariability / 10) : 0.5;
    return Math.round((history * 0.5 + steadiness * 0.5) * 100);
  }, [cycleLengths, stats]);

  const moodSeries = useMemo(() => moodEntries.slice(-14).map((m) => m.mood), [moodEntries]);
  const energySeries = useMemo(() => moodEntries.slice(-14).map((m) => m.energy), [moodEntries]);

  const symptomFreq = useMemo(() => {
    const counts = symptomLogs
      .slice(-30)
      .flatMap((l) => l.symptoms)
      .reduce<Record<string, number>>((acc, s) => {
        acc[s.type] = (acc[s.type] ?? 0) + 1;
        return acc;
      }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, n]) => ({ label: type.replace('_', ' '), value: n }));
  }, [symptomLogs]);

  const hasNothing = cycleLengths.length === 0 && moodEntries.length === 0;

  return (
    <Screen title="Analytics" subtitle="What your logs add up to">
      {hasNothing && (
        <Reveal index={0}>
          <Surface>
            <View style={[styles.emptyIcon, { backgroundColor: c.fill }]}>
              <Icon name="chart" size={20} color={c.textSecondary} />
            </View>
            <Text variant="title3" style={{ marginTop: SPACE.lg }}>
              Not enough data yet
            </Text>
            <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.sm }}>
              Cycle statistics need at least two logged periods, since a cycle is measured from one
              start to the next.
            </Text>
          </Surface>
        </Reveal>
      )}

      {/* Cycle summary */}
      {stats && (
        <Reveal index={0}>
          <Surface style={{ marginBottom: SPACE.lg }}>
            <Text variant="overline" tone="tertiary">
              Your cycle
            </Text>
            <View style={styles.statRow}>
              <Stat value={stats.averageCycleLength} label="Avg length" unit="d" />
              <View style={[styles.vRule, { backgroundColor: c.separator }]} />
              <Stat value={stats.cycleVariability} label="Variability" unit="d" />
              <View style={[styles.vRule, { backgroundColor: c.separator }]} />
              <Stat value={stats.periodLength} label="Period" unit="d" />
            </View>

            {stats.irregularityDetected && (
              <View style={[styles.notice, { backgroundColor: isDark ? c.fill : '#FDF1E5' }]}>
                <Icon name="info" size={17} color={COLORS.warningDark} />
                <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                  Your cycles vary by more than a week. That is common, and more logs will sharpen
                  predictions.
                </Text>
              </View>
            )}
          </Surface>
        </Reveal>
      )}

      {/* Cycle length trend */}
      {cycleLengths.length > 0 && (
        <Reveal index={1}>
          <Surface style={{ marginBottom: SPACE.lg }}>
            <Text variant="overline" tone="tertiary">
              Cycle length
            </Text>
            <Text variant="title3" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
              Last {cycleLengths.length} cycle{cycleLengths.length === 1 ? '' : 's'}
            </Text>
            <BarChart
              data={cycleLengths.slice(-6).map((v, i, arr) => ({
                label: i === arr.length - 1 ? 'Now' : `${arr.length - 1 - i}×`,
                value: v,
              }))}
              color={COLORS.primary}
              unit="d"
              showAverage={cycleLengths.length > 1}
            />
          </Surface>
        </Reveal>
      )}

      {/* Prediction confidence */}
      {nextPeriod && cycleLengths.length > 0 && (
        <Reveal index={2}>
          <Surface style={{ marginBottom: SPACE.lg }}>
            <Text variant="overline" tone="tertiary">
              Next period
            </Text>
            <View style={styles.predRow}>
              <View style={{ flex: 1 }}>
                <Text variant="title2" style={{ marginTop: SPACE.xs }}>
                  {format(nextPeriod, 'EEE, MMM d')}
                </Text>
                <Text variant="callout" tone="secondary" style={{ marginTop: 2 }}>
                  In {daysUntil(nextPeriod)} days
                </Text>
              </View>
              <View style={styles.confRing}>
                <Text variant="title3" color={COLORS.primaryDark} tabular>
                  {confidence}%
                </Text>
                <Text variant="overline" tone="tertiary">
                  Confidence
                </Text>
              </View>
            </View>
          </Surface>
        </Reveal>
      )}

      {/* Mood & energy */}
      {moodSeries.length > 1 && (
        <Reveal index={3}>
          <Surface style={{ marginBottom: SPACE.lg }}>
            <Text variant="overline" tone="tertiary">
              Mood & energy
            </Text>
            <Text variant="title3" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
              Last {moodSeries.length} check-ins
            </Text>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                <Text variant="caption" tone="secondary">
                  Mood
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
                <Text variant="caption" tone="secondary">
                  Energy
                </Text>
              </View>
            </View>

            <Sparkline data={moodSeries} color={COLORS.primary} height={64} />
            <View style={{ height: SPACE.sm }} />
            <Sparkline data={energySeries} color={COLORS.accent} height={64} />
          </Surface>
        </Reveal>
      )}

      {/* Symptom frequency */}
      {symptomFreq.length > 0 && (
        <Reveal index={4}>
          <Surface>
            <Text variant="overline" tone="tertiary">
              Most logged
            </Text>
            <Text variant="title3" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
              Symptoms, last 30 days
            </Text>
            {symptomFreq.map((s) => {
              const max = symptomFreq[0].value;
              return (
                <View key={s.label} style={styles.freqRow}>
                  <Text variant="callout" style={styles.freqLabel} numberOfLines={1}>
                    {s.label}
                  </Text>
                  <View style={[styles.freqTrack, { backgroundColor: c.fill }]}>
                    <View
                      style={[
                        styles.freqFill,
                        { width: `${(s.value / max) * 100}%`, backgroundColor: COLORS.accent },
                      ]}
                    />
                  </View>
                  <Text variant="caption" tone="tertiary" tabular style={styles.freqCount}>
                    {s.value}
                  </Text>
                </View>
              );
            })}
          </Surface>
        </Reveal>
      )}
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

  statRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACE.lg },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  vRule: { width: StyleSheet.hairlineWidth, height: 32 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginTop: SPACE.xl,
    padding: SPACE.md,
    borderRadius: RADIUS.sm,
  },

  predRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg },
  confRing: { alignItems: 'flex-end' },

  legendRow: { flexDirection: 'row', gap: SPACE.lg, marginBottom: SPACE.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  legendDot: { width: 6, height: 6, borderRadius: 3 },

  freqRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  freqLabel: { width: 92, textTransform: 'capitalize' },
  freqTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  freqFill: { height: '100%', borderRadius: 3 },
  freqCount: { width: 18, textAlign: 'right' },
});

export default AnalyticsScreen;
