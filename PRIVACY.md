# Privacy Policy — Period Tracker

**Effective date:** `TODO — the date you publish this`
**Contact:** `TODO — a real monitored email address`

> **Before publishing, you must fill in every `TODO` above and read the
> "Notes for the developer" section at the bottom. This document was drafted
> against what the code actually does, and every factual claim in it was
> verified against the source — but it is not legal advice, and health apps
> face heightened scrutiny in the EU, UK, and several US states.**

---

## The short version

Period Tracker keeps everything on your phone. There is no account, no server,
and no analytics. Your cycle data is never transmitted anywhere, because the
app has no ability to transmit it — there is not a single network request in
the application.

If you delete the app, your data is gone with it. Nobody else ever had a copy.

---

## What the app stores

All of this is stored **only in the app's private storage on your device**:

| What | Why |
|---|---|
| Your name and date of birth | To personalise the app and calculate cycle context |
| Cycle length and period length | To predict your next period and cycle phase |
| Logged periods — start date, end date, flow | The basis of every prediction |
| Symptoms and their severity | Shown back to you in Analytics and Insights |
| Mood, stress, energy, and sleep check-ins | Shown back to you in Analytics and Insights |
| Reset session check-outs ("did that help?") | To decide whether to suggest a reset again |
| Your settings — theme, reminders, insights toggles | To remember your preferences |

**Sensitive category.** Menstrual and reproductive health data is sensitive
personal information under GDPR (Article 9), UK GDPR, and several US state
laws. It is treated accordingly: it stays on your device, it is never
transmitted, and it is never used for advertising or profiling.

## What the app does *not* do

- **No account.** No sign-up, no login, no password, no email verification.
- **No servers.** The app makes no network requests of any kind.
- **No analytics or crash reporting.** No Google Analytics, no Firebase, no
  Sentry, no Amplitude, no Mixpanel — none of it is present in the app.
- **No advertising and no tracking SDKs.** Nothing profiles you, and nothing
  builds an advertising identity from your use of the app.
- **No selling or sharing of data.** There is nothing to sell and nobody to
  share it with.
- **No location.** The app never requests or accesses your location.
- **No contacts, photos, camera, or microphone.**
- **No data brokers, and no third-party processors.**

## "AI insights" — what that actually means

The app shows patterns drawn from your own logs, labelled as insights. **These
are computed on your device using ordinary arithmetic over data you entered.**
Nothing is sent to any AI service, no third-party model is called, and no
external company sees your data. If you switch AI Insights off in Settings, the
app stops generating them.

## Notifications

If you turn reminders on, the app asks your device for notification permission
and schedules reminders **locally, using your phone's own scheduler**. There is
no push service and no push token, so nothing about your cycle is ever sent to
Apple, Google, or anyone else in order to deliver a reminder.

Reminders are worded to avoid revealing anything sensitive at a glance, and are
delivered without sound by default. On Android they are marked private on the
lock screen.

You can turn them off at any time in Settings, which cancels everything queued.

## Permissions

The app requests exactly one permission, and only when you ask for the feature:

- **Notifications** — requested at the moment you switch reminders on, never at
  launch. Declining costs you nothing else in the app.

The app explicitly **blocks** several permissions that would otherwise be added
by its dependencies: microphone, phone state, and calendar access. It does not
use them and does not want them.

## Your control over your data

- **See it** — everything the app knows is visible in the app.
- **Change it** — any entry can be edited or deleted.
- **Erase all of it** — Settings → *Log out and erase*. This permanently
  deletes every period, symptom, mood, and setting from your device, and
  cancels any scheduled reminders. It cannot be undone, because there is no
  backup anywhere for us to restore from.
- **Take it with you** — data export is planned but **not yet available**. See
  "Not yet implemented" below.

Because the data never leaves your device, we cannot access, recover, correct,
or delete it on your behalf. You hold the only copy.

## Device backups

If you have iCloud Backup or Google Backup enabled, your phone may include this
app's data in its own encrypted device backup. That is your device's backup
system, governed by Apple's or Google's privacy policy — not ours, and not
something the app sends anywhere itself. You can exclude the app from backups
in your device settings.

## Children

This app is not directed at children under 13 (or under 16 in the EEA/UK). We
do not knowingly collect data from them. Since there is no account and no data
transmission, we have no way to identify a user's age beyond what is entered on
the device.

## Your rights (GDPR / UK GDPR / CCPA and similar)

You have rights to access, correct, delete, and port your personal data, and to
object to processing. In this app those rights are exercised **directly on your
device**: the data is in your hands, visible in the app, editable, and erasable
in one action.

We do not sell or share personal information as those terms are defined under
the CCPA/CPRA. We have never done so and the app is not capable of it.

## Changes to this policy

If this policy changes materially — for example if a future version adds cloud
sync or an account — you will be told inside the app before the change takes
effect, and the effective date above will be updated. A version that transmits
your health data will never do so without your explicit, informed opt-in.

## Contact

`TODO — email address`

---

# Notes for the developer — delete this section before publishing

## You must fill in

1. **Effective date** and a **real, monitored contact email**. Both stores
   reject placeholder contact details, and GDPR requires a working channel.
2. **A hosting URL.** Both stores need a public link. GitHub Pages on this repo
   is free and sufficient.
3. **Data controller identity.** If you are publishing as an individual rather
   than a company, GDPR still expects a name and a way to reach you. Decide
   what you are comfortable making public — a dedicated email alias is normal.

## Claims verified against the source, as of this commit

Each of these was checked, not assumed. **Re-verify before each release**, and
especially before adding any backend:

- **No network requests.** `grep` for `fetch(`, `XMLHttpRequest`, `axios`, and
  `http(s)://` across `src/` returns nothing outside comments.
- **No analytics or ad SDKs.** Firebase, axios, and lottie were removed from
  `package.json`; nothing replaced them.
- **AI insights are local.** `AIInsightsScreen` computes from the local store.
  No model, no API.
- **Notifications are local.** `services/notifications.ts` uses only
  `scheduleNotificationAsync`. No push token is ever requested.
- **Erase is real.** `clearStore()` wipes the persisted store, and Settings
  also calls `cancelAll()` so queued reminders die with it.
- **Permissions.** `app.json` declares an empty `permissions` array and blocks
  RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, FOREGROUND_SERVICE,
  FOREGROUND_SERVICE_MEDIA_PLAYBACK, READ_PHONE_STATE, READ_CALENDAR, and
  WRITE_CALENDAR.

## Not yet implemented — do not claim these

- **Data export.** The policy says export is planned and unavailable, which is
  accurate: the Settings row shows "Soon". GDPR grants a portability right, so
  build this before marketing in the EU. Do not reword this section until the
  feature exists.
- **Biometric lock.** Also "Soon" in Settings. Not mentioned in the policy on
  purpose — do not imply the app is locked when it is not.

## This must be revisited if you add Supabase

The roadmap has cloud sync. The moment any data leaves the device, most of this
document becomes false. A sync release needs: a rewritten policy, updated store
data-safety declarations, a lawful basis for processing special-category health
data (explicit consent, in practice), a data processing agreement with your
host, and a defined retention and deletion path on the server. Treat the
local-only guarantee as a feature worth keeping, not a temporary state.

## Legal caveat

This is a drafted starting point, not legal advice. Menstrual health apps have
drawn regulatory and press attention over exactly these questions. If you plan
to publish in the EU, UK, or California at any scale, have a solicitor or
privacy specialist review this before submission.
