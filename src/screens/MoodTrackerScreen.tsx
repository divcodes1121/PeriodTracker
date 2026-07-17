import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { v4 as uuidv4 } from 'uuid';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import MoodFace from '../components/MoodFace';
import Stepper from '../components/Stepper';
import { useAppStore } from '../store/appStore';
import { MoodEntry } from '../types';
import { COLORS } from '../constants';
import { SPACE, MOTION } from '../theme/tokens';
import { recommendEscape } from '../utils/tinyEscapes';

/**
 * Valence scale, 1–5. These are the labels for MoodEntry.mood, which is an
 * ordinal scale — so they read low→high rather than being unordered feelings.
 */
const MOODS: { value: number; label: string; color: string }[] = [
  { value: 1, label: 'Low', color: '#8E8AA8' },
  { value: 2, label: 'Down', color: COLORS.accent },
  { value: 3, label: 'Okay', color: COLORS.info },
  { value: 4, label: 'Good', color: COLORS.success },
  { value: 5, label: 'Great', color: COLORS.warning },
];

const MoodTrackerScreen = ({ navigation }: any) => {
  const { user, addMoodEntry } = useAppStore();

  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [suggestion, setSuggestion] = useState<{ escapeId: string } | null>(null);

  const selected = MOODS.find((m) => m.value === mood);

  const handleSave = () => {
    if (!user || mood === null) return;
    const now = new Date();
    const entry: MoodEntry = {
      id: uuidv4(),
      userId: user.id,
      timestamp: now,
      mood,
      stress,
      energy,
      sleep,
      waterIntake: 8,
      exercise: '',
      notes: '',
      createdAt: now,
    };
    addMoodEntry(entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Adaptive reset: a heavy check-in earns a gentle offer, not a redirect.
    const escapeId = recommendEscape(mood, stress);
    if (escapeId) {
      setSuggestion({ escapeId });
      return;
    }
    Alert.alert('Saved', 'Your check-in has been recorded.');
    navigation.goBack();
  };

  if (suggestion) {
    return (
      <Screen title="Saved" subtitle="Thanks for checking in">
        <Reveal index={0}>
          <Surface>
            <Text variant="title3">Today sounds heavy.</Text>
            <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.sm }}>
              Would a two-minute reset help? No goals, no score — just somewhere soft to put your
              attention for a moment.
            </Text>
            <View style={{ marginTop: SPACE.xl, gap: SPACE.sm }}>
              <Button
                label="Take a two-minute reset"
                onPress={() =>
                  navigation.navigate('EscapePlayer', {
                    escapeId: suggestion.escapeId,
                    plannedSec: 120,
                  })
                }
              />
              <Button label="Not now" variant="plain" onPress={() => navigation.goBack()} />
            </View>
          </Surface>
        </Reveal>
      </Screen>
    );
  }

  return (
    <Screen title="How are you?" subtitle="A moment to check in with yourself">
      {/* Mood selector */}
      <Reveal index={0}>
        <Surface style={{ marginBottom: SPACE.lg }}>
          <View style={styles.faces}>
            {MOODS.map((m) => (
              <MoodFace
                key={m.value}
                value={m.value}
                label={m.label}
                color={m.color}
                selected={mood === m.value}
                onPress={() => setMood(m.value)}
              />
            ))}
          </View>
        </Surface>
      </Reveal>

      {/* The rest of the check-in unfolds only once a mood is chosen, so the
          screen opens as a single calm question rather than a form. */}
      {mood !== null && (
        <Animated.View
          entering={FadeIn.duration(MOTION.base)}
          layout={LinearTransition.springify().damping(MOTION.springSoft.damping)}
        >
          <Text variant="title3" style={styles.question}>
            What happened today?
          </Text>

          <Surface style={{ marginBottom: SPACE.lg }}>
            <Stepper
              label="Stress"
              value={stress}
              options={[1, 2, 3, 4, 5]}
              onChange={setStress}
              anchors={['Calm', 'Stressed']}
              accent={selected?.color ?? COLORS.primary}
            />
            <Stepper
              label="Energy"
              value={energy}
              options={[1, 2, 3, 4, 5]}
              onChange={setEnergy}
              anchors={['Drained', 'Energised']}
              accent={selected?.color ?? COLORS.primary}
            />
            <Stepper
              label="Sleep"
              value={sleep}
              options={[4, 5, 6, 7, 8, 9]}
              onChange={setSleep}
              suffix="h"
              anchors={['Short night', 'Well rested']}
              accent={selected?.color ?? COLORS.primary}
            />
          </Surface>

          <Button label="Save check-in" onPress={handleSave} accent={selected?.color} />
        </Animated.View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  faces: { flexDirection: 'row', gap: SPACE.xs },
  question: { marginBottom: SPACE.lg },
});

export default MoodTrackerScreen;
