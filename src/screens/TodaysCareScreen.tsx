import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Reveal from '../components/Reveal';
import Icon from '../components/Icon';
import Illustration from '../components/Illustration';
import PetalBurst from '../components/PetalBurst';
import { ExerciseThumb } from '../components/care/ExerciseFigure';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/appStore';
import { BLOOM, BloomHue } from '../constants';
import { MOTION, RADIUS, SPACE, MIN_TAP_COMFORT } from '../theme/tokens';
import { buildCarePlan } from '../care/engine';
import { needsSafetyCheck } from '../care/safety';
import { CARE_DISCLAIMER, STRENGTH_PHRASE, resolveSources } from '../care/evidence';
import { checkInFor, isPeriodDay, periodDayNumber } from '../care/period';
import {
  CareMood,
  CareSymptom,
  CheckIn,
  EnergyLevel,
  FlowLevel,
  PainLevel,
  SafetyAnswers,
  SleepQuality,
} from '../care/types';
import { deriveCycleContext } from '../utils/cycleCalculations';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TODAY'S CARE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Three states, one screen:
 *
 *   locked   outside a logged period — a beautiful card that says when it opens
 *   checkIn  a short sequence of questions
 *   plan     the generated day
 *
 * ── The twenty-second promise ─────────────────────────────────────────────
 *
 * Everything about the check-in is shaped by it, and it is the hardest part of
 * the brief to actually hit:
 *
 *   • **One question per screen, auto-advancing.** Single-choice steps move on
 *     the moment you tap. No Next button to find, no scrolling to see whether
 *     there is more.
 *   • **Big targets.** `MIN_TAP_COMFORT` and up — this is used one-handed, in
 *     bed, by someone in pain.
 *   • **Everything skippable.** Every step has sensible defaults and a Skip.
 *     A required field on a wellness check-in is a small act of coercion.
 *   • **The safety step only appears when it is earned.** Asking everyone about
 *     fainting daily would both break the promise and, worse, make the
 *     questions ordinary enough to click through without reading.
 *
 * ── What it deliberately does not do ──────────────────────────────────────
 *
 * No streak. No "you've checked in 4 days running". The garden on Home already
 * carries the returning-user incentive, and it does so without a number that
 * can go to zero on the day someone is too unwell to open the app.
 */

// ───────────────────────────────────────────────────────────────────────────
// Step definitions
// ───────────────────────────────────────────────────────────────────────────

const PAIN: { value: PainLevel; label: string; hue: BloomHue }[] = [
  { value: 'none', label: 'None', hue: 'sage' },
  // Blossom, not gold. Gold's ink is a dark olive-brown — correct for
  // contrast (6.2:1 under white) and the muddiest fill in the set. A selected
  // chip is a large filled shape, so it is the one place ink aesthetics show.
  { value: 'mild', label: 'Mild', hue: 'blossom' },
  { value: 'moderate', label: 'Moderate', hue: 'peach' },
  { value: 'severe', label: 'Severe', hue: 'coral' },
];

const MOODS: { value: CareMood; label: string; hue: BloomHue }[] = [
  { value: 'happy', label: 'Happy', hue: 'gold' },
  { value: 'calm', label: 'Calm', hue: 'sage' },
  { value: 'emotional', label: 'Emotional', hue: 'blossom' },
  { value: 'anxious', label: 'Anxious', hue: 'sky' },
  { value: 'irritable', label: 'Irritable', hue: 'coral' },
  { value: 'low', label: 'Low', hue: 'lavender' },
  { value: 'stressed', label: 'Stressed', hue: 'peach' },
  { value: 'overwhelmed', label: 'Overwhelmed', hue: 'lilac' },
];

const SYMPTOMS: { value: CareSymptom; label: string; icon: string; hue: BloomHue }[] = [
  { value: 'cramps', label: 'Cramps', icon: 'spark', hue: 'rose' },
  { value: 'backPain', label: 'Back pain', icon: 'back', hue: 'coral' },
  { value: 'headache', label: 'Headache', icon: 'headache', hue: 'peach' },
  { value: 'migraine', label: 'Migraine', icon: 'headache', hue: 'lavender' },
  { value: 'bloating', label: 'Bloating', icon: 'bloat', hue: 'peach' },
  { value: 'nausea', label: 'Nausea', icon: 'wave', hue: 'sage' },
  { value: 'fatigue', label: 'Fatigue', icon: 'moon', hue: 'lavender' },
  { value: 'tenderBreasts', label: 'Tender breasts', icon: 'petal', hue: 'blossom' },
  { value: 'acne', label: 'Acne', icon: 'acne', hue: 'blossom' },
  { value: 'digestive', label: 'Digestive', icon: 'wave', hue: 'sage' },
  { value: 'cravings', label: 'Cravings', icon: 'cherry', hue: 'gold' },
  { value: 'none', label: 'None of these', icon: 'check', hue: 'lilac' },
];

