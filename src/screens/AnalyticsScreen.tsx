import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text, SafeAreaView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { useAppStore } from '../store/appStore';
import {
  generateCycleStats,
  daysUntil,
  getPredictedNextPeriod,
} from '../utils/cycleCalculations';
import Card from '../components/Card';

const AnalyticsScreen = ({ navigation }: any) => {
  const { user, periodEntries, moodEntries } = useAppStore();

  const cycleStats = useMemo(() => {
    if (!user || periodEntries.length === 0) return null;

    const cycleLengths = periodEntries
      .slice(0, 6)
      .map((e) => Math.ceil((e.endDate?.getTime() || new Date().getTime()) - e.startDate.getTime()) / (1000 * 60 * 60 * 24));

    return generateCycleStats(user.lastPeriodStart, user.periodLength, cycleLengths);
  }, [user, periodEntries]);

  const moodTrends = useMemo(() => {
    if (moodEntries.length === 0) return null;

    const last7Days = moodEntries.slice(-7);
    return {
      labels: last7Days.map((_, i) => `Day ${i + 1}`),
      datasets: [
        {
          data: last7Days.map((m) => m.mood),
          color: () => COLORS.primary,
        },
      ],
    };
  }, [moodEntries]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={TYPOGRAPHY.h2}>📈 Your Analytics</Text>
        </View>

        {/* Cycle Stats */}
        {cycleStats && (
          <Card style={styles.card}>
            <Text style={TYPOGRAPHY.h4}>Cycle Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>
                  Avg Cycle Length
                </Text>
                <Text style={TYPOGRAPHY.h3}>{cycleStats.averageCycleLength}</Text>
                <Text style={TYPOGRAPHY.caption}>days</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>
                  Variability
                </Text>
                <Text style={TYPOGRAPHY.h3}>{cycleStats.cycleVariability}</Text>
                <Text style={TYPOGRAPHY.caption}>days</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>
                  Period Length
                </Text>
                <Text style={TYPOGRAPHY.h3}>{cycleStats.periodLength}</Text>
                <Text style={TYPOGRAPHY.caption}>days</Text>
              </View>
            </View>

            {cycleStats.irregularityDetected && (
              <View style={styles.alertBox}>
                <Text style={TYPOGRAPHY.body2}>
                  ⚠️ Your cycles show some variation. Consider tracking more cycles for better
                  predictions.
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Mood Trends */}
        {moodTrends && (
          <Card style={styles.card}>
            <Text style={TYPOGRAPHY.h4}>Mood Trends (Last 7 Days)</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={moodTrends}
                width={300}
                height={200}
                chartConfig={{
                  backgroundColor: COLORS.white,
                  backgroundGradientFrom: COLORS.white,
                  backgroundGradientTo: COLORS.white,
                  color: () => COLORS.primary,
                  strokeWidth: 2,
                }}
              />
            </View>
          </Card>
        )}

        {/* Predictions */}
        {user && (
          <Card style={styles.card}>
            <Text style={TYPOGRAPHY.h4}>📅 Next Predictions</Text>
            <View style={styles.predictionItem}>
              <Text style={TYPOGRAPHY.body1}>
                Next Period: {getPredictedNextPeriod(user.lastPeriodStart, user.cycleLength).toLocaleDateString()}
              </Text>
              <Text style={[TYPOGRAPHY.body2, { color: COLORS.textSecondary }]}>
                In {daysUntil(getPredictedNextPeriod(user.lastPeriodStart, user.cycleLength))} days
              </Text>
            </View>
          </Card>
        )}

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
  card: {
    marginBottom: SPACING.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  alertBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  chartContainer: {
    marginTop: SPACING.md,
    marginLeft: -SPACING.lg,
    overflow: 'hidden',
  },
  predictionItem: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 8,
  },
});

export default AnalyticsScreen;
