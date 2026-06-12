import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, SYMPTOMS } from '../constants';
import { useAppStore } from '../store/appStore';
import Card from '../components/Card';
import Button from '../components/Button';
import { v4 as uuidv4 } from 'uuid';
import { SymptomType, Symptom } from '../types';

const SymptomLoggerScreen = ({ navigation }: any) => {
  const { user, updatePeriodEntry, periodEntries } = useAppStore();
  const [selectedSymptoms, setSelectedSymptoms] = useState<Map<SymptomType, number>>(new Map());
  const [flowIntensity, setFlowIntensity] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [notes] = useState<string>('');

  const symptomKeys = Object.keys(SYMPTOMS) as SymptomType[];

  const toggleSymptom = (symptom: SymptomType, severity: number) => {
    const newSymptoms = new Map(selectedSymptoms);
    if (newSymptoms.has(symptom) && newSymptoms.get(symptom) === severity) {
      newSymptoms.delete(symptom);
    } else {
      newSymptoms.set(symptom, severity);
    }
    setSelectedSymptoms(newSymptoms);
  };

  const handleSave = () => {
    if (!user || selectedSymptoms.size === 0) {
      Alert.alert('Error', 'Please select at least one symptom');
      return;
    }

    // Find or create today's entry
    const today = new Date();
    const todayEntry = periodEntries.find(
      (e) =>
        e.startDate.toDateString() === today.toDateString() ||
        (e.endDate && e.endDate.toDateString() === today.toDateString())
    );

    const symptoms: Symptom[] = Array.from(selectedSymptoms.entries()).map(
      ([type, severity]) => ({
        id: uuidv4(),
        type,
        severity,
        timestamp: new Date(),
      })
    );

    if (todayEntry) {
      updatePeriodEntry(todayEntry.id, {
        symptoms: [...(todayEntry.symptoms || []), ...symptoms],
        notes,
      });
    }

    Alert.alert('Success', 'Symptoms logged!');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={TYPOGRAPHY.h2}>📊 Log Symptoms</Text>
          <Text style={[TYPOGRAPHY.body2, { color: COLORS.textSecondary }]}>
            How are you feeling today?
          </Text>
        </View>

        {/* Flow Intensity */}
        <Card style={styles.card}>
          <Text style={TYPOGRAPHY.h4}>Flow Intensity</Text>
          <View style={styles.intensityContainer}>
            {(['light', 'medium', 'heavy'] as const).map((intensity) => (
              <TouchableOpacity
                key={intensity}
                style={[
                  styles.intensityButton,
                  flowIntensity === intensity && styles.intensityButtonActive,
                ]}
                onPress={() => setFlowIntensity(intensity)}
              >
                <Text style={TYPOGRAPHY.caption}>
                  {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Symptoms Grid */}
        <Card style={styles.card}>
          <Text style={TYPOGRAPHY.h4}>Select Symptoms</Text>
          <View style={styles.symptomsGrid}>
            {symptomKeys.map((symptom) => (
              <TouchableOpacity
                key={symptom}
                style={[
                  styles.symptomButton,
                  selectedSymptoms.has(symptom) && styles.symptomButtonActive,
                ]}
                onPress={() => toggleSymptom(symptom, 3)}
              >
                <Text style={styles.symptomEmoji}>{SYMPTOMS[symptom].emoji}</Text>
                <Text style={TYPOGRAPHY.caption}>{SYMPTOMS[symptom].label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Save Button */}
        <View style={styles.buttonGroup}>
          <Button
            title="Save Symptoms"
            onPress={handleSave}
            variant="primary"
            size="large"
          />
        </View>

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
  intensityContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.divider,
    alignItems: 'center',
  },
  intensityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  symptomButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.divider,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  symptomButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  symptomEmoji: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  buttonGroup: {
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
});

export default SymptomLoggerScreen;
