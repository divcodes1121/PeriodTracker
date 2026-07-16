import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Surface from './Surface';
import Text from './Text';
import Icon, { IconName } from './Icon';
import Sparkline from './Sparkline';
import { useTheme } from '../theme/useTheme';
import { COLORS } from '../constants';
import { RADIUS, SPACE, MOTION } from '../theme/tokens';

export type InsightTone = 'prediction' | 'trend' | 'recommendation' | 'warning';

interface InsightCardProps {
  title: string;
  body: string;
  tone: InsightTone;
  tag: string;
  /** 0–1. Rendered as a confidence meter. */
  confidence?: number;
  /** Optional supporting series for the inline sparkline. */
  series?: number[];
  /** The "why AI thinks this" disclosure. */
  reasoning?: string;
  action?: string;
  onAction?: () => void;
  /** Adds the ambient AI glow — reserve for the lead card. */
  hero?: boolean;
  index?: number;
}

const toneMeta: Record<InsightTone, { icon: IconName; color: string; darkColor: string }> = {
  prediction: { icon: 'clock', color: COLORS.info, darkColor: '#5A7BBF' },
  trend: { icon: 'trend', color: COLORS.primary, darkColor: COLORS.primaryDark },
  recommendation: { icon: 'leaf', color: COLORS.success, darkColor: COLORS.successDark },
  warning: { icon: 'info', color: COLORS.warning, darkColor: COLORS.warningDark },
};

/**
 * The AI insight card — the hero surface of the app.
 *
 * Structure mirrors how a clinician would present a finding: what we observed,
 * how sure we are, the evidence, and what to do. The confidence meter and the
 * "why" line are what make the AI feel trustworthy rather than oracular, so
 * they're first-class, not decoration.
 */
const InsightCard = ({
  title,
  body,
  tone,
  tag,
  confidence,
  series,
  reasoning,
  action,
  onAction,
  hero = false,
  index = 0,
}: InsightCardProps) => {
  const { colors: c, isDark } = useTheme();
  const meta = toneMeta[tone];
  const accent = isDark ? meta.color : meta.darkColor;
  const glow = useSharedValue(0);
  const meter = useSharedValue(0);

  useEffect(() => {
    if (!hero) return;
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: MOTION.ambient, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: MOTION.ambient, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [hero, glow]);

  useEffect(() => {
    meter.value = withTiming(confidence ?? 0, {
      duration: MOTION.slow,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [confidence, meter]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + glow.value * 0.22,
  }));

  const meterStyle = useAnimatedStyle(() => ({
    width: `${meter.value * 100}%`,
  }));

  return (
    <View style={{ marginBottom: SPACE.lg }}>
      {/* Ambient AI glow — a soft aura bleeding from behind the card edge. */}
      {hero && (
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, { backgroundColor: meta.color }, glowStyle]}
        />
      )}

      <Surface elevation={hero ? 'md' : 'sm'}>
        <View style={styles.headRow}>
          <View style={[styles.badge, { backgroundColor: isDark ? c.fill : `${meta.color}1F` }]}>
            <Icon name={meta.icon} size={15} color={accent} />
            <Text variant="overline" color={accent}>
              {tag}
            </Text>
          </View>
        </View>

        <Text variant="title3" style={{ marginTop: SPACE.md }}>
          {title}
        </Text>
        <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.sm }}>
          {body}
        </Text>

        {series && series.length > 1 && (
          <View style={styles.chart}>
            <Sparkline data={series} color={meta.color} height={44} />
          </View>
        )}

        {confidence !== undefined && (
          <View style={styles.confidence}>
            <View style={styles.confidenceLabel}>
              <Text variant="overline" tone="tertiary">
                Confidence
              </Text>
              <Text variant="overline" color={accent} tabular>
                {Math.round(confidence * 100)}%
              </Text>
            </View>
            <View style={[styles.meterTrack, { backgroundColor: c.trackNeutral }]}>
              <Animated.View
                style={[styles.meterFill, { backgroundColor: meta.color }, meterStyle]}
              />
            </View>
          </View>
        )}

        {reasoning && (
          <View style={[styles.why, { borderTopColor: c.separator }]}>
            <Text variant="overline" tone="tertiary" style={{ marginBottom: SPACE.xs }}>
              Why this
            </Text>
            <Text variant="caption" tone="secondary">
              {reasoning}
            </Text>
          </View>
        )}

        {action && onAction && (
          <View style={{ marginTop: SPACE.lg }}>
            <Text variant="subhead" color={accent} onPress={onAction} accessibilityRole="button">
              {action} →
            </Text>
          </View>
        )}
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    left: SPACE.xl,
    right: SPACE.xl,
    top: SPACE.xxl,
    bottom: 0,
    borderRadius: RADIUS.card,
    // Large blur isn't available cross-platform; a soft scaled aura reads the
    // same and costs nothing on the raster path.
    transform: [{ scale: 1.04 }],
  },
  headRow: { flexDirection: 'row' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs + 2,
    borderRadius: RADIUS.pill,
  },
  chart: { marginTop: SPACE.lg },
  confidence: { marginTop: SPACE.lg },
  confidenceLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm,
  },
  meterTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 3 },
  why: {
    marginTop: SPACE.lg,
    paddingTop: SPACE.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default InsightCard;
