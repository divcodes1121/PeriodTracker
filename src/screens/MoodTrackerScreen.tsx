import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';
import { useAppStore } from '../store/appStore';
import Card from '../components/Card';
import Button from '../components/Button';
import { v4 as uuidv4 } from 'uuid';
import { MoodEntry } from '../types';

const MoodTrackerScreen = ({ navigation }: any) => {
  const { user, addMoodEntry } = useAppStore();
  const [mood, setMood] = useState<number>(3);
  const [stress, setStress] = useState<number>(3);
  const [energy, setEnergy] = useState<number>(3);
  const [sleep, setSleep] = useState<number>(7);
  const [water] = useState<number>(8);
  const [exercise] = useState<string>('');
  const [notes] = useState<string>('');

  const handleSave = () => {
    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const entry: MoodEntry = {
      id: uuidv4(),
      userId: user.id,
      timestamp: new Date(),
      mood,
      stress,
      energy,
      sleep,
      waterIntake: water,
      exercise,
      notes,
      createdAt: new Date(),
    };

    addMoodEntry(entry);
    Alert.alert('Success', 'Daily check-in saved!');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={TYPOGRAPHY.h2}>✨ Daily Check-in</Text>
          <Text style={[TYPOGRAPHY.body2, { color: COLORS.textSecondary }]}>
            Track your wellness today
          </Text>
        </View>

        {/* Mood Slider */}
        <Card style={styles.card}>
          <View style={styles.sliderHeader}>
            <Text style={TYPOGRAPHY.h4}>Mood</Text>
            <View style={styles.moods}>
              <Text style={styles.moodEmoji}>
                {['😢', '☹️', '😐', '🙂', '😄'][mood - 1]}
              </Text>
              <Text style={TYPOGRAPHY.body2}>{mood}/5</Text>
            </View>
          </View>
          <View style={styles.sliderContainer}>
            {[1, 2, 3, 4, 5].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.sliderButton,
                  mood === val && styles.sliderButtonActive,
                ]}
                onPress={() => setMood(val)}
              >
                <Text style={TYPOGRAPHY.caption}>{val}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Stress Level */}
        <Card style={styles.card}>
          <View style={styles.sliderHeader}>
            <Text style={TYPOGRAPHY.h4}>Stress Level</Text>
            <Text style={TYPOGRAPHY.body2}>{stress}/5</Text>
          </View>
          <View style={styles.sliderContainer}>
            {[1, 2, 3, 4, 5].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.sliderButton,
                  stress === val && styles.sliderButtonActive,
                ]}
                onPress={() => setStress(val)}
              >
                <Text style={TYPOGRAPHY.caption}>{val}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Energy Level */}
        <Card style={styles.card}>
          <View style={styles.sliderHeader}>
            <Text style={TYPOGRAPHY.h4}>Energy Level</Text>
            <Text style={TYPOGRAPHY.body2}>{energy}/5</Text>
          </View>
          <View style={styles.sliderContainer}>
            {[1, 2, 3, 4, 5].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.sliderButton,
                  energy === val && styles.sliderButtonActive,
                ]}
                onPress={() => setEnergy(val)}
              >
                <Text style={TYPOGRAPHY.caption}>{val}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Sleep Hours */}
        <Card style={styles.card}>
          <View style={styles.sliderHeader}>
            <Text style={TYPOGRAPHY.h4}>Sleep Hours</Text>
            <Text style={TYPOGRAPHY.body2}>{sleep}h</Text>
          </View>
          <View style={styles.sliderContainer}>
            {[4, 5, 6, 7, 8, 9].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.sliderButton,
                  sleep === val && styles.sliderButtonActive,
                ]}
                onPress={() => setSleep(val)}
              >
                <Text style={TYPOGRAPHY.caption}>{val}h</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.buttonGroup}>
          <Button
            title="Save Check-in"
            onPress={handleSave}
            variant="primary"
            size="large"
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
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  moods: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  moodEmoji: {
    fontSize: 24,
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  sliderButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.divider,
    alignItems: 'center',
  },
  sliderButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  buttonGroup: {
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
});

export default MoodTrackerScreen;
