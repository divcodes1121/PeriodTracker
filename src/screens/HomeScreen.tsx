import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import Text from '../components/Text';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Reveal from '../components/Reveal';
import Icon, { IconName } from '../components/Icon';
import MetricCard from '../components/MetricCard';
import CycleTimeline from '../components/CycleTimeline';
import LivePhaseTitle from '../components/LivePhaseTitle';
import ThemeToggle from '../components/ThemeToggle';
import { useScrollY } from '../components/ScrollContext';
import { COLORS, inkFor } from '../constants';
import { SPACE, RADIUS, MIN_TAP } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { usePhaseColor } from '../theme/usePhaseColor';
import { useAtmosphere } from '../theme/useAtmosphere';
import { greetingFor } from '../theme/atmosphere';
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

/**
 * Home.
 *
 * The composition rule that replaced the old ten-block column: **proximity
 * carries grouping**. Related things sit SPACE.sm apart and read as one object;
 * unrelated clusters sit SPACE.h2 apart. Previously every gap was SPACE.lg, so
 * ten equally-spaced identical cards produced a list with no structure — the
 * "everything feels disconnected" symptom, which was a spacing problem wearing
 * a styling costume.
 *
 * Three clusters, in descending importance:
 *   1. The ring — floats directly on the live canvas, in no card at all. That
 *      is what makes it read as hero; wrapping it in the same Surface as
 *      everything else was flattening it.
 *   2. Act — the log CTA welded to its two outcome metrics, because logging is
 *      what makes those two numbers real.
 *   3. Tend — insight, reset, check-ins. Quiet variants, so they recede into
 *      the atmosphere rather than competing with the hero.
 */

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
 * The primary CTA — logging a period is what makes every prediction real, so it
 * gets a deep-rose filled card rather than a slot in the quick-action grid.
 * Deep rose (not the pastel) so the white label clears AA.
 */
function LogPeriodCTA({ onPress }: { onPress: () => void }) {
  const press = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.015 }],
  }));

  // The blooms drift apart very slightly under the press, so the card feels
  // like it has something alive inside rather than being a painted rectangle.
  const bloom = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + press.value * 0.08 }],
    opacity: 1 - press.value * 0.15,
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
        <Animated.View
          style={[styles.ctaBloom, { top: -46, right: -32, width: 130, height: 130 }, bloom]}
        />
        <Animated.View
          style={[
            styles.ctaBloom,
            { bottom: -58, right: 66, width: 96, height: 96, opacity: 0.6 },
            bloom,
          ]}
        />
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

/**
 * The hero, wrapped so it responds to scroll: as the page moves the ring drifts
 * up at half speed and softens, letting the content below feel like it is
 * rising over the ring rather than the whole page sliding as one sheet.
 */
function Hero({ children }: { children: React.ReactNode }) {
  const scrollY = useScrollY();

  const style = useAnimatedStyle(() => {
    if (!scrollY) return {};
    return {
      opacity: interpolate(scrollY.value, [0, 260], [1, 0.55], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(scrollY.value, [0, 300], [0, -46], Extrapolation.CLAMP) },
        { scale: interpolate(scrollY.value, [0, 300], [1, 0.94], Extrapolation.CLAMP) },
      ],
    };
  });

  return <Animated.View style={[styles.hero, style]}>{children}</Animated.View>;
}

