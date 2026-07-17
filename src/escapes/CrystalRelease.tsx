import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon, Path, Ellipse } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import Text from '../components/Text';

/**
 * Shatter — tap a crystal until it breaks. The anger-release escape.
 *
 * Rhythm: two taps crack it (light → medium haptic, a shiver, crack lines
 * deepen), the third shatters it — shards and sparks fly with a heavy haptic
 * double-hit and a brief flash, then the next crystal grows in as a new
 * material. The three-beat build-up is what makes the release land; a
 * one-tap explode would be noise.
 */

const CAVE = ['#221A31', '#191426', '#100D18'] as const;

const MATERIALS = [
  { name: 'Rose Quartz', hi: '#F0C9D8', mid: '#D97C9B', lo: '#A84A6B' },
  { name: 'Amethyst', hi: '#D8C6F0', mid: '#B89AD8', lo: '#6F4E96' },
  { name: 'Glacier', hi: '#DCEEF6', mid: '#9CC5D8', lo: '#5E8CA3' },
  { name: 'Citrine', hi: '#F6E0AE', mid: '#E0B25E', lo: '#A87A22' },
];

const CW = 150;
const CH = 200;
const SHARD_COUNT = 12;
const SPARK_COUNT = 8;

interface Shard {
  dx: number;
  dy: number;
  rot: number;
  size: number;
  tone: string;
}

/** One burst of shards + sparks; a single progress value drives everything. */
const Burst = memo(function Burst({ shards, sparkColor }: { shards: Shard[]; sparkColor: string }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(1, { duration: 680, easing: Easing.out(Easing.quad) });
  }, [p]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {shards.map((s, i) => (
        <ShardView key={i} shard={s} p={p} />
      ))}
      {Array.from({ length: SPARK_COUNT }).map((_, i) => {
        const a = (i / SPARK_COUNT) * Math.PI * 2 + 0.4;
        return <Spark key={i} angle={a} p={p} color={sparkColor} />;
      })}
    </View>
  );
});

const ShardView = memo(function ShardView({ shard, p }: { shard: Shard; p: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value * 0.95,
    transform: [
      { translateX: shard.dx * p.value },
      { translateY: shard.dy * p.value + 70 * p.value * p.value },
      { rotate: `${shard.rot * p.value}deg` },
      { scale: 1 - p.value * 0.25 },
    ],
  }));
  const s = shard.size;
  return (
    <Animated.View style={[styles.center, style]}>
      <Svg width={s} height={s} viewBox="0 0 20 20">
        <Polygon points="10,0 20,14 3,18" fill={shard.tone} opacity={0.95} />
      </Svg>
    </Animated.View>
  );
});

const Spark = memo(function Spark({ angle, p, color }: { angle: number; p: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const q = Math.min(p.value * 1.5, 1);
    return {
      opacity: 1 - q,
      transform: [
        { translateX: Math.cos(angle) * 120 * q },
        { translateY: Math.sin(angle) * 110 * q },
      ],
    };
  });
  return <Animated.View style={[styles.center, styles.spark, { backgroundColor: color }, style]} />;
});

