import { ComponentType, ReactNode, memo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * Living preview vignettes for the Reset hub — each escape card carries a
 * miniature of its scene rather than an icon row. Every preview is mostly
 * static SVG with at most one or two slow ambient loops, so six of them can
 * sit on one scrolling screen without costing anything noticeable.
 */

function useSize() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: Math.round(width), h: Math.round(height) });
  }, []);
  return { ...size, onLayout };
}

/** Soft dot that breathes — firefly, twinkle, bokeh core. */
const Breathe = memo(function Breathe({
  x,
  y,
  size,
  color,
  dur = 2200,
  delay = 0,
  lo = 0.15,
  hi = 0.9,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  dur?: number;
  delay?: number;
  lo?: number;
  hi?: number;
}) {
  const o = useSharedValue(lo);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(hi, { duration: dur, easing: Easing.inOut(Easing.quad) }),
          withTiming(lo, { duration: dur, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [o, dur, delay, lo, hi]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
});

/** Something small drifting down the card forever (petal, raindrop). */
const DriftDown = memo(function DriftDown({
  x,
  h,
  dur,
  delay,
  sway,
  children,
}: {
  x: number;
  h: number;
  dur: number;
  delay: number;
  sway: number;
  children: ReactNode;
}) {
  const y = useSharedValue(-12);
  const sx = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(h + 14, { duration: dur, easing: Easing.linear }), withTiming(-12, { duration: 0 })),
        -1
      )
    );
    if (sway > 0) {
      sx.value = withRepeat(
        withSequence(
          withTiming(sway, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          withTiming(-sway, { duration: 1600, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    }
  }, [y, sx, h, dur, delay, sway]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: sx.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: 0 }, style]}>
      {children}
    </Animated.View>
  );
});

/** Something small rising up the card forever (bubble). */
const RiseUp = memo(function RiseUp({
  x,
  h,
  dur,
  delay,
  children,
}: {
  x: number;
  h: number;
  dur: number;
  delay: number;
  children: ReactNode;
}) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = h + 20;
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(-26, { duration: dur, easing: Easing.linear }), withTiming(h + 20, { duration: 0 })),
        -1
      )
    );
  }, [y, h, dur, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: 0 }, style]}>
      {children}
    </Animated.View>
  );
});

/* ---------------------------------- Zen ---------------------------------- */

const ZenPreview = () => {
  const { w, h, onLayout } = useSize();
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <LinearGradient colors={['#F5EDDD', '#EFE6D3', '#E9DEC7']} style={StyleSheet.absoluteFill} />
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          {/* Raked base waves */}
          {[0.42, 0.62, 0.84].map((f, i) => {
            const y = h * f;
            const q = w / 8;
            return (
              <Path
                key={i}
                d={`M0 ${y} Q ${q} ${y - 7}, ${q * 2} ${y} T ${q * 4} ${y} T ${q * 6} ${y} T ${q * 8} ${y}`}
                stroke="rgba(97,83,64,0.16)"
                strokeWidth={1.1}
                fill="none"
              />
            );
          })}
          {/* Rock with rings */}
          <Ellipse cx={w * 0.26} cy={h * 0.6} rx={30} ry={19 * 0.62} stroke="rgba(97,83,64,0.16)" strokeWidth={1.6} fill="none" />
          <Ellipse cx={w * 0.26} cy={h * 0.6} rx={42} ry={26 * 0.62} stroke="rgba(97,83,64,0.12)" strokeWidth={1.6} fill="none" />
          <Ellipse cx={w * 0.26} cy={h * 0.6 + 2.5} rx={17} ry={10.5} fill="rgba(60,52,42,0.2)" />
          <Ellipse cx={w * 0.26} cy={h * 0.6} rx={17} ry={10.5} fill="#6E665B" />
          <Ellipse cx={w * 0.26 - 4} cy={h * 0.6 - 3.5} rx={10} ry={5.5} fill="#8A8175" opacity={0.85} />
          {/* Pond */}
          <Ellipse cx={w * 0.76} cy={h * 0.34} rx={44} ry={27} fill="#C6B593" />
          <Ellipse cx={w * 0.76} cy={h * 0.34} rx={39} ry={23} fill="#84ABA9" />
          <Ellipse cx={w * 0.77} cy={h * 0.36} rx={25} ry={14} fill="#6C9694" />
          <Circle cx={w * 0.76 - 20} cy={h * 0.34 - 8} r={5.5} fill="#7FA36B" />
          {/* Koi */}
          <G transform={`rotate(24 ${w * 0.79} ${h * 0.37})`}>
            <Ellipse cx={w * 0.79} cy={h * 0.37} rx={7} ry={3.2} fill="#E8894A" />
            <Ellipse cx={w * 0.79 + 2.4} cy={h * 0.37 - 0.8} rx={2.4} ry={1.6} fill="#F6F3EC" />
            <Path d={`M${w * 0.79 - 7} ${h * 0.37} l-4 -2.6 l1.4 2.6 l-1.4 2.6 Z`} fill="#E8894A" opacity={0.9} />
          </G>
          {/* Blossom branch corner */}
          <Path d={`M${w - 4} 10 C ${w - 42} 16, ${w - 66} 30, ${w - 92} 46`} stroke="#8A7360" strokeWidth={3.4} strokeLinecap="round" fill="none" />
          {[
            { x: w - 66, y: 28, r: 5 },
            { x: w - 84, y: 40, r: 5.6 },
            { x: w - 52, y: 20, r: 4.2 },
          ].map((b, i) => (
            <G key={i}>
              <Circle cx={b.x} cy={b.y} r={b.r} fill={i % 2 ? '#E9B7C8' : '#F2D3DD'} />
              <Circle cx={b.x} cy={b.y} r={1.2} fill="#C98FA5" />
            </G>
          ))}
        </Svg>
      )}
      {h > 0 && (
        <DriftDown x={w * 0.45} h={h} dur={6800} delay={400} sway={10}>
          <View style={{ width: 6, height: 9, borderRadius: 6, backgroundColor: 'rgba(219,148,173,0.7)' }} />
        </DriftDown>
      )}
    </View>
  );
};