const ENERGY: { value: EnergyLevel; label: string; hue: BloomHue }[] = [
  { value: 'veryHigh', label: 'Very high', hue: 'sage' },
  { value: 'high', label: 'High', hue: 'sage' },
  { value: 'normal', label: 'Normal', hue: 'blossom' },
  { value: 'low', label: 'Low', hue: 'lavender' },
  { value: 'veryLow', label: 'Very low', hue: 'lilac' },
];

const FLOW: { value: FlowLevel; label: string; hue: BloomHue }[] = [
  { value: 'spotting', label: 'Spotting', hue: 'blossom' },
  { value: 'light', label: 'Light', hue: 'blossom' },
  { value: 'medium', label: 'Medium', hue: 'rose' },
  { value: 'heavy', label: 'Heavy', hue: 'rose' },
  { value: 'veryHeavy', label: 'Very heavy', hue: 'coral' },
];

const SLEEP: { value: SleepQuality; label: string; hue: BloomHue }[] = [
  { value: 'excellent', label: 'Excellent', hue: 'sage' },
  { value: 'good', label: 'Good', hue: 'sage' },
  { value: 'okay', label: 'Okay', hue: 'blossom' },
  { value: 'poor', label: 'Poor', hue: 'peach' },
  { value: 'veryPoor', label: 'Very poor', hue: 'lavender' },
];

const SAFETY_QUESTIONS: { key: keyof SafetyAnswers; label: string }[] = [
  { key: 'soakingHourly', label: 'Soaking a pad or tampon every hour or two' },
  { key: 'largeClots', label: 'Clots bigger than a 10p coin' },
  { key: 'painkillersNotHelping', label: 'Painkillers are not touching the pain' },
  { key: 'fever', label: 'A fever, or feeling suddenly unwell' },
  { key: 'faintness', label: 'Felt faint or close to fainting' },
  { key: 'breathless', label: 'Breathless doing ordinary things' },
  { key: 'usingInternalProduct', label: 'Using a tampon or menstrual cup' },
];

// ───────────────────────────────────────────────────────────────────────────
// Small pieces
// ───────────────────────────────────────────────────────────────────────────

/** A large single-choice row. Auto-advances — see the twenty-second note. */
function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hue: BloomHue }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          hue={o.hue}
          selected={value === o.value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </View>
  );
}