const CrystalRelease = () => {
  const { width: W, height: H } = useWindowDimensions();
  const [gen, setGen] = useState(0);
  const [crack, setCrack] = useState(0);
  const [burst, setBurst] = useState<{ id: number; shards: Shard[] } | null>(null);
  const bursting = useRef(false);
  const burstId = useRef(1);

  const material = MATERIALS[gen % MATERIALS.length];

  const shake = useSharedValue(0);
  const pulse = useSharedValue(1);
  const flash = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 3600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [glow]);

  const makeShards = useCallback((): Shard[] => {
    const tones = [material.hi, material.mid, material.lo];
    return Array.from({ length: SHARD_COUNT }, (_, i) => {
      const a = (i / SHARD_COUNT) * Math.PI * 2 + Math.random() * 0.5;
      const d = 90 + Math.random() * 110;
      return {
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d * 0.85 - 30,
        rot: 140 + Math.random() * 420,
        size: 12 + Math.random() * 16,
        tone: tones[i % 3],
      };
    });
  }, [material]);

  const onTap = useCallback(() => {
    if (bursting.current) return;
    shake.value = withSequence(
      withTiming(-2.5, { duration: 40 }),
      withTiming(2.5, { duration: 70 }),
      withTiming(0, { duration: 130 })
    );

    if (crack < 2) {
      Haptics.impactAsync(
        crack === 0 ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
      ).catch(() => {});
      pulse.value = withSequence(withTiming(0.985, { duration: 60 }), withSpring(1, { damping: 12 }));
      setCrack((c) => c + 1);
      return;
    }

    // Third hit — the release.
    bursting.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 90);
    flash.value = 0.32;
    flash.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) });
    setBurst({ id: burstId.current++, shards: makeShards() });
    setCrack(0);
    setGen((g) => g + 1);
    setTimeout(() => {
      setBurst(null);
      bursting.current = false;
    }, 760);
  }, [crack, makeShards, shake, pulse, flash]);

  const crystalStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shake.value}deg` }, { scale: pulse.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + glow.value * 0.1,
    transform: [{ scale: 0.94 + glow.value * 0.08 }],
  }));

  const cx = W / 2;
  const cy = H * 0.44;

  return (
    <View style={styles.root}>
      <LinearGradient colors={CAVE} style={StyleSheet.absoluteFill} />

      {/* Ambient glow behind the crystal */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { left: cx - 150, top: cy - 150, backgroundColor: material.mid },
          glowStyle,
        ]}
      />

      {/* Ground shadow */}
      <Svg
        pointerEvents="none"
        width={W}
        height={60}
        style={{ position: 'absolute', top: cy + CH / 2 - 14 }}
      >
        <Ellipse cx={cx} cy={30} rx={86} ry={16} fill="rgba(0,0,0,0.4)" />
      </Svg>

      {/* Crystal — keyed by generation so each new one grows in */}
      <View style={{ position: 'absolute', left: cx - CW / 2, top: cy - CH / 2 }}>
        <Animated.View key={gen} entering={ZoomIn.delay(180).springify().damping(13)}>
          <Pressable accessibilityRole="button" accessibilityLabel="Tap the crystal" onPress={onTap} hitSlop={24}>
            <Animated.View style={crystalStyle}>
              <Svg width={CW} height={CH} viewBox="0 0 140 190">
                <Polygon points="70,8 18,62 70,84" fill={material.hi} />
                <Polygon points="70,8 122,62 70,84" fill={material.mid} />
                <Polygon points="18,62 70,84 42,182" fill={material.lo} opacity={0.82} />
                <Polygon points="122,62 70,84 98,182" fill={material.lo} />
                <Polygon points="70,84 42,182 98,182" fill={material.mid} opacity={0.9} />
                {crack >= 1 && (
                  <Path
                    d="M62 40 L74 66 L58 94 L72 122"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={1.6}
                    fill="none"
                    strokeLinecap="round"
                  />
                )}
                {crack >= 2 && (
                  <Path
                    d="M90 56 L76 84 L92 118 L80 146 M52 70 L44 96"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth={1.4}
                    fill="none"
                    strokeLinecap="round"
                  />
                )}
              </Svg>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>

      {/* Shards fly from the crystal's heart */}
      {burst && (
        <View pointerEvents="none" style={{ position: 'absolute', left: cx, top: cy }}>
          <Burst key={burst.id} shards={burst.shards} sparkColor={material.hi} />
        </View>
      )}

      {/* Material name — quiet, grounding */}
      <View style={[styles.label, { top: cy + CH / 2 + 46 }]} pointerEvents="none">
        <Text variant="overline" color="rgba(255,255,255,0.45)">
          {material.name}
        </Text>
      </View>

      {/* Shatter flash */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  center: { position: 'absolute', left: -10, top: -10 },
  spark: { width: 4, height: 4, borderRadius: 2 },
  label: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  flash: { backgroundColor: '#FFFFFF' },
});

export default CrystalRelease;
