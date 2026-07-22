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
  LinearGradient as SvgLinearGradient,
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

/** A rare bubble — the rainbow one, rings and all. */
const MiniRainbowBubble = ({ s }: { s: number }) => {
  const c = s / 2;
  return (
    <Svg width={s} height={s}>
      <Defs>
        <RadialGradient id="mrb" cx="35%" cy="30%" r="75%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.32" />
          <Stop offset="0.55" stopColor="#FFC4E0" stopOpacity="0.1" />
          <Stop offset="1" stopColor="#FFE2F0" stopOpacity="0.3" />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c - 1} fill="url(#mrb)" />
      <Circle cx={c} cy={c} r={c - 1} stroke="#FF9DB0" strokeWidth={1.5} fill="none" opacity={0.8} />
      {['#FF9DB0', '#FFD79A', '#A8E6BE', '#A8CCF0', '#C9AEE8'].map((col, i) => (
        <Circle key={col} cx={c} cy={c} r={s * 0.3 - i * s * 0.028} stroke={col} strokeWidth={s * 0.022} fill="none" opacity={0.55} />
      ))}
      <Ellipse
        cx={s * 0.34}
        cy={s * 0.28}
        rx={s * 0.14}
        ry={s * 0.08}
        fill="rgba(255,255,255,0.5)"
        transform={`rotate(-18 ${s * 0.34} ${s * 0.28})`}
      />
    </Svg>
  );
};

