import React from 'react';
import { View, StyleSheet, ViewStyle, Platform, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, SPACING, BORDER_RADIUS, GLASS } from '../constants';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark';
  padded?: boolean;
}

/**
 * Frosted-glass surface. Uses a real backdrop blur (BlurView) on iOS/Android
 * and web (via CSS backdrop-filter), layered under a translucent tint plus a
 * bright top-edge highlight so it reads as glass on any background.
 */
const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = GLASS.intensity,
  tint = 'light',
  padded = true,
}) => {
  const tintColor = tint === 'dark' ? GLASS.tintDark : GLASS.tint;

  return (
    <View style={[styles.wrapper, style]}>
      <BlurView
        intensity={intensity}
        tint={tint === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      {/* Tint + highlight overlay sits above the blur for consistent color */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tintColor }]} />
      <View style={styles.topHighlight} />
      <View style={padded ? styles.content : undefined}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.border,
    // Soft floating shadow. Elevation for Android, shadow* for iOS/web.
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: COLORS.primaryDark,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
    }),
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: GLASS.highlight,
    opacity: 0.7,
  },
  content: {
    padding: SPACING.lg,
  },
});

export default GlassCard;
