import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, {
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { v4 as uuidv4 } from 'uuid';
import Text from '../components/Text';
import Icon from '../components/Icon';
import Surface from '../components/Surface';
import Button from '../components/Button';
import { ESCAPES } from '../utils/tinyEscapes';
import { ESCAPE_COMPONENTS } from '../escapes';
import { useAppStore } from '../store/appStore';
import { ResetResponse } from '../types';
import { SPACE, MIN_TAP } from '../theme/tokens';
import { CONTENT_MAX_WIDTH } from '../utils/responsive';

/**
 * Fullscreen host for a Tiny Escape.
 *
 * Deliberately near-chromeless: a hint that fades after a few seconds and a
 * close button. After the planned duration a check-out card slides up —
 * "Feeling a little better?" — whose answer is stored and later read by AI
 * Insights. Nothing forces an exit ("Keep going" restarts the soft timer),
 * and there is no score anywhere.
 */
const EscapePlayerScreen = ({ navigation, route }: any) => {
  const { escapeId = 'zen', plannedSec = 120 } = route.params ?? {};
  const meta = ESCAPES.find((e) => e.id === escapeId) ?? ESCAPES[0];
  const Scene = ESCAPE_COMPONENTS[meta.id];
  const insets = useSafeAreaInsets();
  const { user, addResetSession } = useAppStore();

  const [checkout, setCheckout] = useState(false);
  const [round, setRound] = useState(0);
  const started = useRef(Date.now());
  const recorded = useRef(false);

  const record = useCallback(
    (response: ResetResponse | null) => {
      if (recorded.current) return;
      recorded.current = true;
      addResetSession({
        id: uuidv4(),
        userId: user?.id ?? 'local',
        escapeId: meta.id,
        startedAt: new Date(started.current),
        plannedSec,
        actualSec: Math.round((Date.now() - started.current) / 1000),
        response,
        createdAt: new Date(),
      });
    },
    [addResetSession, user, meta.id, plannedSec]
  );

  // Soft timer → check-out. "Keep going" bumps `round` to arm it again.
  useEffect(() => {
    const t = setTimeout(() => {
      Haptics.selectionAsync().catch(() => {});
      setCheckout(true);
    }, plannedSec * 1000);
    return () => clearTimeout(t);
  }, [plannedSec, round]);

  // A session abandoned via system back still counts once it ran ≥20s.
  useEffect(() => {
    return () => {
      if (!recorded.current && Date.now() - started.current >= 20000) record(null);
    };
  }, [record]);

  const close = () => {
    if (Date.now() - started.current >= 20000) record(null);
    navigation.goBack();
  };

  const answer = (r: ResetResponse) => {
    Haptics.selectionAsync().catch(() => {});
    record(r);
    navigation.goBack();
  };

  // Hint: fade in, hold a beat, fade away — then the scene is all there is.
  const hintO = useSharedValue(0);
  useEffect(() => {
    hintO.value = withSequence(
      withTiming(1, { duration: 420 }),
      withDelay(2500, withTiming(0, { duration: 700 }))
    );
  }, [hintO]);
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintO.value }));

  const lightChrome = meta.chrome === 'light';
  const chromeFg = lightChrome ? 'rgba(255,255,255,0.92)' : 'rgba(50,42,32,0.85)';
  const chromeBg = lightChrome ? 'rgba(255,255,255,0.16)' : 'rgba(60,50,38,0.12)';

  return (
    <View style={styles.root}>
      <StatusBar style={lightChrome ? 'light' : 'dark'} />
      {Scene ? <Scene /> : <View style={styles.root} />}

      <Animated.View
        pointerEvents="none"
        style={[styles.hint, { top: insets.top + 16 }, hintStyle]}
      >
        <View style={[styles.hintPill, { backgroundColor: chromeBg }]}>
          <Text variant="subhead" color={chromeFg}>
            {meta.hint}
          </Text>
        </View>
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={close}
        hitSlop={10}
        style={[styles.close, { top: insets.top + SPACE.sm, backgroundColor: chromeBg }]}
      >
        <Icon name="close" size={18} color={chromeFg} />
      </Pressable>

      {checkout && (
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACE.lg }]}
        >
          <Surface elevation="lg">
            <Text variant="title3">Feeling a little better?</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
              There's no wrong answer.
            </Text>
            <View style={styles.answers}>
              <Button label="Better" size="md" variant="tinted" onPress={() => answer('better')} />
              <Button label="About the same" size="md" variant="tinted" onPress={() => answer('same')} />
              <Button label="Not really" size="md" variant="tinted" onPress={() => answer('no')} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Keep going"
              onPress={() => {
                setCheckout(false);
                setRound((r) => r + 1);
              }}
              style={styles.keepGoing}
            >
              <Text variant="subhead" tone="secondary">
                Keep going
              </Text>
            </Pressable>
          </Surface>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#131316' },
  hint: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hintPill: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    borderRadius: 999,
  },
  close: {
    position: 'absolute',
    right: SPACE.gutter,
    width: MIN_TAP - 6,
    height: MIN_TAP - 6,
    borderRadius: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACE.gutter,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  answers: { gap: SPACE.sm, marginTop: SPACE.xl },
  keepGoing: {
    alignSelf: 'center',
    marginTop: SPACE.md,
    minHeight: 32,
    justifyContent: 'center',
  },
});

export default EscapePlayerScreen;
