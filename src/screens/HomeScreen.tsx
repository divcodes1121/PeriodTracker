import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, GRADIENT } from '../constants';
import { useAppStore } from '../store/appStore';
import {
  getDayOfCycle,
  getCyclePhase,
  getFertilityWindow,
  formatCountdown,
  getPredictedNextPeriod,
  daysUntil,
} from '../utils/cycleCalculations';
import AnimatedCard from '../components/AnimatedCard';
import Button from '../components/Button';

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
      nextPeriodDate: nextPeriod,
    };
  }, [user]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  if (!user || !cycleInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={TYPOGRAPHY.h2}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)}>
          <View style={styles.header}>
            <Text style={TYPOGRAPHY.h2}>Hello, {user.name}! 👋</Text>
            <Text style={[TYPOGRAPHY.body2, { color: COLORS.textSecondary }]}>
              Today is day {cycleInfo.dayOfCycle} of your cycle
            </Text>
          </View>
        </Animated.View>

        {/* Cycle Phase Card */}
        <Animated.View entering={SlideInDown.delay(100)}>
          <LinearGradient
            colors={[cycleInfo.phase?.color || COLORS.primary, COLORS.primaryDark] as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.phaseCard}
          >
            <Text style={[TYPOGRAPHY.h3, { color: COLORS.white }]}>
              {cycleInfo.phase?.name || 'Cycle Phase'}
            </Text>
            <Text
              style={[TYPOGRAPHY.body2, { color: COLORS.white, marginTop: SPACING.sm }]}
              numberOfLines={2}
            >
              {cycleInfo.phase?.description}
            </Text>

            <View style={styles.phaseDetails}>
              <View style={styles.detailItem}>
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.white }]}>
                  Day {cycleInfo.dayOfCycle}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.white }]}>
                  Wellness: {cycleInfo.phase?.wellnessScore}/10
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Next Period Prediction */}
        <AnimatedCard delay={2} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={TYPOGRAPHY.h4}>📅 Next Period</Text>
            <Text style={[TYPOGRAPHY.body2, { color: COLORS.primary }]}>
              {formatCountdown(cycleInfo.daysUntilPeriod)}
            </Text>
          </View>
          <LinearGradient
            colors={GRADIENT.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.countdownBar}
          >
            <View
              style={[
                styles.countdownFill,
                {
                  width: `${((cycleInfo.dayOfCycle / user.cycleLength) * 100).toFixed(0)}%` as any,
                },
              ]}
            />
          </LinearGradient>
          <Text style={[TYPOGRAPHY.caption, { marginTop: SPACING.sm }]}>
            {((cycleInfo.dayOfCycle / user.cycleLength) * 100).toFixed(0)}% through your cycle
          </Text>
        </AnimatedCard>

        {/* Fertility Window */}
        <AnimatedCard delay={3} style={styles.card}>
          <Text style={TYPOGRAPHY.h4}>💚 Fertility Window</Text>
          <View style={styles.fertilityInfo}>
            <Text
              style={[
                TYPOGRAPHY.body1,
                { color: cycleInfo.fertility.daysFromNow < 0 ? COLORS.success : COLORS.text },
              ]}
            >
              {cycleInfo.fertility.daysFromNow < 0
                ? '✨ Fertility window active'
                : formatCountdown(cycleInfo.fertility.daysFromNow)}
            </Text>
            <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>
              {cycleInfo.fertility.start.toLocaleDateString()} -{' '}
              {cycleInfo.fertility.end.toLocaleDateString()}
            </Text>
          </View>
        </AnimatedCard>

        {/* Quick Actions */}
        <AnimatedCard delay={4} style={styles.card}>
          <Text style={TYPOGRAPHY.h4}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <Button
              title="Log Symptoms"
              onPress={() => navigation.navigate('SymptomLogger')}
              variant="outline"
              size="small"
              style={styles.actionButton}
            />
            <Button
              title="Daily Check-in"
              onPress={() => navigation.navigate('MoodTracker')}
              variant="outline"
              size="small"
              style={styles.actionButton}
            />
            <Button
              title="View Calendar"
              onPress={() => navigation.navigate('Calendar')}
              variant="outline"
              size="small"
              style={styles.actionButton}
            />
            <Button
              title="Analytics"
              onPress={() => navigation.navigate('Analytics')}
              variant="outline"
              size="small"
              style={styles.actionButton}
            />
          </View>
        </AnimatedCard>

        {/* AI Insights Preview */}
        <AnimatedCard delay={5} style={styles.card}>
          <Text style={TYPOGRAPHY.h4}>✨ AI Insights</Text>
          <Text style={[TYPOGRAPHY.body2, { color: COLORS.textSecondary }]}>
            Based on your last 8 cycles, you may experience mild fatigue and cravings 2–3 days
            before your period.
          </Text>
          <Button
            title="View All Insights"
            onPress={() => navigation.navigate('AIInsights')}
            variant="ghost"
            size="small"
            style={styles.viewAllButton}
          />
        </AnimatedCard>

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
  phaseCard: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  phaseDetails: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  detailItem: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  card: {
    marginBottom: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  countdownBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  countdownFill: {
    height: '100%',
    opacity: 0.3,
  },
  fertilityInfo: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  viewAllButton: {
    marginTop: SPACING.md,
  },
});

export default HomeScreen;
