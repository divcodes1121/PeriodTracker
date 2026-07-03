import React, { useEffect } from 'react';
import { Text, StyleSheet, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface EmojiChipProps {
  emoji: string;
  size?: number;
  colors?: [string, string];
  float?: boolean;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A glossy circular badge that gives a flat OS emoji a soft 3D presence:
 * gradient fill, top highlight, drop shadow, and an optional gentle float.
 */
const EmojiChip: React.FC<EmojiChipProps> = ({
  emoji,
  size = 52,
  colors = ['#FFFFFF', '#FFE3EF'],
  float = false,
  delay = 0,
  style,
}) => {
  const bob = useSharedValue(0);

  useEffect(() => {
    if (!float) return;
    bob.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, [bob, float, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bob.value * 5 }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <View
        style={[
          styles.chip,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            shadowRadius: size * 0.2,
          },
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Glossy top highlight */}
        <View
          style={[
            styles.gloss,
            { height: size * 0.5, borderTopLeftRadius: size / 2, borderTopRightRadius: size / 2 },
          ]}
        />
        <Text style={[styles.emoji, { fontSize: size * 0.5 }]}>{emoji}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...Platform.select({
      android: { elevation: 5 },
      default: {
        shadowColor: '#E6467F',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
      },
    }),
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  emoji: {
    ...Platform.select({
      default: {
        textShadowColor: 'rgba(0,0,0,0.18)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
    }),
  },
});

export default EmojiChip;
