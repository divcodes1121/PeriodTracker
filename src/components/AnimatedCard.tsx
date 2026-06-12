import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutDown,
  BounceInDown,
} from 'react-native-reanimated';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  animation?: 'fadeIn' | 'bounceIn' | 'slideIn';
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  delay = 0,
  animation = 'fadeIn',
}) => {
  const getAnimation = () => {
    switch (animation) {
      case 'bounceIn':
        return BounceInDown.delay(delay * 100);
      case 'slideIn':
        return FadeInUp.delay(delay * 100);
      case 'fadeIn':
      default:
        return FadeInUp.delay(delay * 100);
    }
  };

  return (
    <Animated.View
      style={[
        {
          backgroundColor: COLORS.white,
          borderRadius: BORDER_RADIUS.lg,
          padding: SPACING.md,
          ...SHADOWS.md,
        },
        style,
      ]}
      entering={getAnimation()}
      exiting={FadeOutDown}
    >
      {children}
    </Animated.View>
  );
};

export default AnimatedCard;
