import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Icon, { IconName } from '../components/Icon';
import Pill from '../components/Pill';
import Reveal from '../components/Reveal';
import { useTheme } from '../theme/useTheme';
import { ESCAPES, DURATIONS } from '../utils/tinyEscapes';
import { ESCAPE_PREVIEWS } from '../escapes/previews';
import { SPACE, RADIUS } from '../theme/tokens';

/**
 * Reset — the Tiny Escapes hub. Not a game tab: a quiet shelf of short,
 * objective-free experiences for heavy moments.
 *
 * Each card is a living miniature of its scene (see escapes/previews.tsx)
 * rather than an icon row — you choose an escape the way you'd choose a view,
 * not a menu item. Chrome ink flips per scene via `chrome` metadata.
 */
const ResetScreen = ({ navigation }: any) => {
  const { colors: c } = useTheme();
  const [sec, setSec] = useState(120);

  return (
    <Screen title="Reset" subtitle="Tiny escapes for heavy moments">
      <Reveal index={0}>
        <Text variant="overline" tone="secondary" style={styles.lenLabel}>
          How long
        </Text>
        <View style={styles.durations}>
          {DURATIONS.map((d) => (
            <Pill key={d.sec} label={d.label} selected={sec === d.sec} onPress={() => setSec(d.sec)} />
          ))}
        </View>
      </Reveal>

      {ESCAPES.map((e, i) => {
        const Preview = ESCAPE_PREVIEWS[e.id];
        // 'dark' chrome = light scene (zen sand) wanting ink text; the rest are
        // night scenes and take white.
        const inkChrome = e.chrome === 'dark';
        const fg = inkChrome ? '#4A3F30' : '#FFFFFF';
        const fgSoft = inkChrome ? 'rgba(74,63,48,0.72)' : 'rgba(255,255,255,0.78)';
        return (
          <Reveal key={e.id} index={i + 1}>
            <Surface
              padded={false}
              onPress={() => navigation.navigate('EscapePlayer', { escapeId: e.id, plannedSec: sec })}
              accessibilityLabel={e.title}
              accessibilityHint={e.tagline}
              style={styles.card}
            >
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {Preview ? <Preview /> : null}
              </View>

              {/* Legibility scrim behind the caption */}
              <LinearGradient
                pointerEvents="none"
                colors={
                  inkChrome
                    ? ['rgba(244,236,220,0)', 'rgba(240,229,207,0.85)']
                    : ['rgba(8,8,14,0)', 'rgba(8,8,14,0.55)']
                }
                style={styles.scrim}
              />

              <View style={styles.caption} pointerEvents="none">
                <Text variant="headline" color={fg}>
                  {e.title}
                </Text>
                <Text variant="caption" color={fgSoft} style={{ marginTop: 1 }}>
                  {e.tagline}
                </Text>
              </View>

              <View
                pointerEvents="none"
                style={[
                  styles.chip,
                  { backgroundColor: inkChrome ? 'rgba(74,63,48,0.12)' : 'rgba(255,255,255,0.18)' },
                ]}
              >
                <Icon name={e.icon as IconName} size={14} color={fg} />
              </View>
            </Surface>
          </Reveal>
        );
      })}

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
  lenLabel: { marginBottom: SPACE.md, marginLeft: SPACE.xs },
  durations: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.xl },
  card: {
    height: 156,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    marginBottom: SPACE.md,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 84,
  },
  caption: {
    position: 'absolute',
    left: SPACE.xl,
    right: SPACE.xl,
    bottom: SPACE.lg,
  },
  chip: {
    position: 'absolute',
    top: SPACE.md,
    right: SPACE.md,
    width: 30,
    height: 30,
    borderRadius: 15,
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