/* --------------------------------- Bloom --------------------------------- */

const BloomPreview = () => {
  const { w, h, onLayout } = useSize();
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <LinearGradient colors={['#2E2440', '#221B33', '#151022']} style={StyleSheet.absoluteFill} />
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          {/* Moon */}
          <Circle cx={w * 0.84} cy={h * 0.24} r={16} fill="rgba(255,240,214,0.12)" />
          <Circle cx={w * 0.84} cy={h * 0.24} r={10} fill="#F4E8CE" opacity={0.9} />
          <Circle cx={w * 0.84 - 3} cy={h * 0.24 - 2} r={2} fill="rgba(0,0,0,0.06)" />
          {/* Hills */}
          <Path d={`M0 ${h} L0 ${h * 0.78} Q ${w * 0.3} ${h * 0.6}, ${w * 0.62} ${h * 0.8} T ${w} ${h * 0.74} L${w} ${h} Z`} fill="rgba(16,11,26,0.85)" />
          <Path d={`M0 ${h} L0 ${h * 0.9} Q ${w * 0.44} ${h * 0.74}, ${w} ${h * 0.92} L${w} ${h} Z`} fill="#0D0918" />
          {/* Flowers */}
          {[
            { cx: w * 0.2, cy: h * 0.52, r: 17, c: '#E8A9BD' },
            { cx: w * 0.47, cy: h * 0.68, r: 12, c: '#CDB6E4' },
            { cx: w * 0.64, cy: h * 0.45, r: 9, c: '#F2C9A2' },
          ].map((f, i) => (
            <G key={i}>
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <Ellipse
                  key={a}
                  cx={f.cx}
                  cy={f.cy - f.r * 0.42}
                  rx={f.r * 0.3}
                  ry={f.r * 0.47}
                  transform={`rotate(${a} ${f.cx} ${f.cy})`}
                  fill={f.c}
                  opacity={0.92}
                />
              ))}
              <Circle cx={f.cx} cy={f.cy} r={f.r * 0.22} fill="#FFE9BE" />
            </G>
          ))}
        </Svg>
      )}
      {h > 0 && (
        <>
          <Breathe x={w * 0.34} y={h * 0.3} size={5} color="#FFE7A3" dur={1700} lo={0.1} hi={0.85} />
          <Breathe x={w * 0.55} y={h * 0.58} size={4} color="#FFE7A3" dur={2300} delay={700} lo={0.1} hi={0.7} />
        </>
      )}
    </View>
  );
};

/* -------------------------------- Bubbles -------------------------------- */

const MiniBubble = ({ s }: { s: number }) => (
  <Svg width={s} height={s}>
    <Defs>
      <RadialGradient id="mb" cx="35%" cy="30%" r="75%">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.3" />
        <Stop offset="0.55" stopColor="#9CD2FF" stopOpacity="0.08" />
        <Stop offset="1" stopColor="#C4E8FF" stopOpacity="0.28" />
      </RadialGradient>
    </Defs>
    <Circle cx={s / 2} cy={s / 2} r={s / 2 - 1} fill="url(#mb)" />
    <Circle cx={s / 2} cy={s / 2} r={s / 2 - 1} stroke="rgba(196,232,255,0.55)" strokeWidth={1} fill="none" />
    <Ellipse cx={s * 0.34} cy={s * 0.28} rx={s * 0.14} ry={s * 0.08} fill="rgba(255,255,255,0.5)" transform={`rotate(-18 ${s * 0.34} ${s * 0.28})`} />
  </Svg>
);