const HomeScreen = ({ navigation }: any) => {
  const { user, periodEntries } = useAppStore();
  const { colors: c, isDark } = useTheme();
  const phaseColorFor = usePhaseColor();
  const atmos = useAtmosphere();
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
      {/* ---- Greeting ------------------------------------------------------
          Deliberately quiet. It used to be title1, competing with the phase
          name below it for the same job; the hero owns the headline now. */}
      <Reveal index={0}>
        <View style={styles.greetRow}>
          <View style={{ flex: 1 }}>
            <Text variant="overline" tone="secondary">
              {format(new Date(), 'EEEE, MMMM d')}
            </Text>
            <Text variant="title3" style={{ marginTop: 4 }}>
              {greetingFor(atmos.band)}, {firstName}
            </Text>
          </View>
          <ThemeToggle />
        </View>
      </Reveal>

      {/* ---- 1. The ring. No card. ---------------------------------------- */}
      <Reveal index={1}>
        <Hero>
          <CycleTimeline
            dayOfCycle={cycle.dayOfCycle}
            cycleLength={cycle.cycleLength}
            periodLength={cycle.periodLength}
            phaseName={phaseName}
            glow={atmos.glow}
            lightAngle={atmos.lightAngle}
            size={296}
          >
            <Text variant="overline" tone="secondary">
              Day {cycle.dayOfCycle} of {cycle.cycleLength}
            </Text>
            <LivePhaseTitle name={phaseName} glow={atmos.glow} style={styles.phaseTitle} />
            <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
          </CycleTimeline>

          <Text variant="callout" tone="secondary" style={styles.heroCaption}>
            {cycle.phase?.description}
          </Text>
        </Hero>
      </Reveal>

      {/* ---- 2. Act: the CTA welded to the numbers it changes -------------- */}
      <Reveal index={2}>
        <View style={styles.cluster}>
          <LogPeriodCTA onPress={() => navigation.navigate('PeriodLogger')} />
          {/* Asymmetric on purpose — two equal tiles read as a table, an
              uneven pair reads as a composition. */}
          <View style={styles.metrics}>
            <View style={{ flex: 1.25 }}>
              <MetricCard
                label="Next period"
                value={formatCountdown(cycle.daysUntilPeriod)}
                icon="drop"
                accent={COLORS.menstrual}
                onPress={() => navigation.navigate('Calendar')}
              />
            </View>
            <View style={{ flex: 1 }}>
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
          </View>
        </View>
      </Reveal>

      {/* ---- 3. Tend: quiet surfaces that sit in the atmosphere ------------ */}
      <Text variant="overline" tone="secondary" style={styles.sectionLabel}>
        Today
      </Text>

      <Reveal index={3}>
        <Surface
          variant="quiet"
          lift
          onPress={() => navigation.navigate('AIInsights')}
          accessibilityLabel="Today's insight"
          accessibilityHint="Opens AI insights"
          style={styles.tendCard}
        >
          <View style={styles.insightHead}>
            <View
              style={[styles.insightIcon, { backgroundColor: isDark ? c.fill : COLORS.primarySoft }]}
            >
              <Icon name="sparkles" size={15} color={COLORS.primaryDark} />
            </View>
            <Text variant="overline" tone="secondary" style={{ flex: 1 }}>
              Insight
            </Text>
            <Icon name="chevronRight" size={17} color={c.textTertiary} />
          </View>
          <Text variant="body" style={{ marginTop: SPACE.md }}>
            {insightFor(raw)}
          </Text>
        </Surface>
      </Reveal>

      <Reveal index={4}>
        <Surface
          variant="quiet"
          lift
          onPress={() => navigation.navigate('Reset')}
          accessibilityLabel="Take a reset"
          accessibilityHint="Opens Tiny Escapes"
          style={styles.tendCard}
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

      <Reveal index={5}>
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((a) => (
            <Surface
              key={a.label}
              variant="quiet"
              onPress={() => navigation.navigate(a.route)}
              accessibilityLabel={`Log ${a.label}`}
              padded={false}
              style={styles.action}
            >
              <View style={styles.actionInner}>
                <View
                  style={[styles.actionIcon, { backgroundColor: isDark ? c.fill : `${a.accent}1F` }]}
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
    marginTop: SPACE.h1,
    marginBottom: SPACE.lg,
  },

  hero: { alignItems: 'center', marginBottom: SPACE.h2 },
  phaseTitle: { marginTop: SPACE.xs },
  phaseDot: { width: 6, height: 6, borderRadius: 3, marginTop: SPACE.md },
  heroCaption: {
    textAlign: 'center',
    marginTop: SPACE.xl,
    paddingHorizontal: SPACE.lg,
    maxWidth: 320,
  },

  // Tight internal gap — the CTA and its metrics are one object.
  cluster: { gap: SPACE.sm, marginBottom: SPACE.h2 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.xl,
    paddingVertical: SPACE.lg,
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

  metrics: { flexDirection: 'row', gap: SPACE.sm },

  sectionLabel: { marginBottom: SPACE.md },
  tendCard: { marginBottom: SPACE.sm },

  insightHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  insightIcon: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },

  actions: { flexDirection: 'row', gap: SPACE.sm },
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
