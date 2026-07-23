import { ReactNode } from 'react';
import { View, StyleSheet, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Text from './Text';
import Atmosphere from './Atmosphere';
import { ScrollContext } from './ScrollContext';
import { useTheme } from '../theme/useTheme';
import { useAtmosphere } from '../theme/useAtmosphere';
import { SPACE, MOTION } from '../theme/tokens';
import { CONTENT_MAX_WIDTH } from '../utils/responsive';

interface ScreenProps extends Pick<ScrollViewProps, 'refreshControl'> {
  children: ReactNode;
  /** Large editorial page title. */
  title?: string;
  subtitle?: string;
  /** Rendered on the title row, right-aligned (e.g. a theme toggle). */
  action?: ReactNode;
  scroll?: boolean;
  /**
   * Set false for screens that paint their own background (the escape player,
   * onboarding). Default true — the live canvas is the app's resting state.
   */
  atmosphere?: boolean;
}

const AnimatedScrollView = Animated.ScrollView;

/**
 * Page scaffold. Owns the canvas, the content column cap, the edge gutter, and
 * the bottom inset that keeps content clear of the floating tab bar.
 *
 * Two responsibilities were added in the atmosphere pass:
 *
 *  1. It renders the live <Atmosphere/> behind content, so ambient motion is a
 *     property of *being a screen* rather than something each page opts into and
 *     half of them forget.
 *  2. It publishes its scroll offset as a SharedValue through ScrollContext, so
 *     descendants can react to scrolling inside worklets at zero render cost.
 *
 * The header parallaxes gently against that offset — the cheapest possible
 * demonstration that the page has depth, and it costs one animated node.
 */
const Screen = ({
  children,
  title,
  subtitle,
  action,
  scroll = true,
  atmosphere: showAtmosphere = true,
  refreshControl,
}: ScreenProps) => {
  const { colors: c, isDark } = useTheme();
  const atmos = useAtmosphere();
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Header drifts up at ~⅓ scroll speed and fades as it goes, so the title
  // recedes into the canvas instead of sliding off it.
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 90], [1, 0.35], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, 140], [0, -22], Extrapolation.CLAMP) },
    ],
  }));

  const header = title ? (
    <Animated.View
      entering={FadeInDown.duration(MOTION.base)}
      style={[styles.header, headerStyle]}
    >
      <View style={styles.headerText}>
        <Text variant="title1">{title}</Text>
        {subtitle ? (
          <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.xs }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </Animated.View>
  ) : null;

  const body = (
    <View style={styles.column}>
      {header}
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {showAtmosphere ? <Atmosphere atmos={atmos} isDark={isDark} /> : null}

      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollContext.Provider value={scroll ? scrollY : null}>
          {scroll ? (
            <AnimatedScrollView
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}
              onScroll={onScroll}
              scrollEventThrottle={16}
            >
              {body}
              <View style={{ height: SPACE.tabSafe }} />
            </AnimatedScrollView>
          ) : (
            body
          )}
        </ScrollContext.Provider>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { alignItems: 'center' },
  column: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    paddingHorizontal: SPACE.gutter,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    // Clears the floating nav arrows, which sit at insets.top + SPACE.sm and
    // stand 36pt tall. At SPACE.h2 the title landed on top of them.
    marginTop: SPACE.h3,
    marginBottom: SPACE.xxl,
    gap: SPACE.lg,
  },
  headerText: { flex: 1 },
});

export default Screen;
