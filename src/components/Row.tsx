import { ReactNode } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Text from './Text';
import Icon, { IconName } from './Icon';
import { useTheme } from '../theme/useTheme';
import { SPACE, RADIUS, MIN_TAP } from '../theme/tokens';

interface RowProps {
  label: string;
  description?: string;
  icon?: IconName;
  iconTint?: string;
  /** Right-hand content: a Toggle, a value, etc. */
  accessory?: ReactNode;
  /** Shows a chevron and makes the row tappable. */
  onPress?: () => void;
  value?: string;
  destructive?: boolean;
  last?: boolean;
}

/**
 * Grouped-list row, iOS Settings style.
 *
 * The leading icon sits in a soft tinted tile — the detail that makes a settings
 * list read as designed rather than generated. Rows own their own separator and
 * inset it past the icon, so a group needs no divider bookkeeping.
 */
const Row = ({
  label,
  description,
  icon,
  iconTint,
  accessory,
  onPress,
  value,
  destructive,
  last,
}: RowProps) => {
  const { colors: c, isDark } = useTheme();
  const tint = iconTint ?? c.textSecondary;

  const content = (
    <View style={styles.row}>
      {icon && (
        <View style={[styles.iconTile, { backgroundColor: isDark ? c.fill : `${tint}1A` }]}>
          <Icon name={icon} size={17} color={tint} />
        </View>
      )}

      <View style={styles.labels}>
        <Text variant="body" color={destructive ? '#C4566E' : undefined}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" tone="tertiary" style={{ marginTop: 1 }}>
            {description}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text variant="callout" tone="tertiary">
          {value}
        </Text>
      ) : null}
      {accessory}
      {onPress && !accessory ? <Icon name="chevronRight" size={17} color={c.textTertiary} /> : null}
    </View>
  );

  return (
    <View>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          android_ripple={{ color: c.fill }}
          onPress={onPress}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
      {!last && (
        <View
          style={[
            styles.sep,
            { backgroundColor: c.separator, marginLeft: icon ? 30 + SPACE.md : 0 },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    minHeight: MIN_TAP + 6,
    paddingVertical: SPACE.sm,
  },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labels: { flex: 1 },
  sep: { height: StyleSheet.hairlineWidth },
});

export default Row;
