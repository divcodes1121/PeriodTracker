import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  shadow?: 'sm' | 'md' | 'lg' | 'none';
  borderRadius?: number;
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  shadow = 'md',
  borderRadius = BORDER_RADIUS.lg,
}) => {
  const shadowStyle = shadow === 'none' ? {} : SHADOWS[shadow];

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius,
          ...shadowStyle,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
  },
});

export default Card;
