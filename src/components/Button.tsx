import React from 'react';
import { TouchableOpacity, Text, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const Button = React.forwardRef<any, ButtonProps>(
  (
    {
      title,
      onPress,
      variant = 'primary',
      size = 'medium',
      disabled = false,
      loading = false,
      style,
    },
    ref
  ) => {
    const getContainerStyle = () => {
      const baseStyle = {
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      };

      const variantStyles = {
        primary: {
          backgroundColor: COLORS.primary,
        },
        secondary: {
          backgroundColor: COLORS.secondary,
        },
        outline: {
          backgroundColor: COLORS.transparent,
          borderWidth: 2,
          borderColor: COLORS.primary,
        },
        ghost: {
          backgroundColor: COLORS.transparent,
        },
      };

      const sizeStyles = {
        small: {
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
        },
        medium: {
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
        },
        large: {
          paddingHorizontal: SPACING.xl,
          paddingVertical: SPACING.lg,
        },
      };

      return [
        baseStyle,
        variantStyles[variant],
        sizeStyles[size],
        disabled && { opacity: 0.5 },
      ];
    };

    const getTextStyle = () => {
      const baseTextStyle = {
        ...TYPOGRAPHY.button,
      };

      const variantTextColors = {
        primary: COLORS.white,
        secondary: COLORS.white,
        outline: COLORS.primary,
        ghost: COLORS.primary,
      };

      return {
        ...baseTextStyle,
        color: variantTextColors[variant],
      };
    };

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onPress}
        disabled={disabled || loading}
        style={[getContainerStyle(), style]}
        activeOpacity={0.7}
      >
        <Text style={getTextStyle()}>{loading ? 'Loading...' : title}</Text>
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

export default Button;
