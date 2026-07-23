import { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Ellipse, G } from 'react-native-svg';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Text from './Text';
import Button from './Button';
import Illustration, { IllustrationName } from './Illustration';
import { useTheme } from '../theme/useTheme';
import { BLOOM } from '../constants';
import { MOTION, SPACE } from '../theme/tokens';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMPTY, ERROR AND LOADING — the three screens nobody designs.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A new user meets the empty state before they meet the product. Someone whose
 * request just failed meets the error state at their least patient. Both are
 * usually a centred grey sentence, and both are where an app either feels
 * cared-for or feels like a form.
 *
 * Bloomly's rule for all three: **never blame, never alarm, always offer the
 * next move.**
 *
 *   • Empty states say what *will* be here, not what isn't. "Your garden
 *     starts with one log" beats "No data available."
 *   • Error states apologise in one short line, then hand back a button. No
 *     red, no warning triangle, no error code in the user's face — a soft
 *     rainbow and a retry.
 *   • Loading is a bloom opening, not a spinner. A spinner measures *waiting*;
 *     a bloom measures *arriving*, and it is the same 800ms either way.
 */

// ───────────────────────────────────────────────────────────────────────────
// Empty
// ───────────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  illustration?: IllustrationName;
  title: string;
  /** One sentence. Says what will be here, never what is missing. */
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  illustration = 'sprout',
  title,
  body,
  actionLabel,
  onAction,
  compact = false,
  style,
}: EmptyStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(MOTION.base)}
      style={[styles.center, compact ? styles.compact : styles.roomy, style]}
    >
      <Illustration name={illustration} size={compact ? 108 : 150} />
      <Text variant={compact ? 'headline' : 'title3'} style={styles.title}>
        {title}
      </Text>
      {body ? (
        <Text variant="callout" tone="secondary" style={styles.body}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: SPACE.xl }}>
          <Button label={actionLabel} onPress={onAction} variant="primary" fullWidth={false} />
        </View>
      ) : null}
    </Animated.View>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Error
// ───────────────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Deliberately not red and deliberately not a triangle.
 *
 * Red is reserved in this app for exactly one thing: destructive confirmation.
 * Spending it on "the network hiccuped" means it carries no weight left when
 * someone is about to erase their cycle history.
 */
export function ErrorState({
  title = 'That didn’t go through',
  body = 'Nothing was lost. Give it another try in a moment.',
  onRetry,
  retryLabel = 'Try again',
  style,
}: ErrorStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(MOTION.base)}
      style={[styles.center, styles.roomy, style]}
      accessibilityRole="alert"
    >
      <Illustration name="rainbow" size={140} />
      <Text variant="title3" style={styles.title}>
        {title}
      </Text>
      <Text variant="callout" tone="secondary" style={styles.body}>
        {body}
      </Text>
      {onRetry ? (
        <View style={{ marginTop: SPACE.xl }}>
          <Button label={retryLabel} onPress={onRetry} variant="secondary" fullWidth={false} />
        </View>
      ) : null}
    </Animated.View>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Loading
// ───────────────────────────────────────────────────────────────────────────

/**
 * A flower opening and closing on a slow loop.
 *
 * Petals scale on a stagger derived from index, so the bloom *rolls* open
 * rather than popping — the same trick as the Bloom Ring, at a size where only
 * the rhythm survives. Five nodes, unmounted the moment content arrives.
 */
export function BloomLoader({ size = 56, hue }: { size?: number; hue?: string }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 0.6 : 0);
  const fill = hue ?? BLOOM.rose.pastel;

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0.25, { duration: 900, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(t);
  }, [reduced, t]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.72 + t.value * 0.28 }, { rotate: `${t.value * 40}deg` }],
    opacity: 0.55 + t.value * 0.45,
  }));

  return (
    <Animated.View
      style={[{ width: size, height: size }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <G transform="translate(50 50)">
          {Array.from({ length: 5 }, (_, i) => (
            <Ellipse
              key={i}
              cx={0}
              cy={-26}
              rx={13}
              ry={24}
              fill={fill}
              opacity={0.55 + i * 0.09}
              transform={`rotate(${i * 72})`}
            />
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}

/** Full-page loading. Used by Home before hydration and by any async screen. */
export function LoadingState({ label = 'One moment' }: { label?: string }) {
  return (
    <View style={[styles.center, styles.fill]}>
      <BloomLoader size={64} />
      <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.lg }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Shimmer placeholder for content that has a known shape.
 *
 * Preferred over a spinner wherever the layout is predictable, because it
 * keeps the page from reflowing when data lands — the jump is more annoying
 * than the wait.
 */
export function Shimmer({
  height = 20,
  width = '100%',
  radius = 10,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: c } = useTheme();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 780, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 780, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(t);
  }, [reduced, t]);

  const anim = useAnimatedStyle(() => ({ opacity: 0.45 + t.value * 0.4 }));

  return (
    <Animated.View
      style={[{ height, width, borderRadius: radius, backgroundColor: c.fill }, anim, style]}
    />
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  roomy: { paddingVertical: SPACE.h2, paddingHorizontal: SPACE.xl },
  compact: { paddingVertical: SPACE.xl, paddingHorizontal: SPACE.lg },
  title: { marginTop: SPACE.lg, textAlign: 'center' },
  body: { marginTop: SPACE.sm, textAlign: 'center', maxWidth: 300 },
});
