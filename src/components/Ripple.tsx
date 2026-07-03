import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface RippleProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  rippleColor?: string;
  borderRadius?: number;
  haptic?: boolean;
  disabled?: boolean;
}

/**
 * Tappable surface with a material-style expanding ripple from the touch
 * point, a springy press-scale, and optional haptic feedback. Works on
 * iOS, Android, and web.
 */
const Ripple: React.FC<RippleProps> = ({
  children,
  onPress,
  style,
  rippleColor = 'rgba(255,107,157,0.28)',
  borderRadius = 20,
  haptic = true,
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);

  const fireHaptic = () => {
    if (haptic) Haptics.selectionAsync().catch(() => {});
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    rx.value = e.nativeEvent.locationX;
    ry.value = e.nativeEvent.locationY;
    rippleScale.value = 0;
    rippleOpacity.value = 0.5;
    rippleScale.value = withTiming(1, { duration: 480 });
    rippleOpacity.value = withTiming(0, { duration: 480 });
    scale.value = withSpring(0.96, { damping: 14, stiffness: 220 }, () => {
      runOnJS(fireHaptic)();
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [
      { translateX: rx.value - 150 },
      { translateY: ry.value - 150 },
      { scale: rippleScale.value },
    ],
  }));

  return (
    <Animated.View style={[containerStyle, style, { borderRadius, overflow: 'hidden' }]}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
        <View style={styles.inner}>
          {children}
          <Animated.View
            pointerEvents="none"
            style={[styles.ripple, { backgroundColor: rippleColor }, rippleStyle]}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  inner: { position: 'relative' },
  ripple: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: 0,
    left: 0,
  },
});

export default Ripple;
