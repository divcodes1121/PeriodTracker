import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Icon from '../components/Icon';
import Row from '../components/Row';
import Toggle from '../components/Toggle';
import Reveal from '../components/Reveal';
import Notice from '../components/Notice';
import { useTheme } from '../theme/useTheme';
import { requestPermission, syncReminders, cancelAll } from '../services/notifications';
import { deriveCycleContext, getPredictedNextPeriod } from '../utils/cycleCalculations';
import { useAtmosphere } from '../theme/useAtmosphere';
import { useAppStore } from '../store/appStore';
import { COLORS } from '../constants';
import { SPACE, RADIUS, MOTION, MIN_TAP } from '../theme/tokens';

/** Section heading sitting above a grouped card. */
const GroupLabel = ({ children }: { children: string }) => (
  <Text variant="overline" tone="secondary" style={styles.groupLabel}>
    {children}
  </Text>
);

const SettingsScreen = ({ navigation }: any) => {
  const {
    user,
    enableNotifications,
    setEnableNotifications,
    enableAIInsights,
    setEnableAIInsights,
    periodEntries,
    clearStore,
  } = useAppStore();
  const { colors: c, isDark, toggle } = useTheme();
  const atmos = useAtmosphere();

  /**
   * Erasing is confirmed inline rather than through Alert.alert, which is a
   * no-op on RN-web — the button-array confirm meant this action simply could
   * not be completed on web at all.
   *
   * It is also the most destructive thing in the app (irreversible, and the
   * data is local-only so there is no server copy to restore from), so the
   * confirmation states the consequence plainly instead of asking "Continue?".
   */
  const [confirmErase, setConfirmErase] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleErase = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    // Queued reminders live with the OS, not in our store — erasing the account
    // without cancelling them would leave the phone announcing the cycle of a
    // user who just deleted their data.
    cancelAll().catch(() => {});
    clearStore();
    navigation.replace?.('Onboarding');
  };

  const soon = (what: string) => setNotice(`${what} is not available yet — it is on the roadmap.`);

  /**
   * Turning reminders on is where we ask the OS for permission — not at launch.
   * A permission dialog before the user knows what the app does gets denied,
   * and iOS only lets you ask once.
   *
   * If they decline, the toggle goes back off rather than sitting on while
   * nothing arrives: a switch that claims to be on and does nothing is worse
   * than one that is honestly off.
   */
  const handleNotifications = async (next: boolean) => {
    if (!next) {
      setEnableNotifications(false);
      await cancelAll();
      setNotice(null);
      return;
    }

    const granted = await requestPermission();
    if (!granted) {
      setEnableNotifications(false);
      setNotice('Reminders need notification permission, which is switched off for this app in your device settings.');
      return;
    }

    setEnableNotifications(true);
    setNotice(null);

    if (!user) return;
    const { lastPeriodStart, cycleLength } = deriveCycleContext(user, periodEntries);
    const newest = periodEntries.length
      ? periodEntries.reduce((a, b) => (a.startDate > b.startDate ? a : b)).startDate
      : null;
    await syncReminders({
      nextPeriod: getPredictedNextPeriod(lastPeriodStart, cycleLength),
      lastLogged: newest,
      enabled: true,
    });
  };

  const initial = (user?.name ?? 'Y').trim().charAt(0).toUpperCase();

  return (
    <Screen title="Settings">
      {/* Profile */}
      <Reveal index={0}>
        <Surface variant="hero" style={{ marginBottom: SPACE.xxl, overflow: 'hidden' }}>
          <View pointerEvents="none" style={[styles.profileWash, { backgroundColor: atmos.glow }]} />
          <View style={styles.profile}>
            <View style={[styles.avatar, { backgroundColor: COLORS.primarySoft }]}>
              <Text variant="title2" color={COLORS.primaryDark}>
                {initial}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title3">{user?.name ?? 'You'}</Text>
              <Text variant="callout" tone="secondary" style={{ marginTop: 2 }}>
                {user?.cycleLength ?? '—'}-day cycle · {user?.periodLength ?? '—'}-day period
              </Text>
            </View>
          </View>
        </Surface>
      </Reveal>

      {/* Preferences */}
      <Reveal index={1}>
        <GroupLabel>Preferences</GroupLabel>
        <Surface variant="quiet" lift style={{ marginBottom: SPACE.xxl }}>
          <Row
            label="Notifications"
            description="Period and check-in reminders"
            icon="bell"
            iconTint={COLORS.warningDark}
            accessory={
              <Toggle
                value={enableNotifications}
                onValueChange={(v) => {
                  handleNotifications(v).catch(() => {
                    setEnableNotifications(false);
                    setNotice('Could not set up reminders on this device.');
                  });
                }}
                accessibilityLabel="Notifications"
              />
            }
          />
          <Row
            label="AI Insights"
            description="Patterns from your own logs"
            icon="sparkles"
            iconTint={COLORS.primaryDark}
            accessory={
              <Toggle
                value={enableAIInsights}
                onValueChange={setEnableAIInsights}
                accessibilityLabel="AI Insights"
              />
            }
          />
          <Row
            label="Dark appearance"
            icon={isDark ? 'moon' : 'sun'}
            iconTint={COLORS.accentDark}
            accessory={<Toggle value={isDark} onValueChange={toggle} accessibilityLabel="Dark appearance" />}
            last
          />
        </Surface>
      </Reveal>

      {/* Privacy */}
      <Reveal index={2}>
        <GroupLabel>Privacy</GroupLabel>
        <Surface variant="quiet" lift style={{ marginBottom: SPACE.lg }}>
          <Row
            label="Biometric lock"
            icon="lock"
            iconTint={COLORS.successDark}
            value="Soon"
            onPress={() => soon('Biometric lock')}
          />
          <Row
            label="Export my data"
            icon="note"
            iconTint={COLORS.info}
            onPress={() => soon('Data export')}
          />
          <Row
            label="Privacy policy"
            icon="info"
            iconTint={c.textSecondary}
            onPress={() => soon('Privacy policy')}
            last
          />
        </Surface>

        <Notice message={notice} tone="info" />

        {/* The privacy promise is the product's spine — state it plainly. */}
        <View style={styles.promise}>
          <Icon name="lock" size={15} color={c.textTertiary} />
          <Text variant="caption" tone="tertiary" style={{ flex: 1 }}>
            Your health data stays on this device. Nothing is uploaded, and there are no tracking
            or advertising SDKs in this app.
          </Text>
        </View>
      </Reveal>

      {/* Account */}
      <Reveal index={3}>
        <GroupLabel>Account</GroupLabel>
        <Surface style={{ marginBottom: SPACE.xxl }}>
          {confirmErase ? (
            <Animated.View entering={FadeIn.duration(MOTION.fast)}>
              <Text variant="headline">Erase everything?</Text>
              <Text variant="callout" tone="secondary" style={{ marginTop: SPACE.sm }}>
                This deletes every period, symptom and mood you have logged on this device. Because
                nothing is uploaded, there is no copy to restore from. This cannot be undone.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel erase"
                  onPress={() => setConfirmErase(false)}
                  style={[styles.confirmBtn, { backgroundColor: c.fill }]}
                >
                  <Text variant="button" tone="secondary">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm erase all data"
                  onPress={handleErase}
                  style={[styles.confirmBtn, { backgroundColor: COLORS.error }]}
                >
                  <Text variant="button" color="#FFFFFF">
                    Erase
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          ) : (
            <Row
              label="Log out and erase"
              icon="trash"
              iconTint="#C4566E"
              destructive
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setConfirmErase(true);
              }}
              last
            />
          )}
        </Surface>
      </Reveal>

      <Text variant="caption" tone="tertiary" style={styles.version}>
        Version 1.0.0
      </Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: { marginBottom: SPACE.md, marginLeft: SPACE.xs },
  /** Ambient wash behind the profile — the card belongs to today's light. */
  profileWash: { position: 'absolute', top: -70, right: -50, width: 190, height: 190, borderRadius: 95 },
  promise: {
    flexDirection: 'row',
    gap: SPACE.md,
    paddingHorizontal: SPACE.xs,
    marginBottom: SPACE.xxl,
  },
  version: { textAlign: 'center', marginTop: SPACE.sm },

  confirmActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xl },
  confirmBtn: {
    flex: 1,
    minHeight: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
  },
});

export default SettingsScreen;
