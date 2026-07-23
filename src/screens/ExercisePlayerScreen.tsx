import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Reveal from '../components/Reveal';
import PetalBurst from '../components/PetalBurst';
import ExerciseFigure from '../components/care/ExerciseFigure';
import { useTheme } from '../theme/useTheme';
import { BLOOM } from '../constants';
import { MOTION, RADIUS, SPACE } from '../theme/tokens';
import { getExercise } from '../care/exercises';
import { resolveSources } from '../care/evidence';
import { EmptyState } from '../components/States';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXERCISE PLAYER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The animated figure, the steps, and a timer that does not judge you.
 *
 * ── Three decisions that make this calm rather than fitness-app ───────────
 *
 * **The timer counts down, and running out is not an event.** No alarm, no
 * "workout complete!", no score. It reaches zero, a soft burst of petals
 * happens, and the figure keeps moving if you want to stay. A timer that
 * *ends* something turns a stretch into a task with a pass mark.
 *
 * **Safety and "when to avoid this" are on the page, not behind a tap.** Every
 * app puts contraindications in an expandable at the bottom. If it matters
 * enough to write, it matters enough to read before starting — and it costs
 * two lines.
 *
 * **Stopping early is a first-class button.** It says "That's enough for now",
 * not "Quit". The difference is the entire tone of the feature.
 */

const ExercisePlayerScreen = ({ route, navigation }: any) => {
  const { colors: c, isDark } = useTheme();
  const exerciseId: string = route?.params?.exerciseId;
  const exercise = getExercise(exerciseId);

  const [running, setRunning] = useState(true);
  const [left, setLeft] = useState(exercise?.seconds ?? 60);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running || done) return;
    tick.current = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          // Completion is a soft landing: haptic, petals, and the figure
          // carries on. Nothing is taken away for staying longer.
          setDone(true);
          setBurst((n) => n + 1);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running, done]);

  if (!exercise) {
    return (
      <Screen title="Not found">
        <EmptyState
          illustration="sprout"
          title="That one has moved"
          body="Head back and pick another — they are all still here."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const mins = Math.floor(left / 60);
  const secs = left % 60;
  const hue = exercise.difficulty === 'restful' ? BLOOM.lavender : BLOOM.sage;

  return (
    <Screen title={exercise.title} subtitle={exercise.description}>
      <PetalBurst trigger={burst} originY={0.34} />

      {/* ── The figure ──────────────────────────────────────────────────── */}
      <Reveal index={0}>
        <Surface variant="hero" tint={hue.pastel} style={styles.stage}>
          <ExerciseFigure
            exercise={exercise}
            size={230}
            paused={!running}
            color={isDark ? hue.pastel : hue.deep}
          />

          <View style={styles.timerRow}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setRunning((r) => !r);
              }}
              accessibilityRole="button"
              accessibilityLabel={running ? 'Pause' : 'Resume'}
              style={[styles.playBtn, { backgroundColor: c.fill }]}
              hitSlop={8}
            >
              <Icon
                name={running ? 'minus' : 'arrowRight'}
                size={20}
                color={c.textSecondary}
              />
            </Pressable>

            <Text variant="display" tabular style={styles.timer}>
              {mins}:{String(secs).padStart(2, '0')}
            </Text>
          </View>

          <Text variant="caption" tone="secondary" style={styles.breathLine}>
            {exercise.breathing}
          </Text>

          {done ? (
            <Animated.View entering={FadeIn.duration(MOTION.base)} style={styles.doneRow}>
              <Text variant="callout" tone="secondary" style={{ textAlign: 'center' }}>
                That's the time — stay as long as you like.
              </Text>
            </Animated.View>
          ) : null}
        </Surface>
      </Reveal>

      {/* ── Safety, before the steps and never behind a tap ─────────────── */}
      <Reveal index={1}>
        <Surface variant="quiet" tint={BLOOM.gold.pastel} style={styles.card}>
          <View style={styles.row}>
            <Icon name="info" size={17} color={BLOOM.gold.ink} />
            <Text variant="overline" tone="secondary">
              Before you start
            </Text>
          </View>
          <Text variant="callout" style={{ marginTop: SPACE.sm }}>
            {exercise.safety}
          </Text>
          {exercise.avoidIf.length > 0 ? (
            <View style={{ marginTop: SPACE.md }}>
              <Text variant="caption" tone="secondary">
                Skip this one if:
              </Text>
              {exercise.avoidIf.map((a) => (
                <Text key={a} variant="caption" tone="secondary" style={styles.bullet}>
                  · {a}
                </Text>
              ))}
            </View>
          ) : null}
        </Surface>
      </Reveal>

      {/* ── Steps ───────────────────────────────────────────────────────── */}
      <Reveal index={2}>
        <Surface variant="card" style={styles.card}>
          <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.md }}>
            How to
          </Text>
          {exercise.steps.map((s, i) => (
            <View key={s} style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: `${hue.pastel}38` }]}>
                <Text variant="caption" color={isDark ? hue.pastel : hue.ink} tabular>
                  {i + 1}
                </Text>
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {s}
              </Text>
            </View>
          ))}
        </Surface>
      </Reveal>

      {/* ── Why it helps ────────────────────────────────────────────────── */}
      <Reveal index={3}>
        <Surface variant="quiet" style={styles.card}>
          <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.md }}>
            Why it helps
          </Text>
          {exercise.benefits.map((b) => (
            <Text key={b} variant="callout" tone="secondary" style={styles.bullet}>
              · {b}
            </Text>
          ))}
          {exercise.equipment.length > 0 ? (
            <Text variant="caption" tone="tertiary" style={{ marginTop: SPACE.md }}>
              Helpful: {exercise.equipment.join(', ')}
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary" style={{ marginTop: SPACE.md }}>
            {resolveSources(exercise.sources).map((s) => s.org).join(' · ')}
          </Text>
        </Surface>
      </Reveal>

      <Button
        label={done ? 'Done' : "That's enough for now"}
        variant={done ? 'primary' : 'secondary'}
        onPress={() => navigation.goBack()}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  stage: { alignItems: 'center', marginBottom: SPACE.lg },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg, marginTop: SPACE.md },
  playBtn: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: { minWidth: 110, textAlign: 'center' },
  breathLine: { textAlign: 'center', marginTop: SPACE.sm, maxWidth: 300 },
  doneRow: { marginTop: SPACE.lg },

  card: { marginBottom: SPACE.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  bullet: { marginTop: SPACE.xs, lineHeight: 21 },

  step: { flexDirection: 'row', gap: SPACE.md, marginBottom: SPACE.md, alignItems: 'flex-start' },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ExercisePlayerScreen;
