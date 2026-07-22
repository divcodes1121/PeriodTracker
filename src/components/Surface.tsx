import { ReactNode, useMemo, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';
import { useScrollY } from './ScrollContext';
import { RADIUS, SHADOW, SHADOW_DARK, SPACE, MOTION } from '../theme/tokens';

type Elevation = 'flat' | 'sm' | 'md' | 'lg';

/**
 * The depth tiers. Previously every card in the app was the same object —
 * radius 24, shadow sm, padding 20 — which made visual hierarchy structurally
 * impossible no matter how the content was written. A variant is now a
 * *decision about importance*, and the geometry follows from it.
 */
export type SurfaceVariant =
  /** The one thing on the page that matters most. Wider radius, deep shadow. */
  | 'hero'
  /** Standard content card. The workhorse. */
  | 'card'
  /**
   * Secondary. Translucent, no shadow — the live atmosphere reads through it,
   * so supporting content recedes into the canvas instead of competing with
   * the cards above it.
   */
  | 'quiet'
  /** Recessed well, for grouped rows and nested content. */
  | 'inset';

interface SurfaceProps {
  children: ReactNode;
  variant?: SurfaceVariant;
  /** Overrides the variant's shadow. Rarely needed. */
  elevation?: Elevation;
  /** Set false to control padding yourself. */
  padded?: boolean;
  /** @deprecated Use variant="inset". Kept so existing screens keep compiling. */
  inset?: boolean;
  /**
   * Opt into scroll-reactive parallax: the card rises and settles slightly as
   * it crosses the viewport. One animated node per card, worklet-driven, zero
   * re-renders. Opt-in rather than default so a long list doesn't quietly
   * allocate twenty of them.
   */
  lift?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const GEOMETRY: Record<SurfaceVariant, { radius: number; pad: number; elevation: Elevation }> = {
  hero: { radius: RADIUS.sheet, pad: SPACE.xxl, elevation: 'lg' },
  card: { radius: RADIUS.card, pad: SPACE.xl, elevation: 'sm' },
  quiet: { radius: RADIUS.card, pad: SPACE.xl, elevation: 'flat' },
  inset: { radius: RADIUS.md, pad: SPACE.lg, elevation: 'flat' },
};

/**
 * The default surface of the design language: a card that separates from the
 * live canvas by shadow and translucency — never a border.
 *
 * When `onPress` is given the whole card becomes a spring-pressed, haptic
 * button with a proper accessibility role.
 */
const Surface = ({
  children,
  variant,
  elevation,
  padded = true,
  inset = false,
  lift = false,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
}: SurfaceProps) => {
  const { colors: c, isDark } = useTheme();
  const shadows = isDark ? SHADOW_DARK : SHADOW;
  const press = useSharedValue(0);
  const scrollY = useScrollY();
  const [top, setTop] = useState<number | null>(null);

  // `inset` predates variants; honour it so untouched screens keep working.
  const v: SurfaceVariant = variant ?? (inset ? 'inset' : 'card');
  const g = GEOMETRY[v];
  const shadowKey = elevation ?? g.elevation;

  const base = useMemo<ViewStyle>(() => {
    const background =
      v === 'inset' ? c.bgSecondary : v === 'quiet' ? c.cardQuiet : v === 'hero' ? c.cardElevated : c.card;
    return {
      backgroundColor: background,
      borderRadius: g.radius,
      padding: padded ? g.pad : 0,
      ...(shadowKey === 'flat' ? {} : shadows[shadowKey]),
      // Every card gets a hairline outline now. On a pure-white canvas a white
      // card and the page are literally the same colour, so shadow alone left
      // cards invisible — the outline is what makes them read as surfaces.
      // Inset wells are excluded: they are recessed, so their own fill already
      // separates them.
      ...(v === 'inset'
        ? {}
        : { borderWidth: StyleSheet.hairlineWidth, borderColor: c.cardBorder }),
    };
  }, [c, v, g, padded, shadowKey, shadows]);

  const onLayout = lift
    ? (e: LayoutChangeEvent) => setTop(e.nativeEvent.layout.y)
    : undefined;

  const animated = useAnimatedStyle(() => {
    const scale = 1 - press.value * 0.014;
    if (!lift || !scrollY || top === null) {
      return { transform: [{ scale }] };
    }
    // Distance the card has travelled through the viewport, normalised. The
    // card sits 10px low as it enters and settles to 0 — a rise, not a tilt,
    // which reads as premium where a rotateX reads as a demo.
    const d = scrollY.value - top;
    const rise = interpolate(d, [-520, -180], [10, 0], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY: rise }] };
  });

  if (!onPress) {
    return (
      <Animated.View style={[base, lift ? animated : null, style]} onLayout={onLayout}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPressIn={() => {
        press.value = withSpring(1, MOTION.springSnap);
        Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => {
        press.value = withSpring(0, MOTION.spring);
      }}
      onPress={onPress}
    >
      <Animated.View style={[base, animated, style]} onLayout={onLayout}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default Surface;

export const surfaceStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
