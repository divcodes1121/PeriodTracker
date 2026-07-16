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
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`) — now **fully clean** (the old `expo-image` errors are gone). Test files are excluded from this config — they carry Jest globals the Expo `types` list doesn't include.
- **Unit tests:** `npm test` (Jest + ts-jest, `testEnvironment: node`, **not** `jest-expo`). Scoped to `src/**/*.test.ts` — the RN-free logic runs without native mocks via `tsconfig.jest.json`. Covers `cycleCalculations.ts` and **`theme/contrast.test.ts`** (WCAG AA audit of the palette — keep it green when touching colors). To test components later, add a separate `jest-expo` project.
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
- Cycle math lives in `src/utils/cycleCalculations.ts` (pure functions: phase, ovulation, fertility window, variability, predictions). Unit-tested in `cycleCalculations.test.ts`.
- **`PeriodEntry` is the source of truth for the cycle.** `PeriodLoggerScreen` (Home stack) is the only writer of `periodEntries`, via `addPeriodEntry`/`deletePeriodEntry`. **Never** read `user.lastPeriodStart`/`user.cycleLength` directly for predictions — those are onboarding *fallbacks* only. Instead call **`deriveCycleContext(user, periodEntries)`**, which returns the effective `{ lastPeriodStart, cycleLength, periodLength }`: newest logged start + average gap between starts once entries exist, onboarding values otherwise. Home/Calendar/Analytics/AIInsights all go through it.
- **Cycle length = gap between consecutive period *starts*** (`buildCycleLengths`), never `endDate − startDate` (that's period *duration*, ~5 days). Implausible gaps (<15 or >60 days) are filtered so a double-log or tracking break can't skew predictions.
- **Phase boundaries scale to the user's cycle** (`getCyclePhase(day, cycleLength, periodLength)`), using a fixed ~14-day luteal phase (`getOvulationDay = cycleLength − 14`). They are NOT hardcoded to 28 days — always pass `cycleLength`/`periodLength`. `CYCLE_PHASES` in constants supplies only per-phase metadata (color/description/symptoms), not the day ranges.

### Navigation — `src/navigation/`
- `RootNavigator.tsx`: root stack swaps `Onboarding` ↔ `MainTabs` on `showOnboarding || !user`. Tabs (Home/Calendar/Analytics/Settings) each wrap their own native stack; `PeriodLogger`, `SymptomLogger`, `MoodTracker`, `AIInsights` live only in the Home stack (reached from Home's primary "Log Period" CTA and the quick-action grid).
- Tab bar: frosted `BlurView` (the one place glass is still used — content scrolls under it), theme-aware; icons are stroke **`Icon`** glyphs that spring + thicken stroke on activation.
- **Browser-style back/forward:** `navRef.ts` (nav container ref) + `useNavHistory.ts` (separate Zustand store). It snapshots the full nav state on each distinct page and keeps a pointer; back/forward restore snapshots (`goBack`/`goForward`), a new nav truncates forward entries. Wired in `App.tsx` via `onReady`/`onStateChange`. Rendered by `NavControls.tsx` (chevron `Icon`s on a soft fill, top-left).

### Theme — `src/theme/`
- `palette.ts`: `lightPalette` / `darkPalette` (`ThemePalette` type). Editorial neutral system — `bg` (warm off-white `#FCFBFA`), `bgSecondary`, `card` (pure white), `text`/`textSecondary`/`textTertiary`, `fill`/`separator`, chrome. Brand/phase colors stay in `constants` `COLORS`.
- `tokens.ts`: **the design language.** `TYPE` (SF Pro Display scale — `display`→`overline`, optical tracking), `SPACE` (4-based, generous), `RADIUS`, `SHADOW`/`SHADOW_DARK` (wide soft warm elevation — depth comes from shadow, **never borders**), `MOTION` (springs + durations + `stagger`), `FONT`, `TABULAR`, `MIN_TAP` (44).
- `useTheme()` reads `theme` from the store (reactive → whole UI re-themes). Returns `{ colors, isDark, toggle, setTheme }`. `App.tsx` derives the `NavigationContainer` theme from the palette (no longer hardcoded light).
- **`usePhaseColor()` / `phaseInk()` / `inkFor()`** — accessibility-critical. Brand pastels are ~2–3:1 on white, so: `usePhaseColor` returns the surface-safe hue (deep in light via `PHASE_DEEP`, pastel in dark); `phaseInk` returns `PHASE_INK` for white-on-fill (selected calendar day); `inkFor(accent)` darkens a pastel for an icon on its own `${accent}1F` tint. Contrast is enforced by `theme/contrast.test.ts`.

