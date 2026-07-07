import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { fontScale, scale } from '../utils/responsive';
import { useTheme } from '../theme/useTheme';
import type { ThemePalette } from '../theme/palette';
import { useAppStore } from '../store/appStore';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import Ripple from '../components/Ripple';
import { v4 as uuidv4 } from 'uuid';
import { MoodEntry } from '../types';

const MOOD_EMOJI = ['😢', '☹️', '😐', '🙂', '😄'];

interface ScaleRowProps {
  title: string;
  value: number;
  options: number[];
  suffix?: string;
  emoji?: string;
  onSelect: (v: number) => void;
  c: ThemePalette;
}

const ScaleRow: React.FC<ScaleRowProps> = ({ title, value, options, suffix = '', emoji, onSelect, c }) => (
  <GlassCard style={sr.card}>
    <View style={sr.header}>
      <Text style={[sr.title, { color: c.text }]}>{title}</Text>
      <Text style={[sr.value, { color: c.text }]}>
        {emoji ? `${emoji}  ` : ''}
        {value}
        {suffix}
      </Text>
    </View>
    <View style={sr.pills}>
      {options.map((v) => {
        const active = value === v;
        return (
          <Pressable
            key={v}
            style={[
              sr.pill,
              { backgroundColor: c.pillBg, borderColor: c.pillBorder },
              active && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onSelect(v);
            }}
          >
            <Text style={[sr.pillText, { color: active ? COLORS.white : c.textSecondary }]}>
              {v}
              {suffix}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </GlassCard>
);

const sr = StyleSheet.create({
  card: { marginBottom: SPACING.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: { ...TYPOGRAPHY.h4 },
  value: { ...TYPOGRAPHY.body1, fontWeight: '700' },
  pills: { flexDirection: 'row', gap: SPACING.sm },
  pill: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  pillText: { ...TYPOGRAPHY.body2, fontWeight: '600' },
});

const MoodTrackerScreen = ({ navigation }: any) => {
  const { user, addMoodEntry } = useAppStore();
  const { colors: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [water] = useState(8);
  const [exercise] = useState('');
  const [notes] = useState('');

  const handleSave = () => {
    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }
    const now = new Date();
    const entry: MoodEntry = {
      id: uuidv4(),
      userId: user.id,
      timestamp: now,
      mood,
      stress,
      energy,
      sleep,
      waterIntake: water,
      exercise,
      notes,
      createdAt: now,
    };
    addMoodEntry(entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('Saved', 'Daily check-in saved!');
    navigation.goBack();
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <Text style={styles.title}>Daily Check-in</Text>
            <Text style={styles.subtitle}>Track your wellness today</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <ScaleRow title="Mood" value={mood} options={[1, 2, 3, 4, 5]} emoji={MOOD_EMOJI[mood - 1]} onSelect={setMood} c={c} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <ScaleRow title="Stress level" value={stress} options={[1, 2, 3, 4, 5]} onSelect={setStress} c={c} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(220).springify()}>
            <ScaleRow title="Energy level" value={energy} options={[1, 2, 3, 4, 5]} onSelect={setEnergy} c={c} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(280).springify()}>
            <ScaleRow title="Sleep hours" value={sleep} options={[4, 5, 6, 7, 8, 9]} suffix="h" onSelect={setSleep} c={c} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(340).springify()}>
            <Ripple onPress={handleSave} borderRadius={18} style={styles.saveBtn} rippleColor="rgba(255,255,255,0.4)">
              <Text style={styles.saveText}>Save Check-in</Text>
            </Ripple>
          </Animated.View>

          <View style={{ height: scale(110) }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const makeStyles = (c: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: SPACING.lg },
    scroll: { paddingTop: SPACING.md },
    header: { marginTop: SPACING.md, marginBottom: SPACING.lg },
    title: { ...TYPOGRAPHY.h2, fontSize: fontScale(28), color: c.text },
    subtitle: { ...TYPOGRAPHY.body2, color: c.textSecondary, marginTop: 2 },

    saveBtn: {
      height: 56,
      marginTop: SPACING.sm,
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

export default MoodTrackerScreen;