const BubblesPreview = () => {
  const { w, h, onLayout } = useSize();
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <LinearGradient colors={['#143241', '#0E1D26', '#0A141B']} style={StyleSheet.absoluteFill} />
      {/* God ray */}
      <View style={{ position: 'absolute', top: -30, left: w * 0.2, width: 70, height: h * 1.5, transform: [{ rotate: '18deg' }] }}>
        <LinearGradient colors={['rgba(190,230,250,0.12)', 'rgba(190,230,250,0)']} style={StyleSheet.absoluteFill} />
      </View>
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          {/* Far bubble field — the depth the scene is built on */}
          {[
            { x: 0.12, y: 0.3, r: 3 },
            { x: 0.24, y: 0.68, r: 2.2 },
            { x: 0.46, y: 0.2, r: 2.6 },
            { x: 0.58, y: 0.78, r: 3.4 },
            { x: 0.7, y: 0.44, r: 2 },
            { x: 0.88, y: 0.62, r: 2.8 },
            { x: 0.32, y: 0.86, r: 2.4 },
            { x: 0.94, y: 0.24, r: 2.2 },
          ].map((b, i) => (
            <Circle
              key={i}
              cx={w * b.x}
              cy={h * b.y}
              r={b.r}
              stroke="rgba(200,232,250,0.3)"
              strokeWidth={0.8}
              fill="rgba(200,232,250,0.1)"
            />
          ))}
          {/* Kelp */}
          <Path d={`M${w * 0.1} ${h} Q ${w * 0.08} ${h * 0.6}, ${w * 0.14} ${h * 0.35} Q ${w * 0.11} ${h * 0.62}, ${w * 0.15} ${h} Z`} fill="rgba(22,58,64,0.9)" />
          <Path d={`M${w * 0.88} ${h} Q ${w * 0.9} ${h * 0.66}, ${w * 0.84} ${h * 0.44} Q ${w * 0.87} ${h * 0.68}, ${w * 0.83} ${h} Z`} fill="rgba(22,58,64,0.75)" />
        </Svg>
      )}
      {/* Static bubbles — one of them rare */}
      <View style={{ position: 'absolute', left: w * 0.6, top: h * 0.2 }}>
        <MiniRainbowBubble s={38} />
      </View>
      <View style={{ position: 'absolute', left: w * 0.34, top: h * 0.55 }}>
        <MiniBubble s={24} />
      </View>
      {h > 0 && (
        <RiseUp x={w * 0.8} h={h} dur={5200} delay={300}>
          <MiniBubble s={16} />
        </RiseUp>
      )}
      {h > 0 && (
        <RiseUp x={w * 0.18} h={h} dur={7400} delay={2100}>
          <MiniBubble s={12} />
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

/* -------------------------------- Aquarium -------------------------------- */

const AQ_FISH = [
  { x: 0.28, y: 0.4, s: 1.1, a: '#4FB4C8', b: '#E4574F' },
  { x: 0.56, y: 0.3, s: 0.85, a: '#E08A4A', b: '#F4EDE2' },
  { x: 0.7, y: 0.52, s: 1.25, a: '#D8D2C4', b: '#5C5A52' },
  { x: 0.42, y: 0.6, s: 0.75, a: '#7FBFA8', b: '#E8B36A' },
];

const AquariumPreview = () => {
  const { w, h, onLayout } = useSize();
  const sand = h * 0.78;
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <LinearGradient colors={['#6FC2D4', '#3E8FB0', '#1F5670']} style={StyleSheet.absoluteFill} />
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLinearGradient id="aq-ray" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#E2F4FF" stopOpacity={0.5} />
              <Stop offset="1" stopColor="#E2F4FF" stopOpacity={0} />
            </SvgLinearGradient>
            <SvgLinearGradient id="aq-sand" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#C9B594" />
              <Stop offset="1" stopColor="#8A7A61" />
            </SvgLinearGradient>
          </Defs>

          {/* Light shafts — the signature of a lit tank. */}
          {[0.16, 0.46, 0.74].map((f, i) => (
            <Path
              key={i}
              d={`M${w * f} 0 L${w * f + 18} 0 L${w * f + 52} ${sand} L${w * f - 14} ${sand} Z`}
              fill="url(#aq-ray)"
              opacity={0.55 + (i % 2) * 0.2}
            />
          ))}

          {/* Sand and rocks */}
          <Path d={`M0 ${h} L0 ${sand} Q ${w * 0.4} ${sand - 8}, ${w} ${sand + 4} L${w} ${h} Z`} fill="url(#aq-sand)" />
          <Ellipse cx={w * 0.2} cy={sand + 8} rx={26} ry={11} fill="#46525A" />
          <Ellipse cx={w * 0.78} cy={sand + 12} rx={20} ry={9} fill="#3E4A52" />

          {/* Planting */}
          {[0.1, 0.16, 0.86, 0.92, 0.5].map((f, i) => (
            <Path
              key={i}
              d={`M${w * f} ${sand + 6} q${i % 2 ? 8 : -8} ${-14}, ${i % 2 ? 3 : -3} ${-30 - (i % 3) * 12}`}
              stroke={['#4E8A63', '#3F7A57', '#5C9B6E'][i % 3]}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {/* Coral */}
          {[0, 1, 2].map((b) => (
            <Path
              key={b}
              d={`M${w * 0.68} ${sand + 4} q${(b - 1) * 9} -10, ${(b - 1) * 13} -19`}
              stroke="#C77A6B"
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {/* Fish */}
          {AQ_FISH.map((f, i) => {
            const L = 16 * f.s;
            const cx = w * f.x;
            const cy = h * f.y;
            return (
              <G key={i}>
                <Path d={`M${cx - L * 0.5} ${cy} l${-L * 0.4} ${-L * 0.28} l0 ${L * 0.56} Z`} fill={f.b} opacity={0.85} />
                <Ellipse cx={cx} cy={cy} rx={L * 0.55} ry={L * 0.3} fill={f.a} />
                <Circle cx={cx + L * 0.34} cy={cy - L * 0.06} r={L * 0.07} fill="#14202C" />
              </G>
            );
          })}
        </Svg>
      )}
      {h > 0 && (
        <>
          <RiseUp x={w * 0.24} h={h} dur={4200} delay={0}>
            <View style={styles.aqBubble} />
          </RiseUp>
          <RiseUp x={w * 0.82} h={h} dur={5400} delay={1600}>
            <View style={styles.aqBubble} />
          </RiseUp>
        </>
      )}
    </View>
  );
};

/* -------------------------------- Catcher -------------------------------- */

const CatcherPreview = () => {
  const { w, h, onLayout } = useSize();
  const ux = w * 0.5;
  const uy = h * 0.46;
  return (
    <View style={styles.fill} onLayout={onLayout}>
      <LinearGradient colors={['#7C95A6', '#A7BFC0', '#D3E2D6']} style={StyleSheet.absoluteFill} />
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          {/* Soft sun behind the rain */}
          <Circle cx={w * 0.82} cy={h * 0.2} r={13} fill="rgba(243,236,216,0.2)" />
          <Circle cx={w * 0.82} cy={h * 0.2} r={8} fill="#F3ECD8" opacity={0.85} />
          {/* Hills + meadow */}
          <Path
            d={`M0 ${h} L0 ${h * 0.66} Q ${w * 0.3} ${h * 0.56}, ${w * 0.58} ${h * 0.65} T ${w} ${h * 0.6} L${w} ${h} Z`}
            fill="#7E9887"
          />
          <Path d={`M0 ${h} L0 ${h * 0.8} Q ${w * 0.5} ${h * 0.72}, ${w} ${h * 0.79} L${w} ${h} Z`} fill="#57795F" />
          <Path d={`M0 ${h} L0 ${h * 0.92} Q ${w * 0.5} ${h * 0.86}, ${w} ${h * 0.92} L${w} ${h} Z`} fill="#3C5947" />
          {/* Blooms the rain has already grown */}
          {[
            { x: w * 0.18, y: h * 0.84, r: 5, c: '#E8A9BD' },
            { x: w * 0.34, y: h * 0.9, r: 4, c: '#CDB6E4' },
            { x: w * 0.72, y: h * 0.87, r: 4.6, c: '#F2C9A2' },
          ].map((f, i) => (
            <G key={i}>
              <Path d={`M${f.x} ${f.y + 8} L${f.x} ${f.y + 2}`} stroke="#6B8A5E" strokeWidth={1.4} strokeLinecap="round" />
              <Circle cx={f.x} cy={f.y} r={f.r} fill={f.c} />
              <Circle cx={f.x} cy={f.y} r={1.4} fill="#FFE9BE" />
            </G>
          ))}
          {/* The umbrella, mid-drift */}
          <Path d={`M${ux} ${uy} v20 a4 4 0 0 0 8 0`} stroke="#77604F" strokeWidth={2} strokeLinecap="round" fill="none" />
          <Path
            d={`M${ux - 26} ${uy} A26 26 0 0 1 ${ux + 26} ${uy} A8.7 5 0 0 1 ${ux + 8.7} ${uy} A8.7 5 0 0 1 ${ux - 8.7} ${uy} A8.7 5 0 0 1 ${ux - 26} ${uy} Z`}
            fill="#D9857A"
          />
          <Ellipse
            cx={ux - 10}
            cy={uy - 15}
            rx={8}
            ry={3.6}
            fill="rgba(255,255,255,0.25)"
            transform={`rotate(-24 ${ux - 10} ${uy - 15})`}
          />
        </Svg>
      )}
      {h > 0 && (
        <>
          <DriftDown x={w * 0.3} h={h} dur={3400} delay={200} sway={0}>
            <View style={styles.fallDrop} />
          </DriftDown>
          <DriftDown x={w * 0.66} h={h} dur={4200} delay={1600} sway={0}>
            <View style={styles.fallDrop} />
          </DriftDown>
          <Breathe x={ux - 5} y={uy + 8} size={10} color="rgba(255,214,170,0.5)" dur={2600} lo={0.15} hi={0.7} />
        </>
      )}
    </View>
  );
};

export const ESCAPE_PREVIEWS: Record<string, ComponentType> = {
  zen: ZenPreview,
  aquarium: AquariumPreview,
  bubbles: BubblesPreview,
  shatter: ShatterPreview,
  catcher: CatcherPreview,
};

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' },
  fallDrop: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: 'rgba(205,228,244,0.5)',
  },
  aqBubble: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  pollen: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,253,246,0.85)',
  },
});
