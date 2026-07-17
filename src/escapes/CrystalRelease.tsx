import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedProps,
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
 * Rhythm: two taps crack it (light → medium haptic, a shiver, glowing crack
 * lines deepen and shed debris), the third shatters it — shards and sparks
 * fly with a heavy haptic double-hit, a flash, and a small screen shake; the
 * crystals growing at the cave floor pulse in answer. Then the next crystal
 * grows in as a new material. The three-beat build-up is what makes the
 * release land; a one-tap explode would be noise.
 *
 * The crystal itself is faceted with real gradients and a shine that sweeps
 * across it every few seconds — it should look worth breaking.
 */

const CAVE = ['#241C34', '#191426', '#100D18'] as const;

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

const ARect = Animated.createAnimatedComponent(Rect);

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

/** A few chips fall from the impact point on each crack. */
const CrackDebris = memo(function CrackDebris({ tone }: { tone: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 560, easing: Easing.in(Easing.quad) });
  }, [p]);
  const chips = [
    { dx: -16, fall: 34 },
    { dx: -5, fall: 44 },
    { dx: 7, fall: 30 },
    { dx: 17, fall: 40 },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {chips.map((cItem, i) => (
        <DebrisChip key={i} dx={cItem.dx} fall={cItem.fall} p={p} tone={tone} />
      ))}
    </View>
  );
});

const DebrisChip = memo(function DebrisChip({
  dx,
  fall,
  p,
  tone,
}: {
  dx: number;
  fall: number;
  p: SharedValue<number>;
  tone: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ translateX: dx * p.value * 0.7 }, { translateY: fall * p.value * p.value }],
  }));
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: -2, top: -2, width: 4, height: 4, borderRadius: 1, backgroundColor: tone },
        style,
      ]}
    />
  );
});

/** A mote of dust floating slowly in the crystal's glow. */
const Mote = memo(function Mote({ x, y, seed, color }: { x: number; y: number; seed: number; color: string }) {
  const ty = useSharedValue(0);
  const o = useSharedValue(0.1);
  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(-22 - seed * 14, { duration: 3400 + seed * 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 3400 + seed * 2600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    o.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1800 + seed * 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.08, { duration: 1800 + seed * 1400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [ty, o, seed]);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: ty.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x, top: y, width: 3, height: 3, borderRadius: 1.5, backgroundColor: color },
        style,
      ]}
    />
  );
});

