import { memo, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { subYears } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import Text from '../components/Text';
import Button from '../components/Button';
import TextField from '../components/TextField';
import DateField from '../components/DateField';
import Icon, { IconName } from '../components/Icon';
import Surface from '../components/Surface';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Illustration, { IllustrationName } from '../components/Illustration';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/appStore';
import { User } from '../types';
import { validateCycleInfo } from '../utils/cycleCalculations';
import { ONBOARDING_STEPS, COLORS, BLOOM, TAGLINE } from '../constants';
import { SPACE, MOTION, MIN_TAP, RADIUS, TABULAR } from '../theme/tokens';
import { CONTENT_MAX_WIDTH } from '../utils/responsive';

/**
 * The six pages.
 *
 * ── Voice ─────────────────────────────────────────────────────────────────
 *
 * Onboarding is where an app tells you what it thinks of you. Bloomly's rule
 * for these six screens: **every page either explains a benefit or asks for
 * exactly one thing, and it never does both.**
 *
 * Two consequences worth keeping:
 *
 *   • The data-collection pages say *why* before they ask. "This anchors
 *     everything else" earns the date field; a bare label does not.
 *   • The privacy page makes a concrete promise ("no account, no upload"),
 *     not a reassuring adjective. Anyone can write "we take privacy
 *     seriously"; only a local-only app can say nothing leaves the device.
 *
 * Illustration carries the feeling so the copy can stay short.
 */
const PAGES: { art: IllustrationName; title: string; body: string }[] = [
  {
    art: 'bloom',
    title: 'Welcome to Bloomly',
    body: TAGLINE,
  },
  {
    art: 'calendar',
    title: 'Track your cycle',
    body: 'Your predictions come from your own logs, not from an average of strangers.',
  },
  {
    art: 'sunrise',
    title: 'Understand your body',
    body: 'Four phases, each with its own energy. Bloomly shows you where you are in yours.',
  },
  {
    art: 'butterfly',
    title: 'Moods and symptoms',
    body: 'Log a feeling in one tap. Patterns you would never spot alone start to show up.',
  },
  {
    art: 'shield',
    title: 'Private by design',
    body: 'Everything stays on this device. No account, no upload, no ads, no trackers.',
  },
  {
    art: 'teacup',
    title: 'A moment for you',
    body: 'Seven calm scenes for when a day gets heavy. No scores, no streaks, no timer judging you.',
  },
];

/* ------------------------------ Living backdrop --------------------------- */

/** A soft orb of brand color drifting slowly behind the content. */
const Orb = memo(function Orb({
  color,
  size,
  x,
  y,
  dx,
  dy,
  dur,
}: {
  color: string;
  size: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  dur: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [t, dur]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * dx }, { translateY: t.value * dy }, { scale: 1 + t.value * 0.08 }],
  }));
  /**
   * A radial gradient, not a flat circle with a border radius.
   *
   * This was a solid `backgroundColor` disc. An even fill has a hard edge no
   * matter how low its alpha, so at full-screen scale it read as a giant pink
   * *plate* laid over the page rather than as light in the room — the same
   * mistake the Bloom Ring's halo made, caught the same way (by looking at a
   * screenshot). A gradient that falls to zero opacity has no edge to see.
   */
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: x, top: y, width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`onb-orb-${x}-${y}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.55" stopColor={color} stopOpacity={0.45} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#onb-orb-${x}-${y})`} />
      </Svg>
    </Animated.View>
  );
});

