import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Icon from './Icon';
import { useNavHistory } from '../navigation/useNavHistory';
import { navigationRef } from '../navigation/navRef';
import { useTheme } from '../theme/useTheme';
import { MOTION, SPACE, MIN_TAP } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ArrowButton({
  dir,
  disabled,
  onPress,
}: {
  dir: 'back' | 'forward';
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors: c } = useTheme();
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.1 }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={dir === 'back' ? 'Go back' : 'Go forward'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => (press.value = withSpring(1, MOTION.springSnap))}
      onPressOut={() => (press.value = withSpring(0, MOTION.spring))}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[styles.btn, { backgroundColor: c.fill }, disabled && styles.disabled, style]}
    >
      <Icon
        name={dir === 'back' ? 'chevronLeft' : 'chevronRight'}
        size={17}
        color={c.textSecondary}
      />
    </AnimatedPressable>
  );
}

/**
 * Browser-style back/forward, floating over the top-left of every screen.
 * Screens reserve the top band for these via the Screen scaffold's header inset.
 */
const NavControls = () => {
  const insets = useSafeAreaInsets();
  const { canGoBack, canGoForward, goBack, goForward } = useNavHistory();

  // The store re-renders us on every nav change, so this read stays fresh.
  // Escapes are chromeless by design — no history arrows over the sand.
  const activeRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
  if (activeRoute === 'EscapePlayer') return null;

  return (
    <View style={[styles.wrap, { top: insets.top + SPACE.sm }]} pointerEvents="box-none">
      <ArrowButton dir="back" disabled={!canGoBack} onPress={goBack} />
      <ArrowButton dir="forward" disabled={!canGoForward} onPress={goForward} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACE.gutter,
    flexDirection: 'row',
    gap: SPACE.sm,
    zIndex: 50,
  },
  btn: {
    width: 32,
    height: 32,
    borderRadius: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.3 },
});

export default NavControls;
