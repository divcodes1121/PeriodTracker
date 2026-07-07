import React, { useEffect } from 'react';
import { Text, StyleSheet, View, ViewStyle, StyleProp, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Directions the droplets fly on burst.
const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

interface EmojiChipProps {
  emoji: string;
  size?: number;
  colors?: [string, string];
  float?: boolean;
  delay?: number;
  onPress?: () => void;
  /** Increment to fire a burst externally (e.g. when a tab becomes active). */
  trigger?: number;
  /** Faded + non-interactive (no burst, no press). */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/* One droplet that flies outward and fades as the bubble bursts. */
const Droplet: React.FC<{ angle: number; burst: SharedValue<number>; size: number }> = ({
  angle,
  burst,
  size,
}) => {
  const rad = (angle * Math.PI) / 180;
  const dist = size * 0.85;
  const dot = Math.max(4, size * 0.12);

  const style = useAnimatedStyle(() => {
    // start at the bubble rim, fly outward — so droplets never cover the emoji
    const reach = interpolate(burst.value, [0, 1], [0.5, 1.2]);
    return {
      opacity: interpolate(burst.value, [0, 0.2, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(rad) * dist * reach },
        { translateY: Math.sin(rad) * dist * reach },
        { scale: interpolate(burst.value, [0, 1], [1, 0.4]) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.6)',
        },
        style,
      ]}
    />
  );
};

/* Expanding ring shockwave on burst. */
const Ring: React.FC<{ burst: SharedValue<number>; size: number }> = ({ burst, size }) => {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.1, 1], [0, 0.8, 0]),
    transform: [{ scale: interpolate(burst.value, [0, 1], [0.6, 2]) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.85)',
        },
        style,
      ]}
    />
  );
};

/**
 * A translucent water-bubble that carries an emoji: glassy tint, specular
 * highlights, and a light rim. On tap it "bursts" — an expanding ring plus
 * droplets scatter — then the bubble reforms with a springy pop. Shared by
 * every icon so the interaction is uniform across the app.
 */
const EmojiChip: React.FC<EmojiChipProps> = ({
  emoji,
  size = 52,
  colors = ['#FFFFFF', '#FFE3EF'],
  float = false,
  delay = 0,
  onPress,
  trigger = 0,
  disabled = false,
  style,
}) => {
  const bob = useSharedValue(0);
  const pop = useSharedValue(1);
  const burst = useSharedValue(0);

  const runBurst = () => {
    burst.value = 0;
    burst.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.quad) });
    pop.value = withSequence(
      withTiming(1.22, { duration: 110, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 7, stiffness: 220, mass: 0.6 })
    );
  };

  useEffect(() => {
    if (!float) return;
    bob.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, [bob, float, delay]);

  // Fire a burst when the external trigger changes (skip the initial 0).
  useEffect(() => {
    if (trigger > 0) runBurst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bob.value * 5 }],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    // brief translucency flash at the peak of the burst
    opacity: interpolate(burst.value, [0, 0.15, 0.4, 1], [1, 0.65, 1, 1]),
  }));

  const doBurst = () => {
    runBurst();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Let the burst play before running any navigation so it's actually seen.
    if (onPress) setTimeout(onPress, 240);
  };

  const spec = size * 0.32;

  const content = (
    <>
      {/* Bubble body */}
      <Animated.View
        style={[styles.body, { width: size, height: size, borderRadius: size / 2 }, bodyStyle]}
      >
        {/* glassy base */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.30)' }]} />
        {/* colored tint */}
        <LinearGradient
          colors={colors}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.85, y: 1 }}
          style={[StyleSheet.absoluteFill, { opacity: 0.45 }]}
        />
        {/* big soft specular highlight */}
        <View
          style={{
            position: 'absolute',
            top: size * 0.1,
            left: size * 0.16,
            width: spec,
            height: spec * 0.8,
            borderRadius: spec,
            backgroundColor: 'rgba(255,255,255,0.75)',
            transform: [{ rotate: '-20deg' }],
          }}
        />
        {/* tiny sparkle */}
        <View
          style={{
            position: 'absolute',
            top: size * 0.24,
            left: size * 0.42,
            width: size * 0.08,
            height: size * 0.08,
            borderRadius: size * 0.04,
            backgroundColor: 'rgba(255,255,255,0.95)',
          }}
        />
        {/* bottom rim glow */}
        <View
          style={{
            position: 'absolute',
            bottom: size * 0.06,
            alignSelf: 'center',
            width: size * 0.6,
            height: size * 0.22,
            borderRadius: size,
            backgroundColor: 'rgba(255,255,255,0.22)',
          }}
        />
        <Text style={[styles.emoji, { fontSize: size * 0.46 }]}>{emoji}</Text>
      </Animated.View>

      {/* Burst overlay on top so the ring + droplets read clearly */}
      <View style={styles.burstLayer} pointerEvents="none">
        <Ring burst={burst} size={size} />
        {PARTICLE_ANGLES.map((a) => (
          <Droplet key={a} angle={a} burst={burst} size={size} />
        ))}
      </View>
    </>
  );

  if (onPress && !disabled) {
    return (
      <AnimatedPressable onPress={doBurst} style={[styles.wrapper, wrapperStyle, style]}>
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[styles.wrapper, wrapperStyle, disabled && styles.disabled, style]}>
      {content}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.32,
  },
  burstLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  emoji: {
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default EmojiChip;
