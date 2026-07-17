import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Icon, { IconName } from '../components/Icon';
import Pill from '../components/Pill';
import Reveal from '../components/Reveal';
import { useTheme } from '../theme/useTheme';
import { inkFor } from '../constants';
import { ESCAPES, DURATIONS } from '../utils/tinyEscapes';
import { SPACE, RADIUS } from '../theme/tokens';

/**
 * Reset — the Tiny Escapes hub. Not a game tab: a quiet shelf of short,
 * objective-free experiences for heavy moments. One duration control, one
 * card per escape, and a plain statement of the privacy promise.
 */
const ResetScreen = ({ navigation }: any) => {
  const { colors: c, isDark } = useTheme();
  const [sec, setSec] = useState(120);

  return (
    <Screen title="Reset" subtitle="Tiny escapes for heavy moments">
      <Reveal index={0}>
        <View style={styles.durations}>
          {DURATIONS.map((d) => (
            <Pill key={d.sec} label={d.label} selected={sec === d.sec} onPress={() => setSec(d.sec)} />
          ))}
        </View>
      </Reveal>

      {ESCAPES.map((e, i) => (
        <Reveal key={e.id} index={i + 1}>
          <Surface
            onPress={() => navigation.navigate('EscapePlayer', { escapeId: e.id, plannedSec: sec })}
            accessibilityLabel={e.title}
            accessibilityHint={e.tagline}
            style={{ marginBottom: SPACE.md }}
          >
            <View style={styles.row}>
              <View style={[styles.tile, { backgroundColor: isDark ? c.fill : `${e.accent}1F` }]}>
                <Icon name={e.icon as IconName} size={19} color={isDark ? e.accent : inkFor(e.accent)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">{e.title}</Text>
                <Text variant="caption" tone="secondary" style={{ marginTop: 1 }}>
                  {e.tagline}
                </Text>
              </View>
              <Icon name="chevronRight" size={17} color={c.textTertiary} />
            </View>
          </Surface>
        </Reveal>
      ))}

      <Reveal index={ESCAPES.length + 1}>
        <View style={styles.note}>
          <Icon name="lock" size={14} color={c.textTertiary} />
          <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
            No scores, no streaks, no ads. What you do here stays on this device.
          </Text>
        </View>
      </Reveal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  durations: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  tile: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginTop: SPACE.lg,
    paddingHorizontal: SPACE.xs,
  },
});

export default ResetScreen;
