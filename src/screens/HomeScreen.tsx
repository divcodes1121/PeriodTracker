import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { format, isSameDay } from 'date-fns';
import Text from '../components/Text';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Reveal from '../components/Reveal';
import Icon, { IconName } from '../components/Icon';
import BloomRing from '../components/BloomRing';
import TodaysGarden from '../components/TodaysGarden';
import PhaseMark from '../components/PhaseMark';
import MetricCard from '../components/MetricCard';
import ThemeToggle from '../components/ThemeToggle';
import { LoadingState } from '../components/States';
import { useScrollY } from '../components/ScrollContext';
import { BLOOM, BloomHue, COLORS, CYCLE_PHASES, GRADIENT } from '../constants';
import { SPACE, RADIUS, MIN_TAP_COMFORT, MOTION } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { useAtmosphere } from '../theme/useAtmosphere';
import { greetingFor } from '../theme/atmosphere';
import { useAppStore } from '../store/appStore';
import { countGardenLogs } from '../utils/garden';
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
 * ═══════════════════════════════════════════════════════════════════════════
 * HOME — the signature screen.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── The composition rule ──────────────────────────────────────────────────
 *
 * **Proximity carries grouping.** Related things sit `SPACE.sm` apart and read
 * as one object; unrelated clusters sit `SPACE.h2` apart. This page used to be
 * ten full-width blocks at a uniform `SPACE.lg`, which is *why* it read as
 * disconnected: ten equally-spaced identical cards produce a list with no
 * structure, and no amount of card decoration fixes a spacing problem.
 *
 * ── Four movements, in descending importance ──────────────────────────────
 *
 *   1. **The Bloom Ring.** Floats directly on the live canvas, in no card at
 *      all. That is what makes it read as hero — wrapping it in the same
 *      Surface as everything else was flattening it.
 *   2. **Act.** The log CTA welded to the two numbers it changes, because
 *      logging is what makes those numbers real.
 *   3. **Today.** Insight, reset, quick check-ins. `quiet` variants, so they
 *      recede into the atmosphere rather than competing with the hero.
 *   4. **The garden.** Last, at the bottom, unhurried. It is the reward for
 *      everything above it and it should feel like arriving somewhere rather
 *      than being scored.
 *
 * ── One deliberate omission ───────────────────────────────────────────────
 *
 * There is no streak, no completion percentage and no "you haven't logged in 3
 * days" anywhere on this page. A health app that nags is a health app people
 * delete in the week they most need it. The garden carries the entire
 * returning-user incentive, and it only ever grows.
 */

interface QuickAction {
  label: string;
  icon: IconName;
  hue: BloomHue;
  route: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Mood', icon: 'heart', hue: 'blossom', route: 'MoodTracker' },
  { label: 'Symptoms', icon: 'petal', hue: 'lavender', route: 'SymptomLogger' },
  { label: 'Insights', icon: 'sparkles', hue: 'gold', route: 'AIInsights' },
];

/**
 * The primary CTA.
 *
 * Logging a period is what makes every prediction on this screen real, so it
 * gets a filled gradient card rather than a slot in the quick-action grid. The
 * gradient is the ink ramp, not the pastel one — white labels have to clear AA
 * across the whole sweep, not just at the light end.
 */
function LogPeriodCTA({ onPress }: { onPress: () => void }) {
  const press = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.018 }],
  }));

  // The decorative blooms drift apart very slightly under the press, so the
  // card feels like it has something alive inside rather than being a painted
  // rectangle that changes size.
  const bloom = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + press.value * 0.09 }],
    opacity: 1 - press.value * 0.18,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log period"
      accessibilityHint="Opens the period logger"
      onPressIn={() => {
        press.value = withSpring(1, MOTION.springSnap);
        Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => {
        press.value = withSpring(0, MOTION.spring);
      }}
      onPress={onPress}
    >
      <Animated.View style={[styles.cta, style]}>
        <LinearGradient
          colors={GRADIENT.bloomInk as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[styles.ctaBloom, { top: -50, right: -34, width: 140, height: 140 }, bloom]}
        />
        <Animated.View
          style={[
            styles.ctaBloom,
            { bottom: -62, right: 70, width: 104, height: 104, opacity: 0.55 },
            bloom,
          ]}
        />
        <View style={styles.ctaIcon}>
          <Icon name="drop" size={21} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline" color="#FFFFFF">
            Log period
          </Text>
          <Text variant="caption" color="rgba(255,255,255,0.82)" style={{ marginTop: 1 }}>
            Predictions sharpen with every log
          </Text>
        </View>
        <Icon name="chevronRight" size={18} color="rgba(255,255,255,0.85)" />
      </Animated.View>
    </Pressable>
  );
}

