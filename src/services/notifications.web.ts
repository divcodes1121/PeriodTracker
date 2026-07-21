import type { Reminder, ReminderInput } from '../utils/reminders';
import { buildReminders, limitReminders } from '../utils/reminders';

/**
 * Web stand-in for the notification service.
 *
 * `expo-notifications` does not resolve on web — it reaches for Android-only
 * modules and takes the whole bundle down with it, which broke the browser
 * preview the moment it was installed. Metro prefers a `.web.ts` sibling, so
 * this file keeps web building without a single Platform check leaking into
 * the calling code.
 *
 * It deliberately still runs `buildReminders`, so the schedule that *would* be
 * set is computed and returned. Web is where this app gets previewed, and a
 * stub that silently returns nothing would hide a broken schedule until device
 * testing. Nothing is delivered — browsers have their own permission model and
 * a background-scheduled local notification is not a thing we support here.
 */

export async function ensureChannel(): Promise<void> {
  // Channels are an Android concept.
}

export async function requestPermission(): Promise<boolean> {
  // No prompt on web: reporting false keeps the Settings toggle honest rather
  // than letting it sit on while nothing will ever arrive.
  return false;
}

export async function hasPermission(): Promise<boolean> {
  return false;
}

export async function syncReminders(input: ReminderInput): Promise<Reminder[]> {
  // Computed but not delivered — see the note above.
  return input.enabled ? limitReminders(buildReminders(input)) : [];
}

export async function cancelAll(): Promise<void> {
  // Nothing was ever scheduled.
}

export async function scheduled(): Promise<unknown[]> {
  return [];
}
