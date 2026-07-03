import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
} from 'react-native-reanimated';
import { subYears } from 'date-fns';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, ONBOARDING_STEPS } from '../constants';
import { useAppStore } from '../store/appStore';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import DateField from '../components/DateField';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';
import { validateCycleInfo } from '../utils/cycleCalculations';

const STEP_ART = ['🌸', '👤', '🔄', '🩸', '🔒', '🚀'];

const OnboardingScreen = () => {
  const { setUser, setShowOnboarding } = useAppStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [lastPeriodStart, setLastPeriodStart] = useState<Date | null>(null);
  const [cycleLength, setCycleLength] = useState('28');
  const [periodLength, setPeriodLength] = useState('5');

  const today = new Date();

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

  const handleNext = () => {
    const error = validateStep(step);
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('Please check', error);
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
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

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const renderStepBody = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.body}>
              Your AI-powered period companion — cycle tracking, wellness
              insights, and beautifully calm design.
            </Text>
          </>
        );
      case 1:
        return (
          <>
            <Text style={styles.title}>About you</Text>
            <TextInput
              placeholder="Your name"
              placeholderTextColor={COLORS.textTertiary}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <DateField
              label="Date of birth"
              value={dateOfBirth}
              onChange={setDateOfBirth}
              placeholder="Select your date of birth"
              maximumDate={today}
              minimumDate={subYears(today, 100)}
            />
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.title}>Your cycle</Text>
            <Text style={styles.fieldLabel}>Average cycle length</Text>
            <TextInput
              placeholder="e.g. 28"
              placeholderTextColor={COLORS.textTertiary}
              value={cycleLength}
              onChangeText={setCycleLength}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>Period length</Text>
            <TextInput
              placeholder="e.g. 5"
              placeholderTextColor={COLORS.textTertiary}
              value={periodLength}
              onChangeText={setPeriodLength}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.hint}>
              Typical cycles run 21–35 days with a 2–7 day period. You can change
              this anytime.
            </Text>
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.title}>Your last period</Text>
            <Text style={styles.body}>
              When did your most recent period start? This anchors all your
              predictions.
            </Text>
            <DateField
              label="First day of last period"
              value={lastPeriodStart}
              onChange={setLastPeriodStart}
              placeholder="Select the start date"
              maximumDate={today}
              minimumDate={subYears(today, 1)}
            />
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.title}>Your privacy</Text>
            <Text style={styles.body}>
              {'✔  Your data stays on your device\n✔  Biometric lock available\n✔  You are always in control'}
            </Text>
          </>
        );
      default:
        return (
          <>
            <Text style={styles.title}>All set</Text>
            <Text style={styles.body}>
              {"Let's start tracking your cycle with clarity and calm."}
            </Text>
          </>
        );
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Progress dots */}
        <View style={styles.progressRow}>
          {ONBOARDING_STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step && styles.dotActive,
                i < step && styles.dotDone,
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero emoji */}
          <Animated.View key={`art-${step}`} entering={FadeIn.duration(400)} style={styles.artWrap}>
            <Text style={styles.art}>{STEP_ART[step]}</Text>
          </Animated.View>

          {/* Glass content card */}
          <Animated.View key={`card-${step}`} entering={FadeInRight.duration(350)}>
            <GlassCard style={styles.card}>{renderStepBody()}</GlassCard>
          </Animated.View>
        </ScrollView>

        {/* Buttons */}
        <Animated.View entering={FadeInDown} style={styles.buttonRow}>
          {step > 0 && (
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={handleBack}>
              <Text style={styles.btnGhostText}>Back</Text>
            </Pressable>
          )}
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleNext}>
            <Text style={styles.btnPrimaryText}>
              {step === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.lg },
  progressRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  dotActive: { width: 26, backgroundColor: COLORS.primary },
  dotDone: { backgroundColor: COLORS.primaryLight },

  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: SPACING.xl },
  artWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  art: { fontSize: 72 },

  card: { padding: SPACING.xl },
  title: { ...TYPOGRAPHY.h1, color: COLORS.text, marginBottom: SPACING.md },
  body: { ...TYPOGRAPHY.body1, color: COLORS.textSecondary, lineHeight: 26 },
  fieldLabel: { ...TYPOGRAPHY.body2, color: COLORS.text, fontWeight: '600', marginBottom: SPACING.xs },
  input: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    ...TYPOGRAPHY.body1,
    color: COLORS.text,
  },
  hint: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: SPACING.md, lineHeight: 18 },

  buttonRow: { flexDirection: 'row', gap: SPACING.md, paddingVertical: SPACING.lg },
  btn: {
    flex: 1,
    height: 54,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  btnPrimaryText: { ...TYPOGRAPHY.button, color: COLORS.white, fontSize: 16 },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  btnGhostText: { ...TYPOGRAPHY.button, color: COLORS.text, fontSize: 16 },
});

export default OnboardingScreen;
