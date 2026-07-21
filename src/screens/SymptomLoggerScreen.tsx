import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { v4 as uuidv4 } from 'uuid';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Button from '../components/Button';
import Pill from '../components/Pill';
import Reveal from '../components/Reveal';
import Notice from '../components/Notice';
import Severity from '../components/Severity';
import { IconName } from '../components/Icon';
import { useAppStore } from '../store/appStore';
import { SymptomType, Symptom, SymptomLog } from '../types';
import { SYMPTOMS, FLOW_INTENSITY, COLORS } from '../constants';
import { SPACE, MOTION } from '../theme/tokens';

/** Icon per symptom — replaces the duplicate-emoji set (cramps and headache
 *  both used 🤕, which made the grid unreadable at a glance). */
const SYMPTOM_ICON: Record<SymptomType, IconName> = {
  cramps: 'flame',
  headache: 'activity',
  fatigue: 'moon',
  bloating: 'drop',
  acne: 'sun',
  nausea: 'water',
  backpain: 'activity',
  anxiety: 'heart',
  mood_swings: 'trend',
  cravings: 'leaf',
};

const FLOWS = ['light', 'medium', 'heavy'] as const;

const SymptomLoggerScreen = ({ navigation }: any) => {
  const { user, upsertSymptomLog } = useAppStore();
  const [selected, setSelected] = useState<Map<SymptomType, number>>(new Map());
  const [flow, setFlow] = useState<'light' | 'medium' | 'heavy'>('medium');
  /** Inline, because Alert.alert is a no-op on web — see components/Notice. */
  const [notice, setNotice] = useState<string | null>(null);

  const keys = Object.keys(SYMPTOMS) as SymptomType[];

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
      setNotice('Choose at least one symptom to log.');
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    navigation.goBack();
  };

  return (
    <Screen title="Symptoms" subtitle="How is your body feeling today?">
      {/* Symptom pills */}
      <Reveal index={0}>
        <Surface variant="hero" style={{ marginBottom: SPACE.sm }}>
          <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.lg }}>
            Select what applies
          </Text>
          <View style={styles.pills}>
            {keys.map((k) => (
              <Pill
                key={k}
                label={SYMPTOMS[k].label}
                icon={SYMPTOM_ICON[k]}
                selected={selected.has(k)}
                onPress={() => toggle(k)}
              />
            ))}
          </View>
        </Surface>
      </Reveal>

      {/* Severity — only for what was actually selected */}
      {selected.size > 0 && (
        <Animated.View
          entering={FadeIn.duration(MOTION.base)}
          layout={LinearTransition.springify().damping(MOTION.springSoft.damping)}
        >
          <Surface variant="quiet" lift style={{ marginBottom: SPACE.sm }}>
            <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.lg }}>
              How intense?
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

      {/* Flow */}
      <Reveal index={1}>
        <Surface variant="quiet" lift style={{ marginBottom: SPACE.xl }}>
          <Text variant="overline" tone="secondary" style={{ marginBottom: SPACE.lg }}>
            Flow
          </Text>
          <View style={styles.pills}>
            {FLOWS.map((f) => (
              <Pill
                key={f}
                label={FLOW_INTENSITY[f].label}
                icon="drop"
                selected={flow === f}
                onPress={() => setFlow(f)}
                accent={COLORS.menstrual}
              />
            ))}
          </View>
        </Surface>
      </Reveal>

      <Notice message={notice} />
      <Button label="Save symptoms" onPress={handleSave} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
});

export default SymptomLoggerScreen;
