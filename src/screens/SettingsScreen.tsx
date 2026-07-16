import { View, StyleSheet, Alert } from 'react-native';
import Screen from '../components/Screen';
import Surface from '../components/Surface';
import Text from '../components/Text';
import Icon from '../components/Icon';
import Row from '../components/Row';
import Toggle from '../components/Toggle';
import Reveal from '../components/Reveal';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/appStore';
import { COLORS } from '../constants';
import { SPACE, RADIUS } from '../theme/tokens';

/** Section heading sitting above a grouped card. */
const GroupLabel = ({ children }: { children: string }) => (
  <Text variant="overline" tone="tertiary" style={styles.groupLabel}>
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
    clearStore,
  } = useAppStore();
  const { colors: c, isDark, toggle } = useTheme();

  const handleLogout = () => {
    Alert.alert('Log out', 'This will clear your data on this device. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          clearStore();
          navigation.replace?.('Onboarding');
        },
      },
    ]);
  };

  const soon = (what: string) =>
    Alert.alert(what, 'This is not available yet — it is on the roadmap.');

  const initial = (user?.name ?? 'Y').trim().charAt(0).toUpperCase();

  return (
    <Screen title="Settings">
      {/* Profile */}
      <Reveal index={0}>
        <Surface style={{ marginBottom: SPACE.xxl }}>
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
        <Surface style={{ marginBottom: SPACE.xxl }}>
          <Row
            label="Notifications"
            description="Period and check-in reminders"
            icon="bell"
            iconTint={COLORS.warningDark}
            accessory={
              <Toggle
                value={enableNotifications}
                onValueChange={setEnableNotifications}
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
        <Surface style={{ marginBottom: SPACE.lg }}>
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
          <Row label="Log out and erase" icon="trash" iconTint="#C4566E" destructive onPress={handleLogout} last />
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
  promise: {
    flexDirection: 'row',
    gap: SPACE.md,
    paddingHorizontal: SPACE.xs,
    marginBottom: SPACE.xxl,
  },
  version: { textAlign: 'center', marginTop: SPACE.sm },
});

export default SettingsScreen;