const BubblesPreview = () => {
  const { w, h, onLayout } = useSize();
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <LinearGradient colors={['#143241', '#0E1D26', '#0A141B']} style={StyleSheet.absoluteFill} />
      {/* God ray */}
      <View style={{ position: 'absolute', top: -30, left: w * 0.2, width: 70, height: h * 1.5, transform: [{ rotate: '18deg' }] }}>
        <LinearGradient colors={['rgba(190,230,250,0.12)', 'rgba(190,230,250,0)']} style={StyleSheet.absoluteFill} />
      </View>
      {/* Kelp */}
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Path d={`M${w * 0.1} ${h} Q ${w * 0.08} ${h * 0.6}, ${w * 0.14} ${h * 0.35} Q ${w * 0.11} ${h * 0.62}, ${w * 0.15} ${h} Z`} fill="rgba(22,58,64,0.9)" />
          <Path d={`M${w * 0.88} ${h} Q ${w * 0.9} ${h * 0.66}, ${w * 0.84} ${h * 0.44} Q ${w * 0.87} ${h * 0.68}, ${w * 0.83} ${h} Z`} fill="rgba(22,58,64,0.75)" />
        </Svg>
      )}
      {/* Static bubbles */}
      <View style={{ position: 'absolute', left: w * 0.62, top: h * 0.22 }}>
        <MiniBubble s={34} />
      </View>
      <View style={{ position: 'absolute', left: w * 0.36, top: h * 0.55 }}>
        <MiniBubble s={22} />
      </View>
      {h > 0 && (
        <RiseUp x={w * 0.78} h={h} dur={5200} delay={300}>
          <MiniBubble s={16} />
        </RiseUp>
      )}
    </View>
  );
};

/* -------------------------------- Shatter -------------------------------- */

const ShatterPreview = () => {
  const { w, h, onLayout } = useSize();
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [glow]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + glow.value * 0.14,
    transform: [{ scale: 0.92 + glow.value * 0.1 }],
  }));

  const cx = w * 0.5;
  const cy = h * 0.52;
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <LinearGradient colors={['#241C34', '#191426', '#100D18']} style={StyleSheet.absoluteFill} />
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: cx - 52, top: cy - 52, width: 104, height: 104, borderRadius: 52, backgroundColor: '#D97C9B' },
          glowStyle,
        ]}
      />
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          {/* Ground crystals */}
          <Polygon points={`${w * 0.16},${h} ${w * 0.2},${h * 0.72} ${w * 0.25},${h}`} fill="rgba(184,154,216,0.35)" />
          <Polygon points={`${w * 0.22},${h} ${w * 0.27},${h * 0.62} ${w * 0.32},${h}`} fill="rgba(184,154,216,0.5)" />
          <Polygon points={`${w * 0.8},${h} ${w * 0.84},${h * 0.7} ${w * 0.89},${h}`} fill="rgba(217,124,155,0.4)" />
          {/* Hero crystal */}
          <G transform={`translate(${cx - 22} ${cy - 30}) scale(0.315)`}>
            <Polygon points="70,8 18,62 70,84" fill="#F0C9D8" />
            <Polygon points="70,8 122,62 70,84" fill="#D97C9B" />
            <Polygon points="18,62 70,84 42,182" fill="#A84A6B" opacity={0.85} />
            <Polygon points="122,62 70,84 98,182" fill="#A84A6B" />
            <Polygon points="70,84 42,182 98,182" fill="#D97C9B" opacity={0.92} />
          </G>
          <Ellipse cx={cx} cy={cy + 34} rx={30} ry={5.5} fill="rgba(0,0,0,0.4)" />
          {/* Sparkle */}
          <G>
            <Rect x={w * 0.72 - 1} y={h * 0.24 - 6} width={2} height={12} rx={1} fill="rgba(240,201,216,0.85)" />
            <Rect x={w * 0.72 - 6} y={h * 0.24 - 1} width={12} height={2} rx={1} fill="rgba(240,201,216,0.85)" />
          </G>
        </Svg>
      )}
    </View>
  );
};

/* --------------------------------- Rain ---------------------------------- */

