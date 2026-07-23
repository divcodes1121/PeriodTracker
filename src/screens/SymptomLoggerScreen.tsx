import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { v4 as uuidv4 } from 'uuid';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Reveal from '../components/Reveal';
import Notice from '../components/Notice';
import Severity from '../components/Severity';
import PetalBurst from '../components/PetalBurst';
import Illustration from '../components/Illustration';
import { IconName } from '../components/Icon';
import { useAppStore } from '../store/appStore';
import { SymptomType, Symptom, SymptomLog } from '../types';
import { SYMPTOMS, SYMPTOM_GROUPS, FLOW_INTENSITY, BLOOM, BloomHue } from '../constants';
import { SPACE, MOTION } from '../theme/tokens';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SYMPTOMS — a body check-in, not a form.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── What changed and why ──────────────────────────────────────────────────
 *
 * This was ten pills in one undifferentiated block. Ten of anything in a row
 * is a wall: the eye has no entry point, so choosing takes deliberate reading
 * rather than recognition. Two changes fix it, neither of them decorative:
 *
 * **Grouped into four short sections** — Body, Skin, Energy, Feelings. Four
 * decisions of two or three options each are dramatically faster than one
 * decision of ten, and the grouping is meaningful rather than alphabetical.
 *
 * **Illustrated chips instead of pills.** Every symptom carries a stroke glyph
 * that draws the *sensation* rather than the body part — cramps are a
 * radiating pulse, not a uterus. A period tracker that draws organs at people
 * is a clinic, and this is not one.
 *
 * Selecting a chip opens a small flower behind its icon (see `Chip`). Saving
 * fires a petal burst. Both are small enough to survive being seen twice a day
 * for years, which is the real design constraint on any reward in this app.
 *
 * ── Flow is drawn as petals, not colour ───────────────────────────────────
 *
 * One, two or three petals for light/medium/heavy. A *count* is readable
 * without colour, which meets the colour-blind requirement by construction
 * instead of by a legend.
 */

const FLOWS = ['light', 'medium', 'heavy'] as const;

const SymptomLoggerScreen = ({ navigation }: any) => {
  const { user, upsertSymptomLog } = useAppStore();
  const [selected, setSelected] = useState<Map<SymptomType, number>>(new Map());
  const [flow, setFlow] = useState<'light' | 'medium' | 'heavy' | 'none'>('none');
  /** Inline, because Alert.alert is a no-op on RN-web — see components/Notice. */
  const [notice, setNotice] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  /** Symptoms bucketed by their declared group, in the canonical order. */
  const groups = useMemo(() => {
    const keys = Object.keys(SYMPTOMS) as SymptomType[];
    return SYMPTOM_GROUPS.map((g) => ({
      name: g,
      items: keys.filter((k) => SYMPTOMS[k].group === g),
    })).filter((g) => g.items.length > 0);
  }, []);

  const toggle = (s: SymptomType) => {
    const next = new Map(selected);
    if (next.has(s)) next.delete(s);
    else next.set(s, 3);
    setSelected(next);
  };

  const setSeverity = (s: SymptomType, v: number) => {
    const next = new Map(selected);
    next.set(s, v);
    setSelected(next);
  };

  const handleSave = () => {
    if (!user || selected.size === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setNotice('Pick at least one thing to log — even one is useful.');
      return;
    }
    setNotice(null);
    const now = new Date();
    const symptoms: Symptom[] = Array.from(selected.entries()).map(([type, severity]) => ({
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
      flowIntensity: flow,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };
    upsertSymptomLog(log);
    setBurst((n) => n + 1);
    // Let the burst be seen before the screen leaves. 620ms is roughly the
    // point the petals reach their apex — long enough to register, short
    // enough that it never feels like being held.
    setTimeout(() => navigation.goBack(), 620);
  };

  return (
    <Screen title="How's your body?" subtitle="Tap anything that fits. Nothing is required.">
      <PetalBurst trigger={burst} originY={0.5} />

      {/* ── The chips, in four short sections ───────────────────────────── */}
      {groups.map((g, gi) => (
        <Reveal key={g.name} index={gi}>
          <Surface
            variant={gi === 0 ? 'hero' : 'quiet'}
            lift={gi > 0}
            style={{ marginBottom: SPACE.sm }}
          >
            <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.lg }}>
              {g.name}
            </Text>
            <View style={styles.chips}>
              {g.items.map((k) => (
                <Chip
                  key={k}
                  label={SYMPTOMS[k].label}
                  icon={SYMPTOMS[k].icon as IconName}
                  hue={SYMPTOMS[k].hue as BloomHue}
                  selected={selected.has(k)}
                  onPress={() => toggle(k)}
                />
              ))}
            </View>
          </Surface>
        </Reveal>
      ))}

      {/* ── Severity, only for what was actually chosen ─────────────────────
          This section does not exist until it is relevant. Asking "how bad?"
          about eight symptoms the user did not select is the single fastest
          way to make a check-in feel like paperwork. */}
      {selected.size > 0 && (
        <Animated.View
          entering={FadeIn.duration(MOTION.base)}
          layout={LinearTransition.springify().damping(MOTION.springSoft.damping)}
        >
          <Surface variant="quiet" lift style={{ marginTop: SPACE.lg, marginBottom: SPACE.sm }}>
            <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.lg }}>
              How much?
            </Text>
            {Array.from(selected.entries()).map(([type, severity]) => (
              <Severity
                key={type}
                label={SYMPTOMS[type].label}
                value={severity}
                onChange={(v) => setSeverity(type, v)}
              />
            ))}
          </Surface>
        </Animated.View>
      )}

      {/* ── Flow ────────────────────────────────────────────────────────── */}
      <Reveal index={groups.length}>
        <Surface variant="quiet" lift style={{ marginTop: SPACE.lg, marginBottom: SPACE.xl }}>
          <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.md }}>
            Flow
          </Text>
          <Text variant="caption" tone="tertiary" style={{ marginBottom: SPACE.lg }}>
            Leave this alone if today isn't a period day.
          </Text>
          <View style={styles.chips}>
            <Chip
              label="None"
              hue="lilac"
              selected={flow === 'none'}
              onPress={() => setFlow('none')}
            />
            {FLOWS.map((f) => (
              <Chip
                key={f}
                label={FLOW_INTENSITY[f].label}
                icon="drop"
                hue={FLOW_INTENSITY[f].hue as BloomHue}
                selected={flow === f}
                onPress={() => setFlow(f)}
              />
            ))}
          </View>
        </Surface>
      </Reveal>

      {/* Encouragement, not an empty state — this only shows before anything
          is picked, and it says what will happen rather than what is missing. */}
      {selected.size === 0 && flow === 'none' ? (
        <View style={styles.hint}>
          <Illustration name="petals" size={92} />
          <Text variant="caption" tone="tertiary" style={styles.hintText}>
            Whatever you log today makes tomorrow's prediction a little kinder.
          </Text>
        </View>
      ) : null}

      <Notice message={notice} />
      <Button label="Save" onPress={handleSave} accent={BLOOM.rose.ink} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  hint: { alignItems: 'center', marginBottom: SPACE.lg },
  hintText: { textAlign: 'center', maxWidth: 280, marginTop: SPACE.xs },
});

export default SymptomLoggerScreen;
