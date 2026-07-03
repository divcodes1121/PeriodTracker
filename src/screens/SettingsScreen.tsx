import { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Switch, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { fontScale, scale } from '../utils/responsive';
import { useAppStore } from '../store/appStore';
import GradientBackground from '../components/GradientBackground';
import GlassCard from '../components/GlassCard';
import EmojiChip from '../components/EmojiChip';
import Ripple from '../components/Ripple';

const SettingsScreen = ({ navigation }: any) => {
  const {
    user,
    enableNotifications,
    setEnableNotifications,
    enableAIInsights,
    setEnableAIInsights,
    clearStore,
  } = useAppStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(enableNotifications);
  const [aiEnabled, setAiEnabled] = useState(enableAIInsights);

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

  const onNotif = (v: boolean) => {
    setNotificationsEnabled(v);
    setEnableNotifications(v);
  };
  const onAI = (v: boolean) => {
    setAiEnabled(v);
    setEnableAIInsights(v);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <Text style={styles.title}>Settings</Text>
          </Animated.View>

          {/* Profile */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <GlassCard style={styles.card}>
              <View style={styles.profile}>
                <EmojiChip emoji="🌷" size={scale(56)} colors={['#FFFFFF', '#FFD9E6']} float />
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{user?.name ?? 'You'}</Text>
                  <Text style={styles.profileSub}>Cycle length · {user?.cycleLength ?? '—'} days</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Preferences */}
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <GlassCard style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingLabel}>
                  <Text style={styles.settingEmoji}>🔔</Text>
                  <View>
                    <Text style={styles.settingTitle}>Notifications</Text>
                    <Text style={styles.settingDesc}>Period, ovulation & check-in reminders</Text>
                  </View>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={onNotif}
                  trackColor={{ false: COLORS.divider, true: COLORS.primaryLight }}
                  thumbColor={notificationsEnabled ? COLORS.primary : COLORS.textTertiary}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingLabel}>
                  <Text style={styles.settingEmoji}>✨</Text>
                  <View>
                    <Text style={styles.settingTitle}>AI Insights</Text>
                    <Text style={styles.settingDesc}>Personalized predictions & patterns</Text>
                  </View>
                </View>
                <Switch
                  value={aiEnabled}
                  onValueChange={onAI}
                  trackColor={{ false: COLORS.divider, true: COLORS.primaryLight }}
                  thumbColor={aiEnabled ? COLORS.primary : COLORS.textTertiary}
                />
              </View>
            </GlassCard>
          </Animated.View>

          {/* Privacy & Security */}
          <Animated.View entering={FadeInDown.delay(220).springify()}>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>🔐 Privacy & Security</Text>
              {[
                ['Biometric Lock', 'Coming soon'],
                ['Data Export', 'Download your data'],
                ['Privacy Policy', 'Read our policy'],
              ].map(([label, hint], i, arr) => (
                <View key={label}>
                  <View style={styles.linkRow}>
                    <Text style={styles.linkLabel}>{label}</Text>
                    <Text style={styles.linkHint}>{hint} ›</Text>
                  </View>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </GlassCard>
          </Animated.View>

          {/* About */}
          <Animated.View entering={FadeInDown.delay(280).springify()}>
            <GlassCard style={styles.card}>
              <Text style={styles.cardTitle}>ℹ️ About</Text>
              <View style={styles.linkRow}>
                <Text style={styles.linkLabel}>App Version</Text>
                <Text style={styles.linkHint}>1.0.0</Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Logout */}
          <Animated.View entering={FadeInDown.delay(340).springify()}>
            <Ripple onPress={handleLogout} borderRadius={18} style={styles.logout} rippleColor="rgba(230,57,115,0.15)">
              <Text style={styles.logoutText}>Log out</Text>
            </Ripple>
          </Animated.View>

          <View style={{ height: scale(110) }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.lg },
  scroll: { paddingTop: SPACING.md },
  header: { marginTop: SPACING.md, marginBottom: SPACING.lg },
  title: { ...TYPOGRAPHY.h2, fontSize: fontScale(28), color: COLORS.text },

  card: { marginBottom: SPACING.lg },
  cardTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: SPACING.md },

  profile: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  profileName: { ...TYPOGRAPHY.h4, color: COLORS.text },
  profileSub: { ...TYPOGRAPHY.body2, color: COLORS.textSecondary, marginTop: 2 },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  settingLabel: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1, paddingRight: SPACING.md },
  settingEmoji: { fontSize: 22 },
  settingTitle: { ...TYPOGRAPHY.body1, fontWeight: '600', color: COLORS.text },
  settingDesc: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },

  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: SPACING.md },

  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs },
  linkLabel: { ...TYPOGRAPHY.body1, color: COLORS.text },
  linkHint: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

  logout: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  logoutText: { ...TYPOGRAPHY.button, color: COLORS.error, fontSize: 16 },
});

export default SettingsScreen;
