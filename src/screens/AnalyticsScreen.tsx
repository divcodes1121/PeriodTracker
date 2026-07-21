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
import GhostChart from '../components/GhostChart';
import AnimatedNumber from '../components/AnimatedNumber';
import { useTheme } from '../theme/useTheme';
import { useAtmosphere } from '../theme/useAtmosphere';
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

/**
 * Analytics.
 *
 * The rule this screen now follows: **every panel always renders.** Previously
 * it was five `{condition && ...}` blocks, so a new account saw one grey box
 * reading "Not enough data yet" on an otherwise blank page — which looks like a
 * broken screen rather than a new one, and gives no sense of what logging will
 * eventually buy you.
 *
 * Each panel now knows both of its states. With data it draws the real chart;
 * without, it draws its own shape in ghost form (see components/GhostChart)
 * with one quiet line explaining what unlocks it. The layout is identical
 * either way, so the screen fills in rather than growing.
 *
 * Ghost charts carry no numbers or axis labels — nothing on this screen can be
 * mistaken for a measurement that was not taken.
 */

/** One big number with a quiet label. Renders an em-dash when unknown. */
function Stat({ value, label, unit }: { value: number | null; label: string; unit?: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValue}>
        {value === null ? (
          <Text variant="title1" tone="tertiary">
            —
          </Text>
        ) : (
          <AnimatedNumber value={value} variant="title1" />
        )}
        {unit && value !== null ? (
          <Text variant="caption" tone="tertiary" style={{ marginBottom: 3 }}>
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="overline" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Section heading shared by every panel, so they read as one system. */
function PanelHead({ over, title }: { over: string; title: string }) {
  return (
    <>
      <Text variant="overline" tone="secondary">
        {over}
      </Text>
      <Text variant="title3" style={{ marginTop: SPACE.xs, marginBottom: SPACE.xl }}>
        {title}
      </Text>
    </>
  );
}

const AnalyticsScreen = () => {
  const { user, periodEntries, moodEntries, symptomLogs } = useAppStore();
  const { colors: c, isDark } = useTheme();
  const atmos = useAtmosphere();

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

  const logged = periodEntries.length;

  return (
    <Screen title="Analytics" subtitle="What your logs add up to">
      {/* ---- Summary. Always present; unknown values read as em-dashes ---- */}
      <Reveal index={0}>
        <Surface variant="hero" style={{ marginBottom: SPACE.sm }}>
          <Text variant="overline" tone="secondary">
            Your cycle
          </Text>
          <View style={styles.statRow}>
            <Stat value={stats?.averageCycleLength ?? null} label="Avg length" unit="d" />
            <View style={[styles.vRule, { backgroundColor: c.separator }]} />
            <Stat value={stats?.cycleVariability ?? null} label="Variability" unit="d" />
            <View style={[styles.vRule, { backgroundColor: c.separator }]} />
            <Stat value={stats?.periodLength ?? user?.periodLength ?? null} label="Period" unit="d" />
          </View>

          {stats?.irregularityDetected && (
            <View style={[styles.notice, { backgroundColor: isDark ? c.fill : '#FDF1E5' }]}>
              <Icon name="info" size={17} color={COLORS.warningDark} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                Your cycles vary by more than a week. That is common, and more logs will sharpen
                predictions.
              </Text>
            </View>
          )}

          {/* Progress toward a usable history, so "not yet" has a shape. */}
          {cycleLengths.length === 0 && (
            <View style={styles.progress}>
              <View style={[styles.track, { backgroundColor: c.fill }]}>
                <View
                  style={[
                    styles.fill,
                    { width: `${Math.min(100, (logged / 2) * 100)}%`, backgroundColor: atmos.glow },
                  ]}
                />
              </View>
              <Text variant="caption" tone="secondary" style={{ marginTop: SPACE.sm }}>
                {logged === 0
                  ? 'Log your first period to start your history.'
                  : 'One more logged period and these fill in — a cycle is measured from one start to the next.'}
              </Text>
            </View>
          )}
        </Surface>
      </Reveal>

      {/* ---- Cycle length trend ---- */}
      <Reveal index={1}>
        <Surface lift style={{ marginBottom: SPACE.sm }}>
          <PanelHead
            over="Cycle length"
            title={
              cycleLengths.length > 0
                ? `Last ${cycleLengths.length} cycle${cycleLengths.length === 1 ? '' : 's'}`
                : 'How your cycles compare'
            }
          />
          {cycleLengths.length > 0 ? (
            <BarChart
              data={cycleLengths.slice(-6).map((v, i, arr) => ({
                label: i === arr.length - 1 ? 'Now' : `${arr.length - 1 - i}×`,
                value: v,
              }))}
              color={COLORS.primary}
              unit="d"
              showAverage={cycleLengths.length > 1}
            />
          ) : (
            <GhostChart
              shape="bars"
              accent={COLORS.primary}
              label="Each bar will be one cycle, start to start."
              hint="Needs two logged periods."
            />
          )}
        </Surface>
      </Reveal>

      {/* ---- Prediction ---- */}
      <Reveal index={2}>
        <Surface lift style={{ marginBottom: SPACE.sm }}>
          <Text variant="overline" tone="secondary">
            Next period
          </Text>
          <View style={styles.predRow}>
            <View style={{ flex: 1 }}>
              <Text variant="title2" style={{ marginTop: SPACE.xs }}>
                {nextPeriod ? format(nextPeriod, 'EEE, MMM d') : '—'}
              </Text>
              <Text variant="callout" tone="secondary" style={{ marginTop: 2 }}>
                {nextPeriod ? `In ${daysUntil(nextPeriod)} days` : 'Set up your cycle to predict'}
              </Text>
            </View>
            <View style={styles.confRing}>
              <Text variant="title3" color={COLORS.primaryDark} tabular>
                {confidence}%
              </Text>
              <Text variant="overline" tone="secondary">
                Confidence
              </Text>
            </View>
          </View>

          {/* Confidence as a bar, so the number has a body. */}
          <View style={[styles.track, { backgroundColor: c.fill, marginTop: SPACE.lg }]}>
            <View
              style={[
                styles.fill,
                { width: `${Math.max(4, confidence)}%`, backgroundColor: COLORS.primary },
              ]}
            />
          </View>
          <Text variant="caption" tone="tertiary" style={{ marginTop: SPACE.sm }}>
            {confidence >= 70
              ? 'Your cycles are steady enough for a confident estimate.'
              : confidence > 0
                ? 'Confidence rises as you log more cycles.'
                : 'Predictions start from your onboarding answers until you log a period.'}
          </Text>
        </Surface>
      </Reveal>

      {/* ---- Mood & energy ---- */}
      <Reveal index={3}>
        <Surface variant="quiet" lift style={{ marginBottom: SPACE.sm }}>
          <PanelHead
            over="Mood & energy"
            title={
              moodSeries.length > 1 ? `Last ${moodSeries.length} check-ins` : 'How you have been feeling'
            }
          />
          {moodSeries.length > 1 ? (
            <>
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
            </>
          ) : (
            <GhostChart
              accent={COLORS.accent}
              label="Mood and energy traced across your check-ins."
              hint="Needs two check-ins."
            />
          )}
        </Surface>
      </Reveal>

      {/* ---- Symptom frequency ---- */}
      <Reveal index={4}>
        <Surface variant="quiet" lift>
          <PanelHead
            over="Most logged"
            title={symptomFreq.length > 0 ? 'Symptoms, last 30 days' : 'What your body tends to do'}
          />
          {symptomFreq.length > 0 ? (
            symptomFreq.map((s) => {
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
            })
          ) : (
            <GhostChart
              shape="bars"
              accent={COLORS.success}
              label="Your most frequent symptoms, ranked."
              hint="Needs one symptom log."
            />
          )}
        </Surface>
      </Reveal>
    </Screen>
  );
};

const styles = StyleSheet.create({
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

  progress: { marginTop: SPACE.xl },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },

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
