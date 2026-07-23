import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { v4 as uuidv4 } from 'uuid';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import MoodBloom from '../components/MoodBloom';
import Stepper from '../components/Stepper';
import Illustration from '../components/Illustration';
import PetalBurst from '../components/PetalBurst';
import { useAppStore } from '../store/appStore';
import { MoodEntry } from '../types';
import { BLOOM, BloomHue, MOODS, MoodKey } from '../constants';
import { SPACE, MOTION } from '../theme/tokens';
import { recommendEscape } from '../utils/tinyEscapes';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MOOD — one question, asked kindly.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── Nine feelings, not five points ────────────────────────────────────────
 *
 * The old screen offered a 1–5 valence scale: Low, Down, Okay, Good, Great.
 * That is a *measurement instrument*, and it has a specific failure: there is
 * no square on it for "anxious but fine" or "loved and exhausted". A user who
 * cannot find themselves on the scale learns that the app does not have room
 * for how they actually feel, and stops answering honestly.
 *
 * So the surface is now nine named feelings. Each still maps to a 1–5 `value`
 * underneath — `MoodEntry.mood` is unchanged and every existing chart, insight
 * and trend keeps working — but the *question* stopped being "rate yourself".
 *
 * ── The room answers ──────────────────────────────────────────────────────
 *
 * Choosing a feeling tints the whole card in that feeling's hue, and the
 * chosen bloom grows an aura and starts to breathe while the other eight go
 * still. The screen responds to the answer rather than merely storing it —
 * which is the entire difference between a check-in and a survey.
 *
 * ── The rest unfolds only after ───────────────────────────────────────────
 *
 * Stress, energy and sleep do not exist until a feeling is picked, so the page
 * opens as one calm question instead of a three-part form.
 */

const MoodTrackerScreen = ({ navigation }: any) => {
  const { user, addMoodEntry } = useAppStore();

  const [mood, setMood] = useState<MoodKey | null>(null);
  const [stress, setStress] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [suggestion, setSuggestion] = useState<{ escapeId: string } | null>(null);
  const [burst, setBurst] = useState(0);

  const chosen = MOODS.find((m) => m.key === mood);
  const hue = chosen ? BLOOM[chosen.hue as BloomHue] : null;

  const handleSave = () => {
    if (!user || !chosen) return;
    const now = new Date();
    const entry: MoodEntry = {
      id: uuidv4(),
      userId: user.id,
      timestamp: now,
      // The nine feelings still resolve to the 1–5 ordinal the data model and
      // every downstream insight already speak.
      mood: chosen.value,
      stress,
      energy,
      sleep,
      waterIntake: 8,
      exercise: '',
      notes: '',
      createdAt: now,
    };
    addMoodEntry(entry);
    setBurst((n) => n + 1);

    // Adaptive reset: a heavy check-in earns a gentle *offer*, never a
    // redirect. Being moved somewhere you did not ask to go is the opposite of
    // care, however good the destination.
    const escapeId = recommendEscape(chosen.value, stress);
    if (escapeId) {
      setTimeout(() => setSuggestion({ escapeId }), 500);
      return;
    }
    setTimeout(() => navigation.goBack(), 620);
  };

  if (suggestion) {
    return (
      <Screen title="Saved" subtitle="Thanks for checking in">
        <Reveal index={0}>
          <Surface variant="hero" tint={BLOOM.lavender.pastel}>
            <View style={{ alignItems: 'center' }}>
              <Illustration name="teacup" size={132} />
            </View>
            <Text variant="title3" style={{ marginTop: SPACE.lg }}>
              Today sounds heavy.
            </Text>
            <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.sm }}>
              Would two minutes somewhere soft help? No goals, no score — just somewhere
              to put your attention for a moment.
            </Text>
            <View style={{ marginTop: SPACE.xl, gap: SPACE.sm }}>
              <Button
                label="Take two minutes"
                accent={BLOOM.lavender.ink}
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
    <Screen title="How are you?" subtitle="However you answer is the right answer.">
      <PetalBurst trigger={burst} originY={0.36} />

      {/* ── The nine feelings ──────────────────────────────────────────────
          The card washes to the chosen feeling's hue at low alpha and
          crossfades, so the room changes without anything jumping. */}
      <Reveal index={0}>
        <Surface
          variant="hero"
          style={{ marginBottom: SPACE.lg, overflow: 'hidden' }}
          tint={hue?.pastel}
        >
          {chosen ? (
            <Animated.View
              key={chosen.key}
              entering={FadeIn.duration(MOTION.slow)}
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: `${hue?.pastel}1A` }]}
            />
          ) : null}
          <View
            style={styles.faces}
            accessibilityRole="radiogroup"
            accessibilityLabel="How are you feeling"
          >
            {MOODS.map((m) => (
              <View key={m.key} style={styles.face}>
                <MoodBloom
                  mood={m.key}
                  selected={mood === m.key}
                  onPress={() => setMood(m.key)}
                  size={80}
                />
              </View>
            ))}
          </View>
        </Surface>
      </Reveal>

      {/* ── The rest, only once a feeling exists ────────────────────────── */}
      {chosen && (
        <Animated.View
          entering={FadeIn.duration(MOTION.base)}
          layout={LinearTransition.springify().damping(MOTION.springSoft.damping)}
        >
          <Text variant="title3" style={styles.question}>
            What was today like?
          </Text>

          <Surface variant="quiet" style={{ marginBottom: SPACE.lg }}>
            <Stepper
              label="Stress"
              value={stress}
              options={[1, 2, 3, 4, 5]}
              onChange={setStress}
              anchors={['Calm', 'Stressed']}
              accent={hue?.deep ?? BLOOM.rose.deep}
            />
            <Stepper
              label="Energy"
              value={energy}
              options={[1, 2, 3, 4, 5]}
              onChange={setEnergy}
              anchors={['Drained', 'Energised']}
              accent={hue?.deep ?? BLOOM.rose.deep}
            />
            <Stepper
              label="Sleep"
              value={sleep}
              options={[4, 5, 6, 7, 8, 9]}
              onChange={setSleep}
              suffix="h"
              anchors={['Short night', 'Well rested']}
              accent={hue?.deep ?? BLOOM.rose.deep}
            />
          </Surface>

          <Button label="Save check-in" onPress={handleSave} accent={hue?.ink ?? BLOOM.rose.ink} />
        </Animated.View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  // A 3×3 grid. A grid of faces reads as a palette to choose from; a single
  // scrolling row reads as a slider.
  //
  // The width is explicit rather than left to `space-between`, which packs as
  // many as fit and put four on a row — orphaning the ninth mood on a line of
  // its own. Nine items only read as a considered set when they form a square.
  faces: { flexDirection: 'row', flexWrap: 'wrap', rowGap: SPACE.lg },
  face: { width: '33.33%', alignItems: 'center' },
  question: { marginBottom: SPACE.lg },
});

export default MoodTrackerScreen;