/** A petal drifting down the page forever — welcome & ready pages only. */
const Petal = memo(function Petal({ w, h, seed }: { w: number; h: number; seed: number }) {
  const y = useSharedValue(-30);
  const x = useSharedValue(0);
  const rot = useSharedValue(seed * 360);
  useEffect(() => {
    y.value = withDelay(
      seed * 5000,
      withRepeat(
        withSequence(
          withTiming(h + 40, { duration: 13000 + seed * 8000, easing: Easing.linear }),
          withTiming(-30, { duration: 0 })
        ),
        -1
      )
    );
    x.value = withRepeat(
      withSequence(
        withTiming(14 + seed * 20, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(-(14 + seed * 20), { duration: 2600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    rot.value = withRepeat(
      withSequence(withTiming(seed * 360 + 60, { duration: 3400 }), withTiming(seed * 360 - 60, { duration: 3400 })),
      -1,
      true
    );
  }, [y, x, rot, h, seed]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: x.value }, { rotate: `${rot.value}deg` }],
  }));
  const size = 7 + seed * 5;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 16 + seed * (w - 40), top: 0 }, style]}>
      <View
        style={{
          width: size,
          height: size * 1.5,
          borderRadius: size,
          backgroundColor: seed > 0.6 ? 'rgba(184,154,216,0.35)' : 'rgba(217,124,155,0.35)',
        }}
      />
    </Animated.View>
  );
});

/* ------------------------------- Number dial ------------------------------ */

/**
 * Tactile number input: big tabular value, − / + round buttons with a spring
 * press and a haptic per step, and a range track that fills as the value moves.
 * Replaces the numeric keyboard for cycle & period length — nobody should have
 * to type "28".
 */
function NumberDial({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const { colors: c } = useTheme();
  const fillPct = useSharedValue((value - min) / (max - min));
  const pop = useSharedValue(0);

  useEffect(() => {
    fillPct.value = withSpring((value - min) / (max - min), MOTION.springSoft);
  }, [value, min, max, fillPct]);

  const bump = (dir: 1 | -1) => {
    const next = Math.min(max, Math.max(min, value + dir));
    if (next === value) return;
    Haptics.selectionAsync().catch(() => {});
    pop.value = withSequence(withSpring(1, MOTION.springSnap), withSpring(0, MOTION.spring));
    onChange(next);
  };

  const trackStyle = useAnimatedStyle(() => ({ width: `${fillPct.value * 100}%` }));
  const valueStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.value * 0.05 }] }));

  return (
    <View style={styles.dial}>
      <Text variant="overline" tone="secondary">
        {label}
      </Text>
      <View style={styles.dialRow}>
        <DialButton icon="minus" label={`Decrease ${label}`} disabled={value <= min} onPress={() => bump(-1)} />
        <Animated.View style={[styles.dialValue, valueStyle]}>
          <Text variant="display" tabular style={TABULAR}>
            {value}
          </Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: -2 }}>
            {unit}
          </Text>
        </Animated.View>
        <DialButton icon="plus" label={`Increase ${label}`} disabled={value >= max} onPress={() => bump(1)} />
      </View>
      <View style={[styles.dialTrack, { backgroundColor: c.trackNeutral }]}>
        <Animated.View style={[styles.dialFill, { backgroundColor: COLORS.primary }, trackStyle]} />
      </View>
      <View style={styles.dialBounds}>
        <Text variant="caption" tone="tertiary" tabular>
          {min}
        </Text>
        <Text variant="caption" tone="tertiary" tabular>
          {max}
        </Text>
      </View>
    </View>
  );
}

function DialButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors: c, isDark } = useTheme();
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.08 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => (press.value = withSpring(1, MOTION.springSnap))}
      onPressOut={() => (press.value = withSpring(0, MOTION.spring))}
      onPress={onPress}
      hitSlop={6}
    >
      <Animated.View
        style={[
          styles.dialBtn,
          { backgroundColor: isDark ? 'rgba(217,124,155,0.16)' : COLORS.primarySoft, opacity: disabled ? 0.35 : 1 },
          style,
        ]}
      >
        <Icon name={icon} size={18} color={isDark ? COLORS.primary : COLORS.primaryDark} />
      </Animated.View>
    </Pressable>
  );
}

/* ------------------------------ Progress dots ----------------------------- */

