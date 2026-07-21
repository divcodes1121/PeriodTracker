# Store submission notes

Answers for the Play Data Safety form and the App Store privacy questionnaire,
plus the rest of the submission checklist. Drafted against what the code does.

> These forms are **declarations you are accountable for**. Getting them wrong
> is a policy violation, not a typo — Google has removed apps for data-safety
> mismatches. Re-check every answer before each submission, and especially
> before any release that adds a backend.

---

## Google Play — Data Safety

**Does your app collect or share any of the required user data types?**
→ **No.**

That answer is only correct because of a distinction Play draws explicitly:
data that stays on the device and is never transmitted off it is **not
"collected"** in Play's sense. This app stores health data locally and has no
network capability at all, so nothing is collected or shared.

If you are asked to elaborate:

| Question | Answer |
|---|---|
| Is data encrypted in transit? | Not applicable — no data is transmitted |
| Can users request data deletion? | Yes — Settings → Log out and erase |
| Is data collection required to use the app? | No data is collected |
| Do you share data with third parties? | No |
| Do you use data for advertising or marketing? | No |
| Third-party analytics or crash SDKs? | None present |

**Health apps get extra scrutiny.** Expect Play to ask about the health data
category. The honest, defensible position: it is entered by the user, stored
only on their device, never transmitted, and erasable in one action.

---

## Apple App Store — Privacy ("Nutrition Label")

**Data collection:** → **"Data Not Collected"**

Apple's definition matches Play's here: data that never leaves the device is
not collected. Select *Data Not Collected* and no further categories apply.

**App Privacy questions:**

| Question | Answer |
|---|---|
| Do you or your third-party partners collect data? | No |
| Do you use data for tracking (ATT)? | No — no ATT prompt needed |
| Third-party SDKs that collect data? | None |

**`NSPrivacyTracking` is already `false`** in `app.json`'s `privacyManifests`,
with an empty tracking-domains list. That matches the above.

**Health data note.** The App Store Review Guidelines (§5.1.3) forbid using
HealthKit-style data for advertising or sharing it with third parties, and
require a privacy policy. All satisfied — but note the app does **not**
integrate HealthKit at all, so those specific entitlement rules do not apply
yet. They will if Apple Health integration is added later.

---

## Age rating

- **Play:** likely **Teen / 13+**. There is no objectionable content, but
  reproductive health topics usually push it above "Everyone".
- **Apple:** likely **12+** for "Infrequent/Mild Medical or Treatment
  Information".

Answer the questionnaires honestly rather than aiming for a rating. Getting
caught understating is worse than a higher rating.

---

## Required before you can submit

- [ ] **Privacy policy hosted at a public URL.** Draft is in `PRIVACY.md`;
      fill in its TODOs. GitHub Pages on this repo is free and sufficient.
- [ ] **Contact email** — real and monitored. Used on both stores and in the
      policy.
- [ ] **Store listing copy** — title, short description, full description.
- [ ] **Screenshots** — Play wants 2–8 phone shots; Apple wants 6.7" and 6.5"
      sets. **Take these from a real build on a real device**, not the browser
      preview.
- [ ] **Feature graphic** (Play, 1024×500).
- [ ] **App icon** — already in `assets/`.
- [ ] **Developer accounts** — Play $25 one-time, Apple $99/year.

## Decide before first publish — these are permanent

- [ ] **Android package name** is currently `com.periodtracker.app`. It cannot
      be changed after publishing; a new one is a new app with no reviews and
      no installs.
- [ ] **iOS bundle identifier** is `com.periodtracker.app`. Same warning.
- [ ] **App name** — "Period Tracker" is extremely generic and will be hard to
      find in search. Worth reconsidering before launch rather than after.

## Signing keys — protect these

- The Android keystore is held by Expo, tied to the `div_codes1121` account.
  Back it up: `eas credentials` → Android → Download keystore. Store it
  privately and offline.
- **Opt into Play App Signing** when you first upload. Google then holds the
  release key and yours becomes an upload key, which makes losing it
  recoverable instead of fatal. Without it, a lost keystore means you can never
  update the app again.

## Known gaps a reviewer may notice

Be aware of these — none blocks submission, but do not claim otherwise:

- **Data export** shows "Soon" in Settings. GDPR grants a portability right, so
  build it before pushing in the EU.
- **Biometric lock** shows "Soon". A health app without an app lock is normal,
  but do not market privacy features that are not built.
- **No account recovery.** By design, but it means a lost or wiped phone means
  lost data. Worth stating plainly in the listing so it is not a surprise.

## When cloud sync arrives

Every "No" above becomes a "Yes", and both declarations must be rewritten
before that release ships. Health data crossing the network changes the legal
posture entirely: explicit consent, a lawful basis under GDPR Article 9, a
processing agreement with the host, and server-side retention and deletion.
The local-only story is a genuine competitive advantage in this category —
consider keeping it as an option even after sync exists.
