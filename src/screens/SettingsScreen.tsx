import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { useAppStore } from '../store/appStore';
import Card from '../components/Card';
import Button from '../components/Button';

const SettingsScreen = ({ navigation }: any) => {
  const { user, enableNotifications, setEnableNotifications, enableAIInsights, setEnableAIInsights, clearStore } = useAppStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(enableNotifications);
  const [aiEnabled, setAiEnabled] = useState(enableAIInsights);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: () => {
          clearStore();
          navigation.replace('Onboarding');
        },
      },
    ]);
  };

  const handleNotificationsChange = (value: boolean) => {
    setNotificationsEnabled(value);
    setEnableNotifications(value);
  };

  const handleAIChange = (value: boolean) => {
    setAiEnabled(value);
    setEnableAIInsights(value);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={TYPOGRAPHY.h2}>⚙️ Settings</Text>
        </View>

        {/* Profile Section */}
        <Card style={styles.card}>
          <Text style={TYPOGRAPHY.h4}>👤 Profile</Text>
          <View style={styles.profileItem}>
            <Text style={TYPOGRAPHY.body2}>Name</Text>
            <Text style={[TYPOGRAPHY.body1, { fontWeight: '600' }]}>{user?.name}</Text>
          </View>
          <View style={[styles.profileItem, { borderTopWidth: 1, borderTopColor: COLORS.divider }]}>
            <Text style={TYPOGRAPHY.body2}>Cycle Length</Text>
            <Text style={[TYPOGRAPHY.body1, { fontWeight: '600' }]}>{user?.cycleLength} days</Text>
          </View>
        </Card>

        {/* Notifications */}
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={TYPOGRAPHY.h4}>🔔 Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsChange}
              trackColor={{ false: COLORS.divider, true: COLORS.primaryLight }}
              thumbColor={notificationsEnabled ? COLORS.primary : COLORS.textTertiary}
            />
          </View>
          <Text style={[TYPOGRAPHY.body2, { color: COLORS.textSecondary, marginTop: SPACING.sm }]}>
            Get reminders for period, ovulation, and daily check-ins
          </Text>
        </Card>

        {/* AI Insights */}
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={TYPOGRAPHY.h4}>✨ AI Insights</Text>
            <Switch
              value={aiEnabled}
              onValueChange={handleAIChange}
              trackColor={{ false: COLORS.divider, true: COLORS.primaryLight }}
              thumbColor={aiEnabled ? COLORS.primary : COLORS.textTertiary}
            />
          </View>
          <Text style={[TYPOGRAPHY.body2, { color: COLORS.textSecondary, marginTop: SPACING.sm }]}>
            Personalized predictions and health insights
          </Text>
        </Card>

        {/* Privacy & Security */}
        <Card style={styles.card}>
          <Text style={TYPOGRAPHY.h4}>🔐 Privacy & Security</Text>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={TYPOGRAPHY.body1}>Biometric Lock</Text>
            <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Coming soon</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={TYPOGRAPHY.body1}>Data Export</Text>
            <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Download your data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={TYPOGRAPHY.body1}>Privacy Policy</Text>
            <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Read our policy</Text>
          </TouchableOpacity>
        </Card>

        {/* About */}
        <Card style={styles.card}>
          <Text style={TYPOGRAPHY.h4}>ℹ️ About</Text>
          <View style={styles.aboutItem}>
            <Text style={TYPOGRAPHY.body1}>App Version</Text>
            <Text style={[TYPOGRAPHY.body1, { fontWeight: '600' }]}>1.0.0</Text>
          </View>
          <View style={[styles.aboutItem, { borderTopWidth: 1, borderTopColor: COLORS.divider }]}>
            <Text style={TYPOGRAPHY.body1}>Help & Support</Text>
            <Text style={[TYPOGRAPHY.caption, { color: COLORS.textSecondary }]}>Contact us anytime</Text>
          </View>
        </Card>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            size="large"
            style={{ borderColor: COLORS.error }}
          />
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  card: {
    marginBottom: SPACING.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingItem: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  profileItem: {
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aboutItem: {
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logoutContainer: {
    marginTop: SPACING.xl,
  },
});

export default SettingsScreen;
