import { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { fontScale, scale, CONTENT_MAX_WIDTH } from '../utils/responsive';
import { useTheme } from '../theme/useTheme';
import type { ThemePalette } from '../theme/palette';
import { useAppStore } from '../store/appStore';
import { generateCycleStats, daysUntil, getPredictedNextPeriod } from '../utils/cycleCalculations';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import EmojiChip from '../components/EmojiChip';

const AnalyticsScreen = () => {
  const { user, periodEntries, moodEntries } = useAppStore();
  const { colors: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, CONTENT_MAX_WIDTH) - SPACING.lg * 2 - SPACING.lg * 2;

  const cycleStats = useMemo(() => {
    if (!user || periodEntries.length === 0) return null;
    const cycleLengths = periodEntries
      .slice(0, 6)
      .map(
        (e) =>
          Math.ceil(
            ((e.endDate?.getTime() || new Date().getTime()) - e.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
      );
    return generateCycleStats(user.lastPeriodStart, user.periodLength, cycleLengths);
  }, [user, periodEntries]);

  const moodTrends = useMemo(() => {
    if (moodEntries.length === 0) return null;
    const last7 = moodEntries.slice(-7);
    return {
      labels: last7.map((_, i) => `${i + 1}`),
      datasets: [{ data: last7.map((m) => m.mood), color: () => COLORS.primary }],
    };
  }, [moodEntries]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Patterns from your cycle & wellness</Text>
          </Animated.View>

          {cycleStats ? (
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <GlassCard style={styles.card}>
                <Text style={styles.cardTitle}>Cycle statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{cycleStats.averageCycleLength}</Text>
                    <Text style={styles.statLabel}>Avg cycle</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{cycleStats.cycleVariability}</Text>
                    <Text style={styles.statLabel}>Variability</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statNum}>{cycleStats.periodLength}</Text>
                    <Text style={styles.statLabel}>Period days</Text>
                  </View>
                </View>
                {cycleStats.irregularityDetected && (
                  <View style={styles.alert}>
                    <Text style={styles.alertText}>
                      ⚠️ Your cycles show some variation. Keep tracking for better predictions.
                    </Text>
                  </View>
                )}
              </GlassCard>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <GlassCard style={styles.card}>
                <EmojiChip emoji="📊" size={scale(48)} float />
                <Text style={[styles.cardTitle, { marginTop: SPACING.md }]}>No data yet</Text>
                <Text style={styles.muted}>
                  Log a few periods and check-ins to unlock cycle statistics and trends.
                </Text>
              </GlassCard>
            </Animated.View>
          )}

          {moodTrends && (
            <Animated.View entering={FadeInDown.delay(180).springify()}>
              <GlassCard style={styles.card}>
                <Text style={styles.cardTitle}>Mood trend (last 7)</Text>
                <View style={styles.chartWrap}>
                  <LineChart
                    data={moodTrends}
                    width={chartWidth}
                    height={200}
                    chartConfig={{
                      backgroundGradientFrom: 'transparent',
                      backgroundGradientTo: 'transparent',
                      backgroundGradientFromOpacity: 0,
                      backgroundGradientToOpacity: 0,
                      color: (o = 1) => `rgba(255,107,157,${o})`,
                      labelColor: () => c.textSecondary,
                      strokeWidth: 3,
                      propsForDots: { r: '5', strokeWidth: '2', stroke: COLORS.primaryDark },
                    }}
                    bezier
                    style={{ marginLeft: -SPACING.md }}
                  />
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {user && (
            <Animated.View entering={FadeInDown.delay(260).springify()}>
              <GlassCard style={styles.card}>
                <Text style={styles.cardTitle}>Next predictions</Text>
                <View style={styles.predRow}>
                  <EmojiChip emoji="🩸" size={scale(42)} colors={['#FFFFFF', '#FFD9E6']} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.predMain}>
                      {getPredictedNextPeriod(user.lastPeriodStart, user.cycleLength).toLocaleDateString()}
                    </Text>
                    <Text style={styles.muted}>
                      In {daysUntil(getPredictedNextPeriod(user.lastPeriodStart, user.cycleLength))} days
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          )}

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
  muted: { ...TYPOGRAPHY.body2, color: c.textSecondary, marginTop: 4 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNum: { fontSize: fontScale(30), fontWeight: '800', color: c.text },
  statLabel: { ...TYPOGRAPHY.caption, color: c.textSecondary, marginTop: 2 },

  alert: {
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(255,152,0,0.12)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    borderRadius: 10,
    padding: SPACING.md,
  },
  alertText: { ...TYPOGRAPHY.body2, color: c.text },

  chartWrap: { alignItems: 'center', overflow: 'hidden' },

  predRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  predMain: { ...TYPOGRAPHY.body1, fontWeight: '700', color: c.text },
});

export default AnalyticsScreen;
