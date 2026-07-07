import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { SPACING, BORDER_RADIUS, GLASS } from '../constants';
import { useTheme } from '../theme/useTheme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  padded?: boolean;
}

/**
 * Frosted-glass surface. Real backdrop blur (BlurView) plus a theme-aware
 * translucent tint and a bright top-edge highlight so it reads as glass on
 * any background, light or dark. No drop shadow — the border defines the edge.
 */
const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = GLASS.intensity,
  padded = true,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrapper, { borderColor: colors.glassBorder }, style]}>
      <BlurView intensity={intensity} tint={colors.blurTint} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassTint }]} />
      <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} />
      <View style={padded ? styles.content : undefined}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.7,
  },
  content: {
    padding: SPACING.lg,
  },
});

export default GlassCard;
