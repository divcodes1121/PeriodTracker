import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import Text from '../components/Text';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Reveal from '../components/Reveal';
import Icon, { IconName } from '../components/Icon';
import MetricCard from '../components/MetricCard';
import CycleTimeline from '../components/CycleTimeline';
import ThemeToggle from '../components/ThemeToggle';
import { COLORS, inkFor } from '../constants';
import { SPACE, RADIUS, MIN_TAP } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { usePhaseColor } from '../theme/usePhaseColor';
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

/** Time-aware greeting — small touch, but it's what makes a dashboard feel present. */
function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

interface QuickAction {
  label: string;
  icon: IconName;
  accent: string;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Mood', icon: 'heart', accent: COLORS.primary, route: 'MoodTracker' },
  { label: 'Symptoms', icon: 'activity', accent: COLORS.accent, route: 'SymptomLogger' },
  { label: 'Insights', icon: 'sparkles', accent: COLORS.success, route: 'AIInsights' },
];

/**
 * The primary CTA — logging a period is what makes every prediction real, so
 * it gets a deep-rose hero card rather than a slot in the quick-action grid.
 * Deep rose (not the pastel) so the white label clears AA.
 */
function LogPeriodCTA({ onPress }: { onPress: () => void }) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log period"
      accessibilityHint="Opens the period logger"
      onPressIn={() => {
        press.value = withSpring(1, { damping: 15, stiffness: 260, mass: 0.7 });
        Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 18, stiffness: 180, mass: 0.9 });
      }}
      onPress={onPress}
    >
      <Animated.View style={[styles.cta, style]}>
        {/* Soft decorative blooms — light on deep rose, no text over them */}
        <View style={[styles.ctaBloom, { top: -46, right: -32, width: 130, height: 130 }]} />
        <View style={[styles.ctaBloom, { bottom: -58, right: 66, width: 96, height: 96, opacity: 0.6 }]} />
        <View style={styles.ctaIcon}>
          <Icon name="drop" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline" color="#FFFFFF">
            Log period
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.8)" style={{ marginTop: 1 }}>
            Predictions sharpen with every log
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color="rgba(255,255,255,0.85)" />
      </Animated.View>
    </Pressable>
  );
}

