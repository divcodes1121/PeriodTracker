# CLAUDE.md — Period Tracker

AI-powered menstrual health app. Expo / React Native, runs on iOS, Android, and web from one codebase. Goal: production-grade app for the App Store + Play Store.

## Stack
- Expo SDK 56, React Native 0.85, React 19 (new JSX transform — **don't import `React` unless you use `React.FC`/namespace**).
- TypeScript (strict). Navigation: `@react-navigation` (native-stack + bottom-tabs). State: **Zustand**.
- UI/motion: `react-native-reanimated` v4, `react-native-svg`, `expo-linear-gradient`, `expo-blur`, `expo-haptics`.
- Persistence: `@react-native-async-storage/async-storage`. Dates: `date-fns`.
- Installed but **unused / for later**: `@react-native-firebase/*`, `axios`, `lottie-react-native`, `react-native-chart-kit` (used in Analytics), `expo-glass-effect` (iOS-only, we use `expo-blur` instead for cross-platform glass).

## Run & verify
- **Web dev server:** `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1 npx expo start --web --port 8082`
  (the flag is required — see Gotchas). Force a bundle compile: `curl .../index.bundle?platform=web&dev=true`.
- **Typecheck:** `npx tsc --noEmit` (ignore pre-existing `expo-image` errors, see Gotchas).
- **Visual check without a device:** headless Chrome screenshot, or `puppeteer-core` (installed `--no-save`) seeding `localStorage['period-tracker-store']` to skip onboarding. Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`. Web is a faithful *logic* preview; animations/haptics only feel right on device.

## Architecture

### State — `src/store/appStore.ts`
Single Zustand store, **persisted** via `persist` + `createJSONStorage(AsyncStorage)`.
- `partialize` persists data + settings only (not transient UI flags).
- A **`dateReviver`** turns ISO strings back into `Date` objects on hydration (types use `Date` everywhere).
- `hasHydrated` flag flips true after disk load; `App.tsx` shows a splash until then to avoid an onboarding flash on relaunch.
- Collections: `periodEntries`, **`symptomLogs`**, `moodEntries`, `healthMetrics`, `aiInsights`, `partnerAccess`; plus `user`, `theme`, `enableNotifications/AIInsights`, `showOnboarding`.

### Data model — `src/types/index.ts`
- **`SymptomLog` is separate from `PeriodEntry`** (deliberate). Logging symptoms on a non-period day must NOT create a period entry, or it corrupts cycle-length math. `upsertSymptomLog` merges by calendar day. `AIInsightsScreen` reads symptoms from `symptomLogs`.
- Cycle math lives in `src/utils/cycleCalculations.ts` (pure functions: phase, ovulation, fertility window, variability, predictions). Most testable code — no tests exist yet.

### Navigation — `src/navigation/`
- `RootNavigator.tsx`: root stack swaps `Onboarding` ↔ `MainTabs` on `showOnboarding || !user`. Tabs (Home/Calendar/Analytics/Settings) each wrap their own native stack; `SymptomLogger`, `MoodTracker`, `AIInsights` live only in the Home stack.
- Tab bar: frosted `BlurView`, theme-aware; icons are **`EmojiChip` water-bubbles** that burst when their tab becomes active.
- **Browser-style back/forward:** `navRef.ts` (nav container ref) + `useNavHistory.ts` (separate Zustand store). It snapshots the full nav state on each distinct page and keeps a pointer; back/forward restore snapshots, a new nav truncates forward entries. Wired in `App.tsx` via `onReady`/`onStateChange`. Rendered by `NavControls.tsx`.

### Theme — `src/theme/`
- `palette.ts`: `lightPalette` / `darkPalette` (`ThemePalette` type). Brand colors (primary, phase colors) stay in `constants/index.ts` `COLORS`; **only surfaces/text/atmosphere change per theme**.
- `useTheme()` reads `theme` from the store (reactive → whole UI re-themes on toggle). Returns `{ colors, isDark, toggle, setTheme }`.
- Toggle lives top-right on Home (`ThemeToggle`) and as a row in Settings. `StatusBar` adapts. App is wrapped in `SafeAreaProvider` (required by the safe-area inset hook).

## Design system — "Aurora Glass"
Tokens in `src/constants/index.ts`: `AURORA`, `PHASE_GRADIENTS`, `GLASS`. Reusable components in `src/components/`:
- **`GradientBackground`** — animated aurora gradient + drifting glow orbs (SVG radial) + flowing waves + rising droplets; theme-aware; centers content at `CONTENT_MAX_WIDTH` with a **44px top band reserved** for the nav arrows.
- **`GlassCard`** — frosted `BlurView` + translucent tint + bright top-edge highlight. **No drop shadow** (removed on user request; border defines the edge).
- **`CycleRing`** — animated gradient SVG progress ring (hero on Home).
- **`EmojiChip`** — translucent **water-bubble** wrapping an emoji (gloss highlight, sparkle, white under-glow only — no dark shadow). Taps do a **bubble burst** (squash → ring shockwave → droplets scatter → spring back) + haptic. Props: `onPress`, `trigger` (external burst), `disabled`, `float`. When it navigates, nav is delayed ~240ms so the burst is seen. **Used for every icon in the app.**
- **`Ripple`** — material touch-ripple + spring press + haptic (quick-action tiles, buttons).
- **`ThemeToggle`**, **`NavControls`** (thin white SVG line-arrows, top-left, disabled at history ends), **`DateField`** (native picker on device, `YYYY-MM-DD` text fallback on web).
- **`src/utils/responsive.ts`**: `scale()`, `fontScale()`, `CONTENT_MAX_WIDTH` — clamp-scaled for phone→tablet→web.

### Screen style convention
Theme-aware screens build styles with a factory: `const styles = useMemo(() => makeStyles(c), [c])` where `const makeStyles = (c: ThemePalette) => StyleSheet.create({...})`. Use `c.text/textSecondary/...` for text & surfaces, `COLORS.*` for brand/phase colors. All screens redesigned in Aurora Glass, light + dark.

## Environment gotchas (fix before EAS release)
1. **Node 21.3.0 is too old.** RN 0.85 wants Node 20.19+/22.13+/24.3+. It already breaks Metro's error reporter (`util.styleText is not a function`) so real bundling errors show garbled. **Install Node 22 LTS.**
2. **`expo-router` is present but unused.** SDK 56 flags it as incompatible with `@react-navigation` (which we use). Must set `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` to bundle, or remove `expo-router` from the tree. Will block EAS builds otherwise.
3. **Pre-existing `expo-image` typecheck errors** in leftover template components (`animated-icon.tsx`, `web-badge.tsx`) — unused by the app; ignore or delete.
4. Dev server sometimes stops between sessions — just restart it.
5. `app.json` sets native `userInterfaceStyle: "light"`; consider `"automatic"` so native dialogs match dark mode in a real build.

## Done
Persistence + hydration · onboarding last-period date + validation · symptom-log/cycle-math separation · full Aurora Glass redesign (all screens, light + dark) · water-bubble icons with burst · glass tab bar · browser-style back/forward.

## Not done / next (roadmap order)
1. **Notifications** — `src/services/notifications.ts` (empty `services/` folder), on-device period/log reminders via `expo-notifications`.
2. **Backend/auth** — needs a decision: **Firebase** (already in deps) vs **Supabase** (SQL + RLS, stronger privacy story). Then cloud sync, account + in-app data deletion (store requirement).
3. Apple Health / Health Connect, partner sharing, PDF export, widgets.
4. Tests for `cycleCalculations.ts`; Sentry; CI/CD (EAS Build/Submit/Update).
5. Privacy: this category gets heavy scrutiny — accurate store data-safety labels, data minimization, GDPR export/delete, age gate. Keep a local-only mode as a selling point.

## Notes
- Sensitive health data — minimize collection, no ad/tracking SDKs, encrypt at rest/in transit.
- Root has redundant docs (`README*.md`, `FEATURES.md`, `PROJECT_SUMMARY.md`, `QUICKSTART.md`) — this file supersedes them for dev orientation.
