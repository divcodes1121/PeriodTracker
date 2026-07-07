import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useNavHistory } from '../navigation/useNavHistory';
import { useTheme } from '../theme/useTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Thin line arrows, drawn on a 24×24 grid with round caps/joins.
const PATHS = {
  back: 'M20 12 H6 M12 6 L6 12 L12 18',
  forward: 'M4 12 H18 M12 6 L18 12 L12 18',
};

interface ArrowButtonProps {
  dir: 'back' | 'forward';
  disabled: boolean;
  onPress: () => void;
  bg: string;
  border: string;
}

const ArrowButton: React.FC<ArrowButtonProps> = ({ dir, disabled, onPress, bg, border }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      onPressIn={() => (scale.value = withSpring(0.88, { damping: 14, stiffness: 260 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 12, stiffness: 220 }))}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: border },
        disabled && styles.disabled,
        animatedStyle,
      ]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path
          d={PATHS[dir]}
          stroke="#FFFFFF"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </AnimatedPressable>
  );
};

/**
 * Slim back / forward line-arrow controls, pinned top-left below the status
 * bar. White arrows on a translucent chip so they read on any background;
 * each greys out when there's no page in that direction.
 */
const NavControls: React.FC = () => {
  const { canGoBack, canGoForward, goBack, goForward } = useNavHistory();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Chip tint kept dark enough that the white arrow reads in both themes.
  const bg = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(30,16,32,0.30)';
  const border = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.35)';

  return (
    <View style={[styles.wrap, { top: insets.top + 6 }]} pointerEvents="box-none">
      <ArrowButton dir="back" disabled={!canGoBack} onPress={goBack} bg={bg} border={border} />
      <ArrowButton dir="forward" disabled={!canGoForward} onPress={goForward} bg={bg} border={border} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.32,
  },
});

export default NavControls;