/** Progress. Petals again, so it belongs to the same family as onboarding. */
function StepDots({ step, total }: { step: number; total: number }) {
  const { colors: c } = useTheme();
  return (
    <View
      style={styles.dots}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
      accessibilityLabel={`Question ${step + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i <= step ? BLOOM.rose.deep : c.trackNeutral,
              height: i === step ? 18 : 12,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Screen
// ───────────────────────────────────────────────────────────────────────────

const TodaysCareScreen = ({ navigation }: any) => {
  const { colors: c, isDark } = useTheme();
  const { user, periodEntries, careCheckIns, upsertCareCheckIn } = useAppStore();
  const today = useMemo(() => new Date(), []);

  const unlocked = isPeriodDay(today, periodEntries);
  const dayNumber = periodDayNumber(today, periodEntries);
  const existing = checkInFor(today, careCheckIns);

  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(0);
  const [burst, setBurst] = useState(0);

  const [pain, setPain] = useState<PainLevel>('mild');
  const [moods, setMoods] = useState<CareMood[]>([]);
  const [symptoms, setSymptoms] = useState<CareSymptom[]>([]);
  const [energy, setEnergy] = useState<EnergyLevel>('normal');
  const [flow, setFlow] = useState<FlowLevel>('medium');
  const [sleep, setSleep] = useState<SleepQuality>('okay');
  const [notes, setNotes] = useState('');
  const [safety, setSafety] = useState<SafetyAnswers>({});

  const wantsSafety = needsSafetyCheck({ pain, flow, symptoms });
  const totalSteps = wantsSafety ? 8 : 7;

  const advance = () => {
    Haptics.selectionAsync().catch(() => {});
    setStep((s) => s + 1);
  };

  const save = () => {
    if (!user) return;
    const entry: CheckIn = {
      id: uuidv4(),
      userId: user.id,
      date: today,
      pain,
      moods,
      symptoms,
      energy,
      flow,
      sleep,
      notes: notes.trim(),
      safety: wantsSafety ? safety : undefined,
      createdAt: new Date(),
    };
    upsertCareCheckIn(entry);
    setBurst((n) => n + 1);
    setEditing(false);
    setStep(0);
  };

  // ── Locked ──────────────────────────────────────────────────────────────
  if (!unlocked) {
    const cycleLength = user ? deriveCycleContext(user, periodEntries).cycleLength : 28;
    return (
      <Screen title="Today's Care" subtitle="A companion for your period days">
        <Reveal index={0}>
          <Surface variant="hero" tint={BLOOM.lilac.pastel} style={styles.lockedCard}>
            <View style={{ alignItems: 'center' }}>
              <Illustration name="vase" size={148} />
            </View>
            <Text variant="title3" style={styles.lockedTitle}>
              Available during your next period
            </Text>
            <Text variant="callout" tone="secondary" style={styles.lockedBody}>
              When your period starts, this becomes a two-minute check-in and a
              day built around how you actually feel — movement, food, warmth,
              and something kind to read.
            </Text>
            <View style={[styles.lockedHint, { backgroundColor: c.fill }]}>
              <Icon name="lock" size={15} color={c.textSecondary} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                Unlocks the day you log your period starting.
              </Text>
            </View>
          </Surface>
        </Reveal>

        <Reveal index={1}>
          <Surface variant="quiet" onPress={() => navigation.navigate('PeriodLogger')}>
            <View style={styles.row}>
              <View style={[styles.iconTile, { backgroundColor: `${BLOOM.rose.pastel}33` }]}>
                <Icon name="drop" size={19} color={BLOOM.rose.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">Started already?</Text>
                <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
                  Log it and this opens straight away
                </Text>
              </View>
              <Icon name="chevronRight" size={17} color={c.textTertiary} />
            </View>
          </Surface>
        </Reveal>

        <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
          {CARE_DISCLAIMER}
        </Text>
      </Screen>
    );
  }

  // ── Plan ────────────────────────────────────────────────────────────────
  if (existing && !editing) {
    const plan = buildCarePlan(existing);
    const emergency = plan.safety.suppressPlan;

    return (
      <Screen
        title={`Day ${dayNumber}`}
        subtitle={format(today, 'EEEE, d MMMM')}
      >
        <PetalBurst trigger={burst} originY={0.3} />

        {/* Safety first, structurally — see care/safety.ts */}
        {plan.safety.flags.length > 0 && (
          <Reveal index={0}>
            <Surface
              variant={plan.safety.urgency === 'routine' ? 'quiet' : 'hero'}
              tint={plan.safety.urgency === 'routine' ? BLOOM.gold.pastel : BLOOM.coral.pastel}
              style={styles.safetyCard}
              accessibilityLabel={plan.safety.headline}
            >
              <View style={styles.row}>
                <View style={[styles.iconTile, { backgroundColor: `${BLOOM.coral.pastel}3D` }]}>
                  <Icon name="info" size={19} color={BLOOM.coral.ink} />
                </View>
                <Text variant="headline" style={{ flex: 1 }}>
                  {plan.safety.headline}
                </Text>
              </View>
              {plan.safety.flags.map((f) => (
                <View key={f.id} style={styles.flag}>
                  <Text variant="callout">{f.observation}</Text>
                  <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.xs }}>
                    {f.action}
                  </Text>
                  <Text variant="caption" tone="tertiary" style={{ marginTop: SPACE.xs }}>
                    {resolveSources(f.sources).map((s) => s.org).join(' · ')}
                  </Text>
                </View>
              ))}
            </Surface>
          </Reveal>
        )}

        {emergency ? (
          <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
            {CARE_DISCLAIMER}
          </Text>
        ) : (
          <>
            <Reveal index={1}>
              <Surface variant="hero" tint={BLOOM.rose.pastel} style={styles.focusCard}>
                <Text variant="overline" tone="secondary">
                  If you only do one thing
                </Text>
                <Text variant="title3" style={{ marginTop: SPACE.xs }}>
                  {plan.focus}
                </Text>
              </Surface>
            </Reveal>

            {plan.sections.map((section, si) => (
              <Reveal key={section.id} index={2 + si}>
                <View style={styles.section}>
                  <Text variant="overline" tone="secondary">
                    {section.title}
                  </Text>
                  <Text variant="caption" tone="tertiary" style={{ marginBottom: SPACE.md }}>
                    {section.lead}
                  </Text>

                  {section.items.map((item) => {
                    const hue = BLOOM[(item.hue as BloomHue) ?? 'rose'];
                    const ex = plan.exercises.find((e) => e.id === item.exerciseId);
                    return (
                      <Surface
                        key={item.id}
                        variant="quiet"
                        style={styles.itemCard}
                        onPress={
                          ex
                            ? () =>
                                navigation.navigate('ExercisePlayer', { exerciseId: ex.id })
                            : undefined
                        }
                        accessibilityLabel={item.title}
                      >
                        <View style={styles.row}>
                          {ex ? (
                            <ExerciseThumb exercise={ex} size={46} color={hue.deep} />
                          ) : (
                            <View
                              style={[styles.iconTile, { backgroundColor: `${hue.pastel}33` }]}
                            >
                              <Icon
                                name={(item.icon as any) ?? 'sparkles'}
                                size={19}
                                color={isDark ? hue.pastel : hue.ink}
                              />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text variant="headline">{item.title}</Text>
                            {ex ? (
                              <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
                                {Math.round(ex.seconds / 60) || 1} min · {ex.difficulty}
                              </Text>
                            ) : null}
                          </View>
                          {ex ? (
                            <Icon name="chevronRight" size={17} color={c.textTertiary} />
                          ) : null}
                        </View>
                        <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.md }}>
                          {item.why}
                        </Text>
                        <View style={styles.evidence}>
                          <Text variant="caption" tone="tertiary">
                            {STRENGTH_PHRASE[item.strength]}
                          </Text>
                          <Text variant="caption" tone="tertiary">
                            {resolveSources(item.sources).map((s) => s.org).join(' · ')}
                          </Text>
                        </View>
                      </Surface>
                    );
                  })}
                </View>
              </Reveal>
            ))}

            <Reveal index={7}>
              <Surface variant="hero" tint={BLOOM.blossom.pastel} style={styles.encouragement}>
                <Illustration name="petals" size={80} />
                <Text variant="body" style={styles.encouragementText}>
                  {plan.encouragement}
                </Text>
              </Surface>
            </Reveal>

            <Button
              label="Update today's check-in"
              variant="secondary"
              onPress={() => {
                setPain(existing.pain);
                setMoods(existing.moods);
                setSymptoms(existing.symptoms);
                setEnergy(existing.energy);
                setFlow(existing.flow);
                setSleep(existing.sleep);
                setNotes(existing.notes);
                setSafety(existing.safety ?? {});
                setStep(0);
                setEditing(true);
              }}
            />

            <Text variant="caption" tone="tertiary" style={styles.disclaimer}>
              {CARE_DISCLAIMER}
            </Text>
          </>
        )}
      </Screen>
    );
  }

  // ── Check-in ────────────────────────────────────────────────────────────
  const steps = [
    {
      q: 'How much pain today?',
      body: <ChoiceRow options={PAIN} value={pain} onChange={(v) => { setPain(v); advance(); }} />,
    },
    {
      q: 'How are you feeling?',
      hint: 'Pick as many as fit.',
      body: (
        <View style={styles.choices}>
          {MOODS.map((m) => (
            <Chip
              key={m.value}
              label={m.label}
              hue={m.hue}
              selected={moods.includes(m.value)}
              onPress={() =>
                setMoods((prev) =>
                  prev.includes(m.value) ? prev.filter((x) => x !== m.value) : [...prev, m.value]
                )
              }
            />
          ))}
        </View>
      ),
    },
    {
      q: 'Anything in your body?',
      hint: 'Pick as many as fit.',
      body: (
        <View style={styles.choices}>
          {SYMPTOMS.map((s) => (
            <Chip
              key={s.value}
              label={s.label}
              icon={s.icon as any}
              hue={s.hue}
              selected={symptoms.includes(s.value)}
              onPress={() =>
                setSymptoms((prev) => {
                  // "None of these" is exclusive in both directions, so the
                  // answer can never contradict itself.
                  if (s.value === 'none') return prev.includes('none') ? [] : ['none'];
                  const next = prev.filter((x) => x !== 'none');
                  return next.includes(s.value)
                    ? next.filter((x) => x !== s.value)
                    : [...next, s.value];
                })
              }
            />
          ))}
        </View>
      ),
    },
    {
      q: 'Energy today?',
      body: <ChoiceRow options={ENERGY} value={energy} onChange={(v) => { setEnergy(v); advance(); }} />,
    },
    {
      q: 'How is your flow?',
      body: <ChoiceRow options={FLOW} value={flow} onChange={(v) => { setFlow(v); advance(); }} />,
    },
    {
      q: 'How did you sleep?',
      body: <ChoiceRow options={SLEEP} value={sleep} onChange={(v) => { setSleep(v); advance(); }} />,
    },
    {
      q: 'Anything else about today?',
      hint: 'Optional. Exams, a long shift, travelling — it changes what gets suggested.',
      body: (
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Totally optional"
          placeholderTextColor={c.textTertiary}
          multiline
          style={[
            styles.notes,
            { backgroundColor: c.inputBg, color: c.text, borderColor: c.inputBorder },
          ]}
          accessibilityLabel="Notes about today"
        />
      ),
    },
  ];

  if (wantsSafety) {
    steps.push({
      q: 'A few quick checks',
      hint: 'Only because of what you told us. Tap anything that is true — none is a fine answer.',
      body: (
        <View style={styles.choices}>
          {SAFETY_QUESTIONS.map((q) => (
            <Chip
              key={q.key}
              label={q.label}
              hue="coral"
              selected={Boolean(safety[q.key])}
              onPress={() => setSafety((prev) => ({ ...prev, [q.key]: !prev[q.key] }))}
            />
          ))}
        </View>
      ),
    });
  }

  const current = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;

  return (
    <Screen title="Today's Care" subtitle={`Day ${dayNumber} · takes under a minute`}>
      <Reveal index={0}>
        <StepDots step={step} total={totalSteps} />
      </Reveal>

      <Animated.View
        key={step}
        entering={FadeIn.duration(MOTION.base)}
        exiting={FadeOut.duration(MOTION.instant)}
        layout={LinearTransition.springify().damping(MOTION.springSoft.damping)}
      >
        <Text variant="title2" style={styles.question}>
          {current.q}
        </Text>
        {'hint' in current && current.hint ? (
          <Text variant="callout" tone="secondary" style={styles.hint}>
            {current.hint}
          </Text>
        ) : null}
        {current.body}
      </Animated.View>

      <View style={styles.nav}>
        {last ? (
          <Button label="See today's plan" onPress={save} />
        ) : (
          <Button label="Continue" iconRight="arrowRight" onPress={advance} />
        )}
        <Pressable
          onPress={last ? save : advance}
          accessibilityRole="button"
          accessibilityLabel={last ? 'Skip and see plan' : 'Skip this question'}
          hitSlop={12}
          style={styles.skip}
        >
          <Text variant="caption" tone="tertiary">
            {last ? 'Skip and finish' : 'Skip'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  lockedCard: { marginBottom: SPACE.sm },
  lockedTitle: { marginTop: SPACE.lg, textAlign: 'center' },
  lockedBody: { marginTop: SPACE.sm, textAlign: 'center' },
  lockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.xl,
    padding: SPACE.md,
    borderRadius: RADIUS.md,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  safetyCard: { marginBottom: SPACE.lg },
  flag: { marginTop: SPACE.lg },

  focusCard: { marginBottom: SPACE.h1 },
  section: { marginBottom: SPACE.h1 },
  itemCard: { marginBottom: SPACE.sm },
  evidence: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    marginTop: SPACE.md,
  },

  encouragement: { alignItems: 'center', marginBottom: SPACE.xl },
  encouragementText: { textAlign: 'center', marginTop: SPACE.md },

  dots: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: SPACE.h1 },
  dot: { width: 8, borderRadius: 8 },

  question: { marginBottom: SPACE.xs },
  hint: { marginBottom: SPACE.lg },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },

  notes: {
    minHeight: MIN_TAP_COMFORT * 2,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE.lg,
    fontSize: 16,
    textAlignVertical: 'top',
  },

  nav: { marginTop: SPACE.h2, gap: SPACE.md, alignItems: 'center' },
  skip: { paddingVertical: SPACE.sm, paddingHorizontal: SPACE.lg },

  disclaimer: { marginTop: SPACE.xl, lineHeight: 18 },
});

export default TodaysCareScreen;