/**
 * The hero wrapper.
 *
 * As the page scrolls the ring drifts up at half speed and softens, so the
 * content below feels like it is *rising over* the ring rather than the whole
 * page sliding as one sheet. One animated node, worklet-driven.
 */
function Hero({ children }: { children: React.ReactNode }) {
  const scrollY = useScrollY();

  const style = useAnimatedStyle(() => {
    if (!scrollY) return {};
    return {
      opacity: interpolate(scrollY.value, [0, 280], [1, 0.5], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(scrollY.value, [0, 320], [0, -52], Extrapolation.CLAMP) },
        { scale: interpolate(scrollY.value, [0, 320], [1, 0.93], Extrapolation.CLAMP) },
      ],
    };
  });

  return <Animated.View style={[styles.hero, style]}>{children}</Animated.View>;
}

const HomeScreen = ({ navigation }: any) => {
  const { user, periodEntries, symptomLogs, moodEntries, resetSessions } = useAppStore();
  const { colors: c, isDark } = useTheme();
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

  /**
   * Garden size. Counted by *day*, not by entry — six symptoms on one bad day
   * must not grow six flowers while a quiet day grows none. See
   * `countGardenLogs`.
   */
  const gardenLogs = useMemo(() => {
    const uniqueDays = (dates: Date[]) => {
      const seen: Date[] = [];
      for (const d of dates) {
        if (!seen.some((s) => isSameDay(s, d))) seen.push(d);
      }
      return seen.length;
    };
    return countGardenLogs({
      periodDays: uniqueDays(periodEntries.map((e) => e.startDate)),
      symptomDays: uniqueDays(symptomLogs.map((l) => l.date)),
      moodDays: uniqueDays(moodEntries.map((m) => m.timestamp)),
      resetSessions: resetSessions.length,
    });
  }, [periodEntries, symptomLogs, moodEntries, resetSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  if (!user || !cycle) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Opening your garden" />
      </Screen>
    );
  }

  const raw = cycle.phase?.name ?? 'menstrual';
  const phaseName = raw.charAt(0).toUpperCase() + raw.slice(1);
  const season = CYCLE_PHASES[raw as keyof typeof CYCLE_PHASES]?.season ?? '';
  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primaryDeep}
        />
      }
    >
      {/* ── Greeting ───────────────────────────────────────────────────────
          Deliberately quiet. It used to be title1, competing with the phase
          name below it for the same job; the hero owns the headline now. */}
      <Reveal index={0}>
        <View style={styles.greetRow}>
          <View style={{ flex: 1 }}>
            <Text variant="overline" tone="secondary">
              {format(new Date(), 'EEEE, d MMMM')}
            </Text>
            <Text variant="title3" style={{ marginTop: 3 }}>
              {greetingFor(atmos.band)}, {firstName}
            </Text>
          </View>
          <ThemeToggle />
        </View>
      </Reveal>

      {/* ── 1. The Bloom Ring. No card. ──────────────────────────────────── */}
      <Reveal index={1}>
        <Hero>
          <BloomRing
            dayOfCycle={cycle.dayOfCycle}
            cycleLength={cycle.cycleLength}
            periodLength={cycle.periodLength}
            phaseName={phaseName}
            glow={atmos.glow}
            lightAngle={atmos.lightAngle}
            size={306}
          >
            <Text variant="overline" tone="secondary">
              Day {cycle.dayOfCycle}
            </Text>
            <Text variant="title2" style={styles.phaseTitle}>
              {phaseName}
            </Text>
            {/* Shape, not a coloured dot — phase identity has to survive
                colour blindness. See PhaseMark. */}
            <PhaseMark phase={raw} size={17} style={{ marginTop: SPACE.xs }} />
          </BloomRing>

          <Text variant="callout" tone="secondary" style={styles.heroCaption}>
            {season}. {cycle.phase?.description}
          </Text>
        </Hero>
      </Reveal>

      {/* ── 2. Act: the CTA welded to the numbers it changes ──────────────── */}
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
                accent={BLOOM.rose.pastel}
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
                accent={BLOOM.sage.pastel}
                onPress={() => navigation.navigate('Calendar')}
              />
            </View>
          </View>
        </View>
      </Reveal>

      {/* ── 3. Today: quiet surfaces that sit in the atmosphere ───────────── */}
      <Text variant="overline" tone="secondary" style={styles.sectionLabel}>
        Today
      </Text>

      <Reveal index={3}>
        <Surface
          variant="quiet"
          lift
          tint={BLOOM.gold.pastel}
          onPress={() => navigation.navigate('AIInsights')}
          accessibilityLabel="Today's insight"
          accessibilityHint="Opens insights"
          style={styles.tendCard}
        >
          <View style={styles.insightHead}>
            <View style={[styles.tinyIcon, { backgroundColor: `${BLOOM.gold.pastel}2E` }]}>
              <Icon name="sparkles" size={15} color={BLOOM.gold.ink} />
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
          tint={BLOOM.lavender.pastel}
          onPress={() => navigation.navigate('Reset')}
          accessibilityLabel="Take a reset"
          accessibilityHint="Opens the Self-Care scenes"
          style={styles.tendCard}
        >
          <View style={styles.resetRow}>
            <View style={[styles.actionIcon, { backgroundColor: `${BLOOM.lavender.pastel}2E` }]}>
              <Icon name="wind" size={19} color={BLOOM.lavender.ink} />
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
          {QUICK_ACTIONS.map((a) => {
            const tone = BLOOM[a.hue];
            return (
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
                    style={[
                      styles.actionIcon,
                      { backgroundColor: isDark ? c.fill : `${tone.pastel}33` },
                    ]}
                  >
                    <Icon name={a.icon} size={19} color={isDark ? tone.pastel : tone.ink} />
                  </View>
                  <Text variant="subhead">{a.label}</Text>
                </View>
              </Surface>
            );
          })}
        </View>
      </Reveal>

      {/* ── 4. The garden. Last, unhurried, no score. ─────────────────────── */}
      <Reveal index={6}>
        <View style={styles.gardenBlock}>
          <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.md }}>
            Your garden
          </Text>
          <TodaysGarden logs={gardenLogs} />
        </View>
      </Reveal>
    </Screen>
  );
};