/** Crystals growing at the cave floor; they pulse when the big one shatters. */
const FloorCluster = memo(function FloorCluster({
  x,
  flip,
  material,
  echo,
}: {
  x: number;
  flip: boolean;
  material: { hi: string; mid: string };
  echo: SharedValue<number>;
}) {
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.1 + echo.value * 0.55 }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, bottom: 0, width: 110, height: 96, transform: [{ scaleX: flip ? -1 : 1 }] }}>
      <Animated.View style={[styles.clusterGlow, { backgroundColor: material.mid }, glowStyle]} />
      <Svg width={110} height={96} viewBox="0 0 110 96">
        <Polygon points="12,96 22,34 34,96" fill={material.mid} opacity={0.5} />
        <Polygon points="26,96 40,14 52,96" fill={material.hi} opacity={0.45} />
        <Polygon points="46,96 58,44 68,96" fill={material.mid} opacity={0.38} />
        <Polygon points="64,96 78,58 88,96" fill={material.hi} opacity={0.3} />
      </Svg>
    </View>
  );
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
  const sceneShake = useSharedValue(0);
  const pulse = useSharedValue(1);
  const flash = useSharedValue(0);
  const glow = useSharedValue(0);
  const echo = useSharedValue(0);
  const shineX = useSharedValue(-70);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 3600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    // Shine sweeps across the facets, rests, sweeps again.
    shineX.value = withRepeat(
      withSequence(
        withTiming(-70, { duration: 2800 }),
        withTiming(190, { duration: 1300, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [glow, shineX]);

  const shineProps = useAnimatedProps(() => ({ x: shineX.value }));

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
    // The whole cave answers: a small shake and an echo through the floor crystals.
    sceneShake.value = withSequence(
      withTiming(-4, { duration: 35 }),
      withTiming(3.5, { duration: 55 }),
      withTiming(-2, { duration: 65 }),
      withTiming(0, { duration: 90 })
    );
    echo.value = withSequence(withTiming(0.9, { duration: 70 }), withTiming(0, { duration: 1100, easing: Easing.out(Easing.quad) }));
    setBurst({ id: burstId.current++, shards: makeShards() });
    setCrack(0);
    setGen((g) => g + 1);
    setTimeout(() => {
      setBurst(null);
      bursting.current = false;
    }, 760);
  }, [crack, makeShards, shake, sceneShake, pulse, flash, echo]);

  const crystalStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${shake.value}deg` }, { scale: pulse.value }],
  }));
  const sceneStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sceneShake.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + glow.value * 0.12,
    transform: [{ scale: 0.94 + glow.value * 0.08 }],
  }));

  const cx = W / 2;
  const cy = H * 0.44;

  /** Jagged stalactite silhouette across the cave ceiling, seeded per width. */
  const ceiling = useMemo(() => {
    let d = `M0 0 L0 26`;
    let x = 0;
    let i = 0;
    while (x < W) {
      const tw = 30 + ((i * 37) % 34);
      const drop = 14 + ((i * 53) % 30);
      d += ` L${x + tw * 0.5} ${26 + drop} L${x + tw} 26`;
      x += tw;
      i += 1;
    }
    return `${d} L${W} 0 Z`;
  }, [W]);

  const motes = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        x: cx - 80 + ((i * 7919) % 160),
        y: cy - 60 + ((i * 104729) % 150),
        seed: (i + 0.5) / 5.4,
      })),
    [cx, cy]
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={CAVE} style={StyleSheet.absoluteFill} />

      {/* Cave ceiling with two hanging crystal spears */}
      <Svg pointerEvents="none" width={W} height={92} style={styles.ceiling}>
        <Path d={ceiling} fill="rgba(9,7,15,0.85)" />
        <Polygon
          points={`${W * 0.28},20 ${W * 0.28 - 7},20 ${W * 0.28 - 2},68`}
          fill={material.hi}
          opacity={0.16}
        />
        <Polygon
          points={`${W * 0.72},20 ${W * 0.72 + 8},20 ${W * 0.72 + 3},56`}
          fill={material.hi}
          opacity={0.12}
        />
      </Svg>

      {/* Floor clusters — they echo when the crystal breaks */}
      <FloorCluster x={-14} flip={false} material={material} echo={echo} />
      <FloorCluster x={W - 96} flip material={material} echo={echo} />

      <Animated.View style={[StyleSheet.absoluteFill, sceneStyle]}>
        {/* Ambient glow behind the crystal */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            { left: cx - 150, top: cy - 150, backgroundColor: material.mid },
            glowStyle,
          ]}
        />

        {/* Dust in the glow */}
        {motes.map((m, i) => (
          <Mote key={i} x={m.x} y={m.y} seed={m.seed} color={material.hi} />
        ))}

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
                  <Defs>
                    <SvgLinearGradient id="fHi" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={material.hi} />
                      <Stop offset="1" stopColor={material.mid} />
                    </SvgLinearGradient>
                    <SvgLinearGradient id="fMid" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor={material.mid} />
                      <Stop offset="1" stopColor={material.hi} />
                    </SvgLinearGradient>
                    <SvgLinearGradient id="fLo" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={material.mid} />
                      <Stop offset="1" stopColor={material.lo} />
                    </SvgLinearGradient>
                    <SvgLinearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                      <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.3" />
                      <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                    </SvgLinearGradient>
                    <ClipPath id="cp">
                      <Polygon points="70,8 122,62 98,182 42,182 18,62" />
                    </ClipPath>
                  </Defs>

                  {/* Facets */}
                  <Polygon points="70,8 18,62 70,84" fill="url(#fHi)" />
                  <Polygon points="70,8 122,62 70,84" fill="url(#fMid)" />
                  <Polygon points="18,62 70,84 42,182" fill="url(#fLo)" opacity={0.85} />
                  <Polygon points="122,62 70,84 98,182" fill={material.lo} />
                  <Polygon points="70,84 42,182 98,182" fill="url(#fLo)" opacity={0.92} />
                  {/* Facet edges catch the light */}
                  <Path d="M70 8 L70 84 M18 62 L70 84 L122 62 M70 84 L42 182 M70 84 L98 182" stroke="rgba(255,255,255,0.16)" strokeWidth={1} fill="none" />

                  {/* Sweeping shine, clipped to the silhouette */}
                  <G clipPath="url(#cp)">
                    <ARect animatedProps={shineProps} y={0} width={44} height={190} fill="url(#shine)" transform="skewX(-12)" />
                  </G>

                  {/* Cracks glow from inside before the break */}
                  {crack >= 1 && (
                    <>
                      <Path
                        d="M62 40 L74 66 L58 94 L72 122"
                        stroke={material.hi}
                        strokeWidth={4}
                        fill="none"
                        strokeLinecap="round"
                        opacity={0.35}
                      />
                      <Path
                        d="M62 40 L74 66 L58 94 L72 122"
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth={1.6}
                        fill="none"
                        strokeLinecap="round"
                      />
                    </>
                  )}
                  {crack >= 2 && (
                    <>
                      <Path
                        d="M90 56 L76 84 L92 118 L80 146 M52 70 L44 96"
                        stroke={material.hi}
                        strokeWidth={3.6}
                        fill="none"
                        strokeLinecap="round"
                        opacity={0.3}
                      />
                      <Path
                        d="M90 56 L76 84 L92 118 L80 146 M52 70 L44 96"
                        stroke="rgba(255,255,255,0.78)"
                        strokeWidth={1.4}
                        fill="none"
                        strokeLinecap="round"
                      />
                    </>
                  )}
                </Svg>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </View>

        {/* Debris chips on each crack */}
        {crack > 0 && !burst && (
          <View pointerEvents="none" style={{ position: 'absolute', left: cx, top: cy - 10 }}>
            <CrackDebris key={crack} tone={material.hi} />
          </View>
        )}

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
      </Animated.View>

      {/* Shatter flash */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  ceiling: { position: 'absolute', top: 0, left: 0 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  clusterGlow: {
    position: 'absolute',
    left: 4,
    bottom: -34,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  center: { position: 'absolute', left: -10, top: -10 },
  spark: { width: 4, height: 4, borderRadius: 2 },
  label: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  flash: { backgroundColor: '#FFFFFF' },
});

export default CrystalRelease;
