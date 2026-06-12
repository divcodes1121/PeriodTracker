import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, GRADIENT, ONBOARDING_STEPS } from '../constants';
import { useAppStore } from '../store/appStore';
import Button from '../components/Button';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';

const OnboardingScreen = ({ navigation }: any) => {
  const { setUser, setShowOnboarding } = useAppStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [cycleLength, setCycleLength] = useState('28');
  const [periodLength, setPeriodLength] = useState('5');

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = () => {
    if (!name || !dateOfBirth) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newUser: User = {
      id: uuidv4(),
      email: '',
      name,
      dateOfBirth: new Date(dateOfBirth),
      cycleLength: parseInt(cycleLength),
      periodLength: parseInt(periodLength),
      averageCycleLength: parseInt(cycleLength),
      lastPeriodStart: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      privacySettings: {
        biometricLock: false,
        pinLock: null,
        allowPartnerMode: false,
        dataEncrypted: true,
      },
      preferences: {
        theme: 'light',
        notifications: true,
        aiInsights: true,
        language: 'en',
      },
    };

    setUser(newUser);
    setShowOnboarding(false);
    navigation.replace('Home');
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0: // Welcome
        return (
          <View style={styles.stepContent}>
            <Text style={TYPOGRAPHY.h1}>Welcome! 👋</Text>
            <Text style={[TYPOGRAPHY.body1, styles.stepText]}>
              Your AI-powered period tracker designed for your wellbeing
            </Text>
          </View>
        );
      case 1: // Health Info
        return (
          <View style={styles.stepContent}>
            <Text style={TYPOGRAPHY.h2}>Basic Info</Text>
            <TextInput
              placeholder="Your Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              placeholder="Date of Birth (YYYY-MM-DD)"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              style={styles.input}
            />
          </View>
        );
      case 2: // Cycle Details
        return (
          <View style={styles.stepContent}>
            <Text style={TYPOGRAPHY.h2}>Your Cycle</Text>
            <View style={styles.inputGroup}>
              <Text style={TYPOGRAPHY.body1}>Average Cycle Length</Text>
              <TextInput
                placeholder="Days (e.g., 28)"
                value={cycleLength}
                onChangeText={setCycleLength}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={TYPOGRAPHY.body1}>Period Length</Text>
              <TextInput
                placeholder="Days (e.g., 5)"
                value={periodLength}
                onChangeText={setPeriodLength}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>
        );
      case 3: // Preferences
        return (
          <View style={styles.stepContent}>
            <Text style={TYPOGRAPHY.h2}>Preferences</Text>
            <Text style={[TYPOGRAPHY.body1, styles.stepText]}>
              ✅ Notifications enabled
              {'\n'}✅ AI Insights enabled
              {'\n'}✅ Privacy protection enabled
            </Text>
          </View>
        );
      case 4: // Privacy
        return (
          <View style={styles.stepContent}>
            <Text style={TYPOGRAPHY.h2}>Your Privacy Matters</Text>
            <Text style={[TYPOGRAPHY.body1, styles.stepText]}>
              ✔️ End-to-end encrypted{'\n'}
              ✔️ Biometric security available{'\n'}
              ✔️ Your data, your control
            </Text>
          </View>
        );
      default: // Ready
        return (
          <View style={styles.stepContent}>
            <Text style={TYPOGRAPHY.h1}>Ready? 🚀</Text>
            <Text style={[TYPOGRAPHY.body1, styles.stepText]}>
              {"Let's get started with tracking your cycle!"}
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={GRADIENT.primary as any} style={styles.background}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Progress */}
          <View style={styles.progressContainer}>
            <Text style={[TYPOGRAPHY.caption, { color: COLORS.white }]}>
              Step {step + 1} of {ONBOARDING_STEPS.length}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((step + 1) / ONBOARDING_STEPS.length) * 100}%` },
                ]}
              />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>{renderStep()}</View>
        </ScrollView>

        {/* Navigation */}
        <View style={styles.buttonContainer}>
          {step > 0 && (
            <Button
              title="Back"
              onPress={handleBack}
              variant="outline"
              style={styles.button}
            />
          )}
          <Button
            title={step === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
            variant="primary"
            style={styles.button}
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  progressContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    marginVertical: SPACING.xl,
  },
  stepText: {
    marginTop: SPACING.lg,
    color: COLORS.white,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  inputGroup: {
    marginTop: SPACING.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  button: {
    flex: 1,
  },
});

export default OnboardingScreen;