/**
 * Progress, as a row of petals.
 *
 * ── A design decision that got reversed, and why ──────────────────────────
 *
 * The first version of this was a *rosette*: six petals arranged in a ring
 * that filled as you advanced, so by the final page the indicator became the
 * Bloomly mark. It read beautifully in description and failed on the device.
 *
 * Two reasons, both instructive:
 *
 *   1. **Progress is inherently linear and a ring is not.** "Step 2 of 6" is a
 *      position along a path. A ring has no start, so the eye cannot tell 2/6
 *      from 5/6 without counting — which is exactly the work a progress
 *      indicator exists to remove.
 *   2. At the ~50px a header allows, six petals around a hub is *smaller than
 *      the smallest legible flower*. It landed as a stray asterisk near the
 *      top of the page, which is worse than no indicator at all.
 *
 * So: a row. Left to right, filled behind you, folded ahead — the same
 * vocabulary as the Bloom Ring, in the one geometry that suits the job.
 * Brand should lose to legibility every time it is a real contest, and this
 * was one.
 */
function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View
      style={styles.dots}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: active + 1 }}
      accessibilityLabel={`Step ${active + 1} of ${count}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProgressPetal key={i} on={i === active} done={i < active} />
      ))}
    </View>
  );
}

function ProgressPetal({ on, done }: { on: boolean; done: boolean }) {
  const open = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    open.value = withSpring(on ? 1 : 0, MOTION.springBloom);
  }, [on, open]);

  // The current step's petal stands taller and fuller; completed ones stay
  // coloured but small; upcoming ones are pale slivers.
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.62 + open.value * 0.38 }, { scaleX: 0.7 + open.value * 0.3 }],
    opacity: done ? 0.75 : 0.3 + open.value * 0.7,
  }));

  return (
    <Animated.View
      style={[
        styles.progressPetal,
        { backgroundColor: on || done ? COLORS.primaryDeep : BLOOM.rose.pastel },
        style,
      ]}
    />
  );
}

/* --------------------------------- Screen --------------------------------- */

const OnboardingScreen = () => {
  const { setUser, setShowOnboarding } = useAppStore();
  const { colors: c, isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [lastPeriodStart, setLastPeriodStart] = useState<Date | null>(null);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);

  const shake = useSharedValue(0);

  const today = new Date();
  const page = PAGES[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;
  const petalStep = step === 0 || isLast;

  const validateStep = (current: number): string | null => {
    switch (current) {
      case 1:
        if (!name.trim()) return 'Please tell us your name';
        if (!dateOfBirth) return 'Please select your date of birth';
        return null;
      case 2:
        if (!validateCycleInfo(cycleLength, periodLength)) {
          return 'Cycle length must be 21–35 days and period length 2–7 days';
        }
        return null;
      case 3:
        if (!lastPeriodStart) return 'Please select when your last period started';
        return null;
      default:
        return null;
    }
  };

  const fail = (message: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setError(message);
    shake.value = withSequence(
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 70 }),
      withTiming(-3, { duration: 60 }),
      withTiming(0, { duration: 80 })
    );
  };

  const completeOnboarding = () => {
    if (!name.trim() || !dateOfBirth || !lastPeriodStart) {
      fail('Some required information is missing');
      return;
    }
    const now = new Date();
    const newUser: User = {
      id: uuidv4(),
      email: '',
      name: name.trim(),
      dateOfBirth,
      cycleLength,
      periodLength,
      averageCycleLength: cycleLength,
      lastPeriodStart,
      createdAt: now,
      updatedAt: now,
      privacySettings: {
        biometricLock: false,
        pinLock: null,
        allowPartnerMode: false,
        dataEncrypted: true,
      },
      preferences: { theme: 'light', notifications: true, aiInsights: true, language: 'en' },
    };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setUser(newUser);
    setShowOnboarding(false);
  };

  const handleNext = () => {
    const problem = validateStep(step);
    if (problem) {
      fail(problem);
      return;
    }
    setError(null);
    Haptics.selectionAsync().catch(() => {});
    if (!isLast) {
      setDir('fwd');
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    Haptics.selectionAsync().catch(() => {});
    setError(null);
    setDir('back');
    setStep((s) => Math.max(0, s - 1));
  };

  const clearError = () => setError(null);

  /** Steps 1–3 collect data; the rest are narrative. */
  const form = (
    <>
      {step === 1 && (
        <>
          <TextField
            label="Your name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              clearError();
            }}
            placeholder="Sophia"
            autoCapitalize="words"
            returnKeyType="next"
          />
          <DateField
            label="Date of birth"
            value={dateOfBirth}
            onChange={(d) => {
              setDateOfBirth(d);
              clearError();
            }}
            variant="wheel"
            maximumDate={subYears(today, 10)}
            minimumDate={subYears(today, 70)}
          />
        </>
      )}

      {step === 2 && (
        <Surface style={styles.dialCard}>
          <NumberDial
            label="Cycle length"
            value={cycleLength}
            min={21}
            max={35}
            unit="days between periods"
            onChange={(v) => {
              setCycleLength(v);
              clearError();
            }}
          />
          <View style={[styles.dialDivider, { backgroundColor: c.separator }]} />
          <NumberDial
            label="Period length"
            value={periodLength}
            min={2}
            max={7}
            unit="days of bleeding"
            onChange={(v) => {
              setPeriodLength(v);
              clearError();
            }}
          />
          <Text variant="caption" tone="tertiary" style={{ textAlign: 'center', marginTop: SPACE.md }}>
            A rough guess is fine — logging refines this.
          </Text>
        </Surface>
      )}

      {step === 3 && (
        <DateField
          label="Last period started"
          value={lastPeriodStart}
          onChange={(d) => {
            setLastPeriodStart(d);
            clearError();
          }}
          maximumDate={today}
          minimumDate={subYears(today, 1)}
        />
      )}

      {step === 4 && (
        <Surface style={{ marginTop: -SPACE.md }}>
          {[
            { icon: 'lock' as IconName, text: 'Your data stays on this device — nothing is uploaded, ever' },
            { icon: 'close' as IconName, text: 'No ads, no trackers, no selling of anything' },
            { icon: 'trash' as IconName, text: 'Erase everything at any time, in one tap' },
          ].map((row, i) => (
            <View key={row.icon} style={[styles.privacyRow, i > 0 && { marginTop: SPACE.lg }]}>
              <View style={[styles.privacyIcon, { backgroundColor: isDark ? c.fill : COLORS.primarySoft }]}>
                <Icon name={row.icon} size={16} color={isDark ? COLORS.primary : COLORS.primaryDark} />
              </View>
              <Text variant="callout" tone="secondary" style={{ flex: 1 }}>
                {row.text}
              </Text>
            </View>
          ))}
        </Surface>
      )}

      {isLast && (
        <View style={styles.summary}>
          {[
            { label: name.trim().split(/\s+/)[0] || 'You', icon: 'heart' as IconName },
            { label: `${cycleLength}-day cycle`, icon: 'calendar' as IconName },
            { label: `${periodLength}-day period`, icon: 'drop' as IconName },
          ].map((chipItem) => (
            <View key={chipItem.label} style={[styles.summaryChip, { backgroundColor: isDark ? c.fill : '#FFFFFF' }]}>
              <Icon name={chipItem.icon} size={14} color={isDark ? COLORS.primary : COLORS.primaryDark} />
              <Text variant="subhead">{chipItem.label}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );

  const compact = height < 700;
  const enterAnim = dir === 'fwd' ? FadeInRight.duration(320) : FadeInLeft.duration(320);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const petalSeeds = [0.12, 0.34, 0.52, 0.68, 0.85, 0.97];

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Living backdrop: dawn gradient + drifting orbs (+ petals on the
          emotional pages). Content scrolls above it. */}
      <LinearGradient
        colors={c.auroraBackdrop as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />
      <Orb color={c.auroraOrbs[0]} size={300} x={-90} y={-60} dx={30} dy={40} dur={9000} />
      <Orb color={c.auroraOrbs[1]} size={340} x={width - 180} y={height * 0.34} dx={-36} dy={-30} dur={11000} />
      <Orb color={c.auroraOrbs[2]} size={240} x={width * 0.2} y={height * 0.78} dx={24} dy={-36} dur={13000} />
      {petalStep && petalSeeds.map((s, i) => <Petal key={i} w={width} h={height} seed={s} />)}

      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.column}>
            {/* Back / progress row */}
            <View style={styles.topRow}>
              {step > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  hitSlop={10}
                  onPress={handleBack}
                  style={[styles.backBtn, { backgroundColor: c.fill }]}
                >
                  <Icon name="chevronLeft" size={18} color={c.textSecondary} />
                </Pressable>
              ) : (
                <View style={{ width: MIN_TAP - 6 }} />
              )}
              <Dots count={ONBOARDING_STEPS.length} active={step} />
              <View style={{ width: MIN_TAP - 6 }} />
            </View>

            {/* Page */}
            <Animated.View
              key={step}
              entering={enterAnim}
              exiting={FadeOut.duration(MOTION.instant)}
              style={styles.page}
            >
              <View style={styles.art}>
                <Illustration name={page.art} size={compact ? 168 : 216} />
              </View>

              <Text variant={step === 0 ? 'display' : 'title1'} style={styles.title}>
                {page.title}
              </Text>
              <Text variant="body" tone="secondary" style={styles.body}>
                {page.body}
              </Text>

              <Animated.View style={[styles.form, shakeStyle]}>{form}</Animated.View>

              {/* Inline error — Alert is a no-op on web, and a banner is kinder anyway. */}
              {error && (
                <Animated.View
                  entering={FadeIn.duration(MOTION.fast)}
                  exiting={FadeOut.duration(MOTION.instant)}
                  style={[styles.errorRow, { backgroundColor: isDark ? 'rgba(176,74,98,0.18)' : 'rgba(176,74,98,0.1)' }]}
                >
                  <Icon name="info" size={15} color={COLORS.error} />
                  <Text variant="caption" color={COLORS.error} style={{ flex: 1 }}>
                    {error}
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
          </View>
        </ScrollView>

        {/* Footer action */}
        <View style={styles.footer}>
          <View style={styles.column}>
            <Button
              label={step === 0 ? 'Begin' : isLast ? 'Start tracking' : 'Continue'}
              iconRight={isLast ? undefined : 'arrowRight'}
              onPress={handleNext}
            />
            <Text variant="caption" tone="tertiary" style={styles.stepCount} tabular>
              {step + 1} of {ONBOARDING_STEPS.length}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, paddingHorizontal: SPACE.gutter },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACE.lg,
  },
  backBtn: {
    width: MIN_TAP - 6,
    height: MIN_TAP - 6,
    borderRadius: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // The petal rosette. Absolute children rotating about a shared centre, so
  // the progress indicator is one small flower rather than a row of marks.
  dots: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  progressPetal: { width: 8, height: 18, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },

  page: { paddingTop: SPACE.h2, paddingBottom: SPACE.xxl },
  art: { alignItems: 'center', marginBottom: SPACE.h1 },
  title: { textAlign: 'center' },
  body: {
    textAlign: 'center',
    marginTop: SPACE.md,
    paddingHorizontal: SPACE.lg,
  },
  form: { marginTop: SPACE.h1 },

  dialCard: { gap: SPACE.xs },
  dialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACE.sm,
  },
  dialValue: { alignItems: 'center', minWidth: 120 },
  dialBtn: {
    width: MIN_TAP,
    height: MIN_TAP,
    borderRadius: MIN_TAP / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dial: { paddingVertical: SPACE.xs },
  dialTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: SPACE.lg,
    overflow: 'hidden',
  },
  dialFill: { height: 4, borderRadius: 2 },
  dialBounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACE.xs,
  },
  dialDivider: { height: StyleSheet.hairlineWidth, marginVertical: SPACE.lg },

  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  privacyIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.lg,
    minHeight: MIN_TAP - 10,
    borderRadius: RADIUS.pill,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.md,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.sm,
  },

  footer: { alignItems: 'center', paddingBottom: SPACE.md, paddingTop: SPACE.sm },
  stepCount: { textAlign: 'center', marginTop: SPACE.sm },
});

export default OnboardingScreen;