const HomeScreen = ({ navigation }: any) => {
  const { user, periodEntries } = useAppStore();
  const { colors: c, isDark } = useTheme();
  const phaseColorFor = usePhaseColor();
  const [refreshing, setRefreshing] = useState(false);

  const cycle = useMemo(() => {
    if (!user) return null;
    const { lastPeriodStart, cycleLength, periodLength } = deriveCycleContext(user, periodEntries);
    const dayOfCycle = getDayOfCycle(lastPeriodStart, cycleLength);
    return {
      dayOfCycle,
      cycleLength,
      periodLength,
      phase: getCyclePhase(dayOfCycle, cycleLength, periodLength),
      fertility: getFertilityWindow(lastPeriodStart, cycleLength),
      daysUntilPeriod: daysUntil(getPredictedNextPeriod(lastPeriodStart, cycleLength)),
    };
  }, [user, periodEntries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  if (!user || !cycle) {
    return (
      <Screen scroll={false}>
        <View style={styles.loading}>
          <Text tone="secondary">Loading</Text>
        </View>
      </Screen>
    );
  }

  const raw = cycle.phase?.name ?? 'menstrual';
  const phaseName = raw.charAt(0).toUpperCase() + raw.slice(1);
  const phaseColor = phaseColorFor(raw);
  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
      }
    >
      {/* Greeting */}
      <Reveal index={0}>
        <View style={styles.greetRow}>
          <View style={{ flex: 1 }}>
            <Text variant="overline" tone="secondary">
              {format(new Date(), 'EEEE, MMMM d')}
            </Text>
            <Text variant="title1" style={{ marginTop: 4 }}>
              {greeting()}, {firstName}
            </Text>
          </View>
          <ThemeToggle />
        </View>
      </Reveal>

      {/* Hero — where am I in my cycle */}
      <Reveal index={1}>
        <View style={styles.hero}>
          {/* Dawn wash behind the ring — the one place the canvas blushes */}
          <View pointerEvents="none" style={[styles.wash, { backgroundColor: c.auroraOrbs[0], top: -30, left: '4%' }]} />
          <View pointerEvents="none" style={[styles.wash, { backgroundColor: c.auroraOrbs[1], top: 60, right: '2%' }]} />

          <CycleTimeline
            dayOfCycle={cycle.dayOfCycle}
            cycleLength={cycle.cycleLength}
            periodLength={cycle.periodLength}
            phaseName={phaseName}
            size={268}
          >
            <Text variant="overline" tone="secondary">
              Day {cycle.dayOfCycle} of {cycle.cycleLength}
            </Text>
            <Text variant="display" style={styles.phaseTitle}>
              {phaseName}
            </Text>
            <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
          </CycleTimeline>

          <Text variant="callout" tone="secondary" style={styles.heroCaption}>
            {cycle.phase?.description}
          </Text>
        </View>
      </Reveal>

      {/* Primary CTA */}
      <Reveal index={2}>
        <LogPeriodCTA onPress={() => navigation.navigate('PeriodLogger')} />
      </Reveal>

      {/* Today's insight */}
      <Reveal index={3}>
        <Surface
          onPress={() => navigation.navigate('AIInsights')}
          accessibilityLabel="Today's insight"
          accessibilityHint="Opens AI insights"
          style={{ marginBottom: SPACE.lg }}
        >
          <View style={styles.insightHead}>
            <View style={[styles.insightIcon, { backgroundColor: isDark ? c.fill : COLORS.primarySoft }]}>
              <Icon name="sparkles" size={15} color={COLORS.primaryDark} />
            </View>
            <Text variant="overline" tone="secondary" style={{ flex: 1 }}>
              Today
            </Text>
            <Icon name="chevronRight" size={17} color={c.textTertiary} />
          </View>
          <Text variant="body" style={{ marginTop: SPACE.md }}>
            {insightFor(raw)}
          </Text>
        </Surface>
      </Reveal>

      {/* Countdown + fertility */}
      <Reveal index={4}>
        <View style={styles.metrics}>
          <MetricCard
            label="Next period"
            value={formatCountdown(cycle.daysUntilPeriod)}
            icon="drop"
            accent={COLORS.menstrual}
            onPress={() => navigation.navigate('Calendar')}
          />
          <MetricCard
            label="Fertile window"
            value={
              cycle.fertility.daysFromNow < 0
                ? 'Open now'
                : formatCountdown(cycle.fertility.daysFromNow)
            }
            icon="leaf"
            accent={COLORS.success}
            onPress={() => navigation.navigate('Calendar')}
          />
        </View>
      </Reveal>

      {/* Reset — the quiet doorway into Tiny Escapes */}
      <Reveal index={5}>
        <Surface
          onPress={() => navigation.navigate('Reset')}
          accessibilityLabel="Take a reset"
          accessibilityHint="Opens Tiny Escapes"
          style={styles.resetCard}
        >
          <View style={styles.resetRow}>
            <View style={[styles.actionIcon, { backgroundColor: isDark ? c.fill : COLORS.accentSoft }]}>
              <Icon name="wind" size={19} color={isDark ? COLORS.accent : COLORS.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headline">Need a moment?</Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
                A two-minute reset, no pressure
              </Text>
            </View>
            <Icon name="chevronRight" size={17} color={c.textTertiary} />
          </View>
        </Surface>
      </Reveal>

      {/* Quick actions */}
      <Reveal index={6}>
        <Text variant="overline" tone="secondary" style={styles.sectionLabel}>
          Check in
        </Text>
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((a) => (
            <Surface
              key={a.label}
              onPress={() => navigation.navigate(a.route)}
              accessibilityLabel={`Log ${a.label}`}
              padded={false}
              style={styles.action}
            >
              <View style={styles.actionInner}>
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: isDark ? c.fill : `${a.accent}1F` },
                  ]}
                >
                  <Icon name={a.icon} size={19} color={isDark ? a.accent : inkFor(a.accent)} />
                </View>
                <Text variant="subhead">{a.label}</Text>
              </View>
            </Surface>
          ))}
        </View>
      </Reveal>
    </Screen>
  );
};

/** Phase-appropriate one-liner. Supportive, never prescriptive. */
function insightFor(phase: string): string {
  switch (phase) {
    case 'menstrual':
      return 'Energy is naturally lower today. Gentle movement and warmth tend to help more than pushing through.';
    case 'follicular':
      return 'Estrogen is rising and energy usually follows. A good day to start something you have been putting off.';
    case 'ovulation':
      return 'You may feel at your most social and clear-headed today. Worth scheduling the harder conversations.';
    default:
      return 'Energy may dip in the days ahead. Consider a lighter workout and an earlier night.';
  }
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  greetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACE.h2,
    marginBottom: SPACE.xxl,
  },

  hero: { alignItems: 'center', marginBottom: SPACE.xl },
  wash: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  phaseTitle: { marginTop: SPACE.xs },
  phaseDot: { width: 6, height: 6, borderRadius: 3, marginTop: SPACE.md },
  heroCaption: {
    textAlign: 'center',
    marginTop: SPACE.xl,
    paddingHorizontal: SPACE.lg,
    maxWidth: 320,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.xl,
    paddingVertical: SPACE.lg,
    marginBottom: SPACE.lg,
    overflow: 'hidden',
    minHeight: MIN_TAP + 26,
  },
  ctaBloom: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  ctaIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  insightHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  insightIcon: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metrics: { flexDirection: 'row', gap: SPACE.md, marginBottom: SPACE.lg },

  resetCard: { marginBottom: SPACE.h1 },
  resetRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },

  sectionLabel: { marginBottom: SPACE.md },
  actions: { flexDirection: 'row', gap: SPACE.md },
  action: { flex: 1 },
  actionInner: {
    minHeight: MIN_TAP + 44,
    paddingVertical: SPACE.lg,
    paddingHorizontal: SPACE.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
