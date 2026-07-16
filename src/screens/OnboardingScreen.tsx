import { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { subYears } from 'date-fns';
import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Text from '../components/Text';
import Button from '../components/Button';
import TextField from '../components/TextField';
import DateField from '../components/DateField';
import Icon from '../components/Icon';
import OnboardingArt, { ArtName } from '../components/OnboardingArt';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/appStore';
import { User } from '../types';
import { validateCycleInfo } from '../utils/cycleCalculations';
import { ONBOARDING_STEPS, COLORS } from '../constants';
import { SPACE, MOTION, MIN_TAP } from '../theme/tokens';
import { CONTENT_MAX_WIDTH } from '../utils/responsive';

/** Copy per step. Minimal words; the illustration carries the feeling. */
const PAGES: { art: ArtName; title: string; body: string }[] = [
  {
    art: 'cycle',
    title: 'Understand your cycle',
    body: 'Meaningful insights from your own body, not from averages.',
  },
  {
    art: 'profile',
    title: 'A little about you',
    body: 'Only what is needed to make predictions accurate.',
  },
  {
    art: 'rhythm',
    title: 'Your rhythm',
    body: 'Every cycle is different. Tell us roughly what yours looks like.',
  },
  {
    art: 'moment',
    title: 'Where you are now',
    body: 'When did your last period start? This anchors everything else.',
  },
  {
    art: 'privacy',
    title: 'Privacy first',
    body: 'Your health data stays on this device. Nothing is uploaded, ever.',
  },
  {
    art: 'ready',
    title: 'You are all set',
    body: 'Log your first period whenever you are ready, and the picture sharpens from there.',
  },
];

/** Animated progress dots. */
function Dots({ count, active }: { count: number; active: number }) {
  const { colors: c } = useTheme();
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} on={i === active} done={i < active} dim={c.fill} />
      ))}
    </View>
  );
}

function Dot({ on, done, dim }: { on: boolean; done: boolean; dim: string }) {
  const w = useSharedValue(on ? 22 : 6);
  useEffect(() => {
    w.value = withSpring(on ? 22 : 6, MOTION.spring);
  }, [on, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: on || done ? COLORS.primary : dim, opacity: done && !on ? 0.4 : 1 },
        style,
      ]}
    />
  );
}

const OnboardingScreen = () => {
  const { setUser, setShowOnboarding } = useAppStore();
  const { colors: c } = useTheme();
  const { height } = useWindowDimensions();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [lastPeriodStart, setLastPeriodStart] = useState<Date | null>(null);
  const [cycleLength, setCycleLength] = useState('28');
  const [periodLength, setPeriodLength] = useState('5');

  const today = new Date();
  const page = PAGES[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  const validateStep = (current: number): string | null => {
    switch (current) {
      case 1:
        if (!name.trim()) return 'Please enter your name';
        if (!dateOfBirth) return 'Please select your date of birth';
        return null;
      case 2: {
        const cl = parseInt(cycleLength, 10);
        const pl = parseInt(periodLength, 10);
        if (!validateCycleInfo(cl, pl)) {
          return 'Cycle length must be 21–35 days and period length 2–7 days';
        }
        return null;
      }
      case 3:
        if (!lastPeriodStart) return 'Please select when your last period started';
        return null;
      default:
        return null;
    }
  };

  const completeOnboarding = () => {
    if (!name.trim() || !dateOfBirth || !lastPeriodStart) {
      Alert.alert('Error', 'Some required information is missing');
      return;
    }
    const cl = parseInt(cycleLength, 10);
    const pl = parseInt(periodLength, 10);
    const now = new Date();

    const newUser: User = {
      id: uuidv4(),
      email: '',
      name: name.trim(),
      dateOfBirth,
      cycleLength: cl,
      periodLength: pl,
      averageCycleLength: cl,
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
    const error = validateStep(step);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('Please check', error);
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    if (!isLast) setStep(step + 1);
    else completeOnboarding();
  };

  const handleBack = () => {
    Haptics.selectionAsync().catch(() => {});
    setStep((s) => Math.max(0, s - 1));
  };

  /** Steps 1–3 collect data; the rest are purely narrative. */
  const form = (
    <>
      {step === 1 && (
        <>
          <TextField
            label="Your name"
            value={name}
            onChangeText={setName}
            placeholder="Sophia"
            autoCapitalize="words"
            returnKeyType="next"
          />
          <DateField
            label="Date of birth"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            maximumDate={subYears(today, 10)}
            minimumDate={subYears(today, 70)}
          />
        </>
      )}

      {step === 2 && (
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Cycle length"
              value={cycleLength}
              onChangeText={setCycleLength}
              keyboardType="number-pad"
              maxLength={2}
              suffix="days"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="Period length"
              value={periodLength}
              onChangeText={setPeriodLength}
              keyboardType="number-pad"
              maxLength={1}
              suffix="days"
            />
          </View>
        </View>
      )}

      {step === 3 && (
        <DateField
          label="Last period started"
          value={lastPeriodStart}
          onChange={setLastPeriodStart}
          maximumDate={today}
          minimumDate={subYears(today, 1)}
        />
      )}
    </>
  );

  const compact = height < 700;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.column}>
            {/* Back / skip row */}
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
              entering={FadeIn.duration(MOTION.base)}
              exiting={FadeOut.duration(MOTION.instant)}
              style={styles.page}
            >
              <View style={styles.art}>
                <OnboardingArt name={page.art} size={compact ? 180 : 232} />
              </View>

              <Text variant="title1" style={styles.title}>
                {page.title}
              </Text>
              <Text variant="body" tone="secondary" style={styles.body}>
                {page.body}
              </Text>

              <View style={styles.form}>{form}</View>
            </Animated.View>
          </View>
        </ScrollView>

        {/* Footer action */}
        <View style={styles.footer}>
          <View style={styles.column}>
            <Button label={isLast ? 'Start tracking' : 'Continue'} onPress={handleNext} />
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

  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },

  page: { paddingTop: SPACE.h2, paddingBottom: SPACE.xxl },
  art: { alignItems: 'center', marginBottom: SPACE.h2 },
  title: { textAlign: 'center' },
  body: {
    textAlign: 'center',
    marginTop: SPACE.md,
    paddingHorizontal: SPACE.lg,
  },
  form: { marginTop: SPACE.h1 },
  pair: { flexDirection: 'row', gap: SPACE.lg },

  footer: { alignItems: 'center', paddingBottom: SPACE.lg, paddingTop: SPACE.sm },
});

export default OnboardingScreen;
