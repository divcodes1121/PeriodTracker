import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { buildReminders, limitReminders, type Reminder, type ReminderInput } from '../utils/reminders';

/**
 * On-device reminders.
 *
 * This module is the only place that talks to `expo-notifications`. Everything
 * about *what* to schedule and *when* lives in utils/reminders.ts, which is
 * RN-free and node-tested — so the interesting decisions are covered by tests
 * and this file stays a thin, boring adapter.
 *
 * PRIVACY. Everything here is local. `scheduleNotificationAsync` fires from the
 * device's own scheduler; there is no push token, no server, and nothing leaves
 * the phone. That matters for a product whose Settings screen promises exactly
 * that, and it means notifications add nothing to the store data-safety
 * declaration beyond the notification permission itself.
 *
 * PERMISSION IS ASKED FOR LATE, ON PURPose. We do not prompt at launch — a
 * permission dialog before the user knows what the app is gets denied, and iOS
 * only lets you ask once. The prompt happens when they switch the Settings
 * toggle on, at which point the request is obviously connected to a thing they
 * just asked for.
 */

/** Foreground behaviour: show quietly, never hijack what the user is doing. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Android requires an explicit channel or notifications are silently dropped. */
export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('cycle', {
    name: 'Cycle reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    // No lights, no vibration pattern beyond the default: this is a calm app,
    // and a health reminder that buzzes aggressively reads as an alarm.
    sound: null,
    vibrationPattern: [0, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    showBadge: false,
  });
}

/**
 * Asks for permission, returning whether we have it.
 *
 * Never re-prompts if already decided — on iOS the OS ignores repeat requests
 * anyway, and on Android it would be nagging. A user who said no is sent to
 * Settings by the caller instead.
 */
export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return asked.granted;
}

export async function hasPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

/**
 * Replaces every scheduled reminder with a freshly computed set.
 *
 * Cancel-then-schedule rather than diffing: the whole schedule is derived from
 * cycle state, so recomputing is cheap and idempotent, whereas incremental
 * updates are exactly how duplicate notifications happen. Reminder ids are
 * stable per cycle, so this converges rather than accumulating.
 *
 * Returns what was scheduled, so callers and tests can assert on it.
 */
export async function syncReminders(input: ReminderInput): Promise<Reminder[]> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!input.enabled) return [];
  if (!(await hasPermission())) return [];

  await ensureChannel();

  const reminders = limitReminders(buildReminders(input));

  for (const r of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: {
        title: r.title,
        body: r.body,
        // false, not null: silent delivery. A cycle reminder that chimes in a
        // meeting is a reminder people turn off.
        sound: false,
        // Nothing about the cycle goes in the payload beyond the kind — the
        // body text is already on the lock screen and does not need repeating
        // in machine-readable form.
        data: { kind: r.kind },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.at,
        channelId: 'cycle',
      },
    });
  }

  return reminders;
}

/** Used when the user switches reminders off, or erases their data. */
export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Debug helper — what the OS currently holds. */
export async function scheduled(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}
