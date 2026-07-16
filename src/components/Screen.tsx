import { ReactNode } from 'react';
import { ScrollView, View, StyleSheet, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
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
}

/**
 * Page scaffold. Owns the canvas color, the content column cap, the edge
 * gutter, and the bottom inset that keeps content clear of the floating tab
 * bar — the four things every screen previously re-implemented (and drifted on).
 *
 * The top band is left clear for the floating nav arrows.
 */
const Screen = ({ children, title, subtitle, action, scroll = true, refreshControl }: ScreenProps) => {
  const { colors: c } = useTheme();

  const header = title ? (
    <Animated.View entering={FadeInDown.duration(MOTION.base)} style={styles.header}>
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
      <SafeAreaView style={styles.root} edges={['top']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {body}
            <View style={{ height: SPACE.tabSafe }} />
          </ScrollView>
        ) : (
          body
        )}
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
    // Clears the floating nav arrows.
    marginTop: SPACE.h2,
    marginBottom: SPACE.xxl,
    gap: SPACE.lg,
  },
  headerText: { flex: 1 },
});

export default Screen;