## Design system — "Editorial"
Premium, calm, ~80% neutral; color is an accent. No heavy gradients, minimal glass, stroke icons (never emoji), large whitespace, soft depth. Tokens in `theme/tokens.ts` + `theme/palette.ts`. Reusable components in `src/components/`:
- **`Screen`** — page scaffold: owns canvas color, `CONTENT_MAX_WIDTH` column, edge gutter, large editorial title/subtitle, and the bottom `tabSafe` inset. Every screen renders inside one.
- **`Surface`** — the default card (white, soft shadow, no border). `onPress` makes it a spring-pressed haptic button. Replaces `GlassCard`.
- **`Text`** — typed primitive; pick a `variant` + `tone`, never hand-roll font sizes. `tabular` for numbers.
- **`Icon`** — SF Symbols-style stroke set on a 24-grid, uniform 1.75 weight, `weight` multiplier. **The only icon source.**
- **`CycleTimeline`** — hero ring: neutral track + faint phase arcs from `getPhaseRanges` (drawn from the cycle math, can't drift) + animated gradient sweep + marker + breathing halo.
- **`Button`** (restrained sizes, spring press), **`Pill`** (tactile selectable, color-crossfade), **`Toggle`** (iOS switch, hand-built), **`Severity`** (gesture 1–5 slider, haptic per step), **`Stepper`** (segmented scale, sliding thumb), **`MoodFace`** (drawn expressive face), **`Row`** (grouped-list row), **`TextField`**/**`DateField`**.
- **`InsightCard`** (AI hero: tone badge, confidence meter, sparkline evidence, "why this" disclosure, ambient glow), **`MetricCard`** (one big number, quiet label), **`BarChart`** + **`Sparkline`** (Apple Health-style, hand-built, honest scales), **`AnimatedNumber`** (UI-thread count-up), **`OnboardingArt`** (abstract geometric SVG per step).
- **`Reveal`** — the one staggered entrance (index × `MOTION.stagger`); screens use it instead of hand-picked delays.
- **`src/utils/responsive.ts`**: `scale()`, `fontScale()`, `CONTENT_MAX_WIDTH`.

### Screen convention
Screens are functional, theme-read via `useTheme()`; static styles in a module-level `StyleSheet.create`, dynamic bits inline from `c.*`/tokens. Wrap in `<Screen>`, group content in `<Surface>`, stagger with `<Reveal index>`. Editorial copy: **fewer words** ("Luteal · Day 22", not "Current Menstrual Cycle Phase"). Old per-screen `makeStyles(c)` factories are gone.

## Environment gotchas (fix before EAS release)
1. **Node 21.3.0 is too old.** RN 0.85 wants Node 20.19+/22.13+/24.3+. It already breaks Metro's error reporter (`util.styleText is not a function`) so real bundling errors show garbled. **Install Node 22 LTS.**
2. **`EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` is permanent, not a workaround.** SDK 56 flags `expo-router` as incompatible with `@react-navigation` (which we use). `expo-router` is **not** a direct dependency and can't be uninstalled — `npm ls expo-router` shows it arriving transitively via `expo` → `@expo/cli` → `@expo/router-server`. So the flag is the fix; it must be set in the EAS build env (or `app.json`), not just typed into a local shell, or EAS builds will fail.
3. ~~Pre-existing `expo-image` typecheck errors~~ — **fixed**: the leftover template components were deleted in the redesign. `tsc --noEmit` is now fully clean.
4. Dev server sometimes stops between sessions — just restart it.
5. `app.json` sets native `userInterfaceStyle: "light"`; consider `"automatic"` so native dialogs match dark mode in a real build.
6. `react-native-svg` is now a **direct** dependency (added via `expo install`) — the icon set, charts and cycle ring all depend on it. Previously it was only present transitively via `react-native-chart-kit`.

## Done
Persistence + hydration · onboarding (full-screen emotional pages + validation) · symptom-log/cycle-math separation · **full "Editorial" redesign (all screens + component system, light + dark, WCAG AA)** · stroke `Icon` set · glass tab bar · browser-style back/forward · **period logging (`PeriodLoggerScreen`) + cycle context derived from logged entries** · unit tests for `cycleCalculations` + contrast audit test.

## Not done / next (roadmap order)
1. **Notifications** — `src/services/notifications.ts` (empty `services/` folder), on-device period/log reminders via `expo-notifications`. Now unblocked: there is real logged data to remind against.
2. **Backend/auth** — **deferred on purpose.** Local-only is the privacy selling point, and there's no point syncing until the on-device data model settles. When it's time: **Supabase** (SQL + RLS) over Firebase for the privacy story, despite Firebase already being in deps. Then cloud sync, account + in-app data deletion (store requirement).
3. Apple Health / Health Connect, partner sharing, PDF export, widgets.
4. Sentry; CI/CD (EAS Build/Submit/Update).
5. Privacy: this category gets heavy scrutiny — accurate store data-safety labels, data minimization, GDPR export/delete, age gate. Keep a local-only mode as a selling point.

## Known bugs (not yet fixed)
- **`upsertSymptomLog` doesn't dedupe** (`appStore.ts`): merging a same-day log does `[...l.symptoms, ...log.symptoms]`, so re-logging cramps on one day stores it twice. Should merge by `type`.
- ~~`App.tsx` hardcodes `dark: false`~~ — **fixed** in the redesign: the `NavigationContainer` theme is derived from the active palette.
- ~~Three `expo-image` typecheck errors~~ — **fixed**: template components deleted.

## Notes
- Sensitive health data — minimize collection, no ad/tracking SDKs, encrypt at rest/in transit.
- Root has redundant docs (`README*.md`, `FEATURES.md`, `PROJECT_SUMMARY.md`, `QUICKSTART.md`) — this file supersedes them for dev orientation.
