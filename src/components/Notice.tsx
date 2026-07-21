import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Text from './Text';
import Icon, { IconName } from './Icon';
import { COLORS } from '../constants';
import { SPACE, RADIUS, MOTION } from '../theme/tokens';

export type NoticeTone = 'error' | 'warning' | 'info' | 'success';

interface NoticeProps {
  /** Null or empty renders nothing, so callers can pass state directly. */
  message: string | null;
  tone?: NoticeTone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

/**
 * Inline feedback banner.
 *
 * This exists because `Alert.alert` is a **no-op on RN-web**, which silently
 * broke real functionality: validation guards returned early with no visible
 * explanation, and button-array confirms meant destructive actions could not be
 * completed at all. Anything the user must see or act on therefore renders in
 * the tree rather than going through the platform Alert.
 *
 * Alert is still fine for fire-and-forget native niceties, but it must never be
 * the only channel for information the user needs.
 */
const TONES: Record<NoticeTone, { color: string; icon: IconName }> = {
  error: { color: COLORS.error, icon: 'info' },
  warning: { color: COLORS.warningDark, icon: 'info' },
  info: { color: COLORS.info, icon: 'info' },
  success: { color: COLORS.successDark, icon: 'check' },
};

const Notice = ({ message, tone = 'error', icon, style }: NoticeProps) => {
  if (!message) return null;
  const t = TONES[tone];

  return (
    <Animated.View
      entering={FadeIn.duration(MOTION.fast)}
      exiting={FadeOut.duration(MOTION.instant)}
      // Announced by screen readers the moment it appears — the whole point is
      // that this replaces a modal the user would otherwise have been told about.
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.root, { backgroundColor: `${t.color}14` }, style]}
    >
      <Icon name={icon ?? t.icon} size={16} color={t.color} />
      <Text variant="caption" color={t.color} style={styles.text}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    padding: SPACE.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACE.md,
  },
  text: { flex: 1 },
});

export default Notice;