/**
 * Phase-appropriate one-liner. Supportive, never prescriptive — no "should",
 * no diagnosis, no instruction. It is a friend who happens to know biology.
 */
function insightFor(phase: string): string {
  switch (phase) {
    case 'menstrual':
      return 'Energy is naturally lower today. Gentle movement and warmth tend to help more than pushing through.';
    case 'follicular':
      return 'Oestrogen is rising and energy usually follows. A good day to start something you have been putting off.';
    case 'ovulation':
      return 'You may feel at your most social and clear-headed today. Worth scheduling the harder conversations.';
    default:
      return 'Energy may dip in the days ahead. Consider a lighter workout and an earlier night.';
  }
}

const styles = StyleSheet.create({
  greetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACE.h1,
    marginBottom: SPACE.lg,
  },

  hero: { alignItems: 'center', marginBottom: SPACE.h2 },
  phaseTitle: { marginTop: 2 },
  heroCaption: {
    textAlign: 'center',
    marginTop: SPACE.xl,
    paddingHorizontal: SPACE.lg,
    maxWidth: 330,
  },

  // Tight internal gap — the CTA and its metrics are one object.
  cluster: { gap: SPACE.sm, marginBottom: SPACE.h2 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.xl,
    paddingVertical: SPACE.lg,
    overflow: 'hidden',
    minHeight: MIN_TAP_COMFORT + 20,
  },
  ctaBloom: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  ctaIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  metrics: { flexDirection: 'row', gap: SPACE.sm },

  sectionLabel: { marginBottom: SPACE.md },
  tendCard: { marginBottom: SPACE.sm },

  insightHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  tinyIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resetRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },

  actions: { flexDirection: 'row', gap: SPACE.sm },
  action: { flex: 1 },
  actionInner: {
    minHeight: MIN_TAP_COMFORT + 38,
    paddingVertical: SPACE.lg,
    paddingHorizontal: SPACE.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gardenBlock: { marginTop: SPACE.h2 },
});

export default HomeScreen;
