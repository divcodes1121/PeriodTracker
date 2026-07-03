import { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, SYMPTOMS, FLOW_INTENSITY } from '../constants';
import { fontScale, scale } from '../utils/responsive';
import { useAppStore } from '../store/appStore';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import EmojiChip from '../components/EmojiChip';
import Ripple from '../components/Ripple';
import { v4 as uuidv4 } from 'uuid';
import { SymptomType, Symptom, SymptomLog } from '../types';

const SymptomLoggerScreen = ({ navigation }: any) => {
  const { user, upsertSymptomLog } = useAppStore();
  const [selectedSymptoms, setSelectedSymptoms] = useState<Map<SymptomType, number>>(new Map());
  const [flowIntensity, setFlowIntensity] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [notes] = useState<string>('');

  const symptomKeys = Object.keys(SYMPTOMS) as SymptomType[];

  const toggleSymptom = (symptom: SymptomType, severity: number) => {
    Haptics.selectionAsync().catch(() => {});
    const next = new Map(selectedSymptoms);
    if (next.has(symptom) && next.get(symptom) === severity) next.delete(symptom);
    else next.set(symptom, severity);
    setSelectedSymptoms(next);
  };

  const handleSave = () => {
    if (!user || selectedSymptoms.size === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('Nothing selected', 'Please select at least one symptom');
      return;
    }
    const now = new Date();
    const symptoms: Symptom[] = Array.from(selectedSymptoms.entries()).map(([type, severity]) => ({
      id: uuidv4(),
      type,
      severity,
      timestamp: now,
    }));
    const log: SymptomLog = {
      id: uuidv4(),
      userId: user.id,
      date: now,
      symptoms,
      flowIntensity,
      notes,
      createdAt: now,
      updatedAt: now,
    };
    upsertSymptomLog(log);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('Saved', 'Your symptoms have been logged!');
    navigation.goBack();
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <Text style={styles.title}>Log Symptoms</Text>
            <Text style={styles.subtitle}>How are you feeling today?</Text>
          </Animated.View>

          {/* Flow intensity */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>Flow intensity</Text>
              <View style={styles.flowRow}>
                {(['light', 'medium', 'heavy'] as const).map((intensity) => {
                  const active = flowIntensity === intensity;
                  return (
                    <Ripple
                      key={intensity}
                      borderRadius={16}
                      style={[styles.flowBtn, active && styles.flowBtnActive]}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setFlowIntensity(intensity);
                      }}
                    >
                      <View style={styles.flowInner}>
                        <Text style={styles.flowEmoji}>{FLOW_INTENSITY[intensity].emoji}</Text>
                        <Text style={[styles.flowLabel, active && styles.flowLabelActive]}>
                          {FLOW_INTENSITY[intensity].label}
                        </Text>
                      </View>
                    </Ripple>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Symptoms grid */}
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>Select symptoms</Text>
              <View style={styles.grid}>
                {symptomKeys.map((symptom) => {
                  const active = selectedSymptoms.has(symptom);
                  return (
                    <Pressable
                      key={symptom}
                      style={[styles.symptomTile, active && styles.symptomTileActive]}
                      onPress={() => toggleSymptom(symptom, 3)}
                    >
                      <EmojiChip
                        emoji={SYMPTOMS[symptom].emoji}
                        size={scale(44)}
                        colors={active ? ['#FFFFFF', '#FFD9E6'] : ['#FFFFFF', '#F1F1F4']}
                      />
                      <Text style={[styles.symptomLabel, active && styles.symptomLabelActive]}>
                        {SYMPTOMS[symptom].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>
          </Animated.View>

          {/* Save */}
          <Animated.View entering={FadeInDown.delay(260).springify()}>
            <Ripple onPress={handleSave} borderRadius={18} style={styles.saveBtn} rippleColor="rgba(255,255,255,0.4)">
              <Text style={styles.saveText}>Save Symptoms</Text>
            </Ripple>
          </Animated.View>

          <View style={{ height: scale(110) }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.lg },
  scroll: { paddingTop: SPACING.md },
  header: { marginTop: SPACING.md, marginBottom: SPACING.lg },
  title: { ...TYPOGRAPHY.h2, fontSize: fontScale(28), color: COLORS.text },
  subtitle: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary, marginTop: 2 },

  card: { marginBottom: SPACING.lg },
  cardTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: SPACING.md },

  flowRow: { flexDirection: 'row', gap: SPACING.md },
  flowBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  flowBtnActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  flowInner: { alignItems: 'center', paddingVertical: SPACING.md, gap: 4 },
  flowEmoji: { fontSize: 18 },
  flowLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontWeight: '600' },
  flowLabelActive: { color: COLORS.primaryDark },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, justifyContent: 'space-between' },
  symptomTile: {
    width: '30%',
    aspectRatio: 0.95,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    paddingVertical: SPACING.sm,
  },
  symptomTileActive: { backgroundColor: 'rgba(255,107,157,0.14)', borderColor: COLORS.primary },
  symptomLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' },
  symptomLabelActive: { color: COLORS.primaryDark, fontWeight: '700' },

  saveBtn: {
    height: 56,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  saveText: { ...TYPOGRAPHY.button, color: COLORS.white, fontSize: 16 },
});

export default SymptomLoggerScreen;