const RainPreview = () => {
  const { w, h, onLayout } = useSize();
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <LinearGradient colors={['#1E2936', '#141B26', '#0D1219']} style={StyleSheet.absoluteFill} />
      {/* Bokeh */}
      <View style={[styles.bokeh, { left: w * 0.16, top: h * 0.2, backgroundColor: 'rgba(217,160,92,0.14)' }]} />
      <Breathe x={w * 0.66} y={h * 0.14} size={40} color="rgba(124,155,217,0.13)" dur={2800} lo={0.5} hi={1} />
      {/* Skyline */}
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          {[
            { x: 0.04, bw: 0.13, bh: 0.34 },
            { x: 0.19, bw: 0.1, bh: 0.5 },
            { x: 0.31, bw: 0.15, bh: 0.28 },
            { x: 0.48, bw: 0.11, bh: 0.42 },
            { x: 0.61, bw: 0.14, bh: 0.3 },
            { x: 0.77, bw: 0.12, bh: 0.46 },
            { x: 0.9, bw: 0.1, bh: 0.26 },
          ].map((b, i) => (
            <Rect key={i} x={w * b.x} y={h * (1 - b.bh)} width={w * b.bw} height={h * b.bh} fill={i % 2 ? '#0B1017' : 'rgba(16,22,32,0.9)'} />
          ))}
          {/* Lit windows */}
          {[
            [0.22, 0.58], [0.24, 0.66], [0.5, 0.64], [0.79, 0.6], [0.81, 0.7], [0.07, 0.72],
          ].map(([x, y], i) => (
            <Rect key={i} x={w * x} y={h * y} width={3} height={4.4} fill={i % 3 ? 'rgba(232,200,122,0.8)' : 'rgba(180,205,230,0.6)'} />
          ))}
        </Svg>
      )}
      {/* Clinging drops */}
      <View style={[styles.cling, { left: w * 0.4, top: h * 0.24 }]} />
      <View style={[styles.cling, { left: w * 0.55, top: h * 0.4, width: 4, height: 5 }]} />
      {h > 0 && (
        <DriftDown x={w * 0.32} h={h} dur={2400} delay={200} sway={0}>
          <View style={styles.fallDrop} />
        </DriftDown>
      )}
    </View>
  );
};

/* -------------------------------- Cosmos --------------------------------- */

const COSMOS_STARS = Array.from({ length: 16 }, (_, i) => ({
  x: ((i * 7919) % 97) / 97,
  y: ((i * 104729) % 89) / 89,
  r: 0.8 + ((i * 31) % 10) / 10,
  o: 0.3 + ((i * 17) % 10) / 20,
}));

const CosmosPreview = () => {
  const { w, h, onLayout } = useSize();
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <LinearGradient colors={['#0B0E2A', '#141033', '#0A0716']} style={StyleSheet.absoluteFill} />
      {/* Milky-way band */}
      <View style={{ position: 'absolute', left: -w * 0.2, top: h * 0.16, width: w * 1.4, height: h * 0.5, transform: [{ rotate: '-16deg' }] }}>
        <LinearGradient colors={['rgba(226,222,255,0)', 'rgba(226,222,255,0.09)', 'rgba(226,222,255,0)']} style={StyleSheet.absoluteFill} />
      </View>
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          {COSMOS_STARS.map((s, i) => (
            <Circle key={i} cx={s.x * w} cy={s.y * h} r={s.r} fill="#F4EFE7" opacity={s.o} />
          ))}
          {/* Ringed planet */}
          <Ellipse cx={w * 0.78} cy={h * 0.62} rx={26} ry={8} stroke="rgba(214,196,255,0.45)" strokeWidth={2} fill="none" transform={`rotate(-18 ${w * 0.78} ${h * 0.62})`} />
          <Circle cx={w * 0.78} cy={h * 0.62} r={13} fill="#6D5BA8" />
          <Ellipse cx={w * 0.78 - 4} cy={h * 0.62 - 4} rx={6} ry={4} fill="rgba(255,255,255,0.16)" />
          {/* Meteor */}
          <Rect x={w * 0.16} y={h * 0.22} width={54} height={1.6} rx={1} fill="rgba(255,246,224,0.4)" transform={`rotate(24 ${w * 0.16} ${h * 0.22})`} />
          <Circle cx={w * 0.16 + 50} cy={h * 0.22 + 22} r={2.2} fill="#FFF6E0" opacity={0.9} />
        </Svg>
      )}
      {h > 0 && (
        <>
          <Breathe x={w * 0.3} y={h * 0.4} size={4} color="#FFFFFF" dur={1500} lo={0.2} hi={1} />
          <Breathe x={w * 0.52} y={h * 0.7} size={3} color="#FFEFD6" dur={2100} delay={600} lo={0.15} hi={0.85} />
        </>
      )}
    </View>
  );
};

export const ESCAPE_PREVIEWS: Record<string, ComponentType> = {
  zen: ZenPreview,
  bloom: BloomPreview,
  bubbles: BubblesPreview,
  shatter: ShatterPreview,
  rain: RainPreview,
  cosmos: CosmosPreview,
};

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' },
  bokeh: { position: 'absolute', width: 54, height: 54, borderRadius: 27 },
  cling: {
    position: 'absolute',
    width: 5,
    height: 6.5,
    borderRadius: 4,
    backgroundColor: 'rgba(205,228,244,0.45)',
  },
  fallDrop: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: 'rgba(205,228,244,0.5)',
  },
});
