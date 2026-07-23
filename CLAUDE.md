# CLAUDE.md — Bloomly

**"Gentle care for every cycle."** AI-powered menstrual health app. Expo / React Native, runs on iOS, Android, and web from one codebase. Goal: production-grade app for the App Store + Play Store.

## Stack
- Expo SDK 56, React Native 0.85, React 19 (new JSX transform — **don't import `React` unless you use `React.FC`/namespace**).
- TypeScript (strict). Navigation: `@react-navigation` (native-stack + bottom-tabs). State: **Zustand**.
- UI/motion: `react-native-reanimated` v4, `react-native-svg`, `expo-linear-gradient`, `expo-blur`, `expo-haptics`.
- Persistence: `@react-native-async-storage/async-storage`. Dates: `date-fns`.
- Reminders: **`expo-notifications`** (local only — no push token, no server).
- **Unused dependencies were removed** (Firebase x3, lottie, chart-kit, axios, expo-glass-effect, expo-symbols, expo-device, @expo/ui). Unused *JS* is tree-shaken; unused *native* modules are not — they are autolinked into the binary regardless, and Firestore in particular drags in gRPC, leveldb and protobuf. Firebase was doubly dead: the plan is Supabase. Charts are hand-built (see the note in `BarChart`), so `react-native-chart-kit` is gone too.

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

### Tiny Escapes — `src/escapes/` + `src/utils/tinyEscapes.ts`
Calming micro-experiences ("Reset"), NOT a game tab — no scores, timers that judge, or streaks. Architecture:
- **Metadata + pure logic** in `utils/tinyEscapes.ts` (RN-free, node-tested): `ESCAPES` registry, `DURATIONS`, `recommendEscape(mood, stress)` (stress 5→shatter, 4→zen, mood ≤2→**dandelion**, else **null** — the suggestion must stay rare; a test asserts it can only ever return an id that exists, since a retired id navigates to a blank player), `summarizeResets`, `RAIN_ENVIRONMENTS` + `environmentForCatches` (Rain Catcher's beauty-ramp thresholds). **`MEADOW_STAGES` + `stageForSeeds`** (Dandelion's light-walk, same shape as the Rain Catcher ramp). Aquarium's roster/growth/lighting **and its steering maths** live in **`utils/aquarium.ts`** — `poiLife`, `poiWeight`, `poiBlend`, `chooseSlot` all carry `'worklet'`, so the same tested code runs on the UI thread. That module exists because every Aquarium bug so far was arithmetic invisible to typecheck.
- **Scenes** in `src/escapes/` (`ZenGarden`, `DandelionWishes`, `Aquarium`, `BubbleTherapy`, `CrystalRelease`, `AuroraSky`, `RainCatcher`; id→component map in `escapes/index.ts`). *Bloom Garden, Star Dust, Rain Window and Kintsugi were retired.* Scene palettes are **fixed, not theme-bound** (a place, not a document). All particle systems are capped + age-pruned; gestures run as worklets with `runOnJS` only at spawn points; haptics throttled. ZenGarden is the reference for scene density and is now a full mini-game: **flowing rake strokes** (drag points → midpoint-quadratic smoothed path, drawn as parallel tine copies offset along the stroke's average normal — dark groove + light lip; 3 styles incl. dashed pebble trail), a **Decorate mode** (tap places stone/flower/leaf/shell/crystal; heavy pieces get raked sand-rings and answer with rings when brushed, flowers shed petals; heavy things sink in the pond), **4 seasons** (full palette records — sand/ink/pond/branch/grass/drift particles — crossfaded by keyed FadeIn; winter hides wildlife, adds snow), a **glass BlurView dock** (rake/decorate/season/smooth + optional sound chip) with toast feedback, and a smooth-sand veil reset. Gesture spawns ignore the dock zone (`inDock`). Static composition (grain, pre-raked waves, koi pond, blossom branch, stepping stones, moss) + ambient motion (koi, ripples, seasonal drift, dragonfly, butterflies, wind-swayed grass, water glints) + touch response that differs by material (rake on sand, ripple on water) all remain. Every scene follows the same three-layer recipe: **environment silhouettes** (hills+moon+grass in Bloom; god rays+kelp in Bubbles; stalactites+floor clusters in Shatter; paper-window light shafts + rice-paper grain in Kintsugi; milky-way band+ringed planet in Cosmos), **ambient inhabitants** (fireflies/pollen, plankton, studio dust + a passing butterfly, twinkles/shooting star), and **event-quality interactions** (flowers unfold in staggered layers + sparkle burst; environment-tinted bubble skins that swell, stretch, then collapse inward behind a double-ring+mist pop; facet-gradient crystal with sweeping shine, glowing cracks, debris, scene-shake + floor-cluster echo on shatter; every ~6th StarDust grain becomes a **permanent pinned star** — you leave a constellation behind, capped at 18).
- **BubbleTherapy ("Bubble Therapy — Breathe. Pop. Relax.") is a sensory experience, not a popping game.** Depth is faked in three tiers so the air reads as *full* cheaply: three parallax `BubbleField` layers (one `Svg` each, circles drawn twice at `y` and `y+h` for a seamless wrap) behind 14 interactive bubbles. Motion is two sine currents at unrelated frequencies + a linear rise, so paths cross and separate organically with **no collision solver**; big bubbles rise slower and wobble less. `rollSpecial()` gives ~1 in 7 bubbles a **special** (rainbow → glitter → healing → golden → galaxy → aurora, descending weight): popping one fires a burst + a **shimmer wave** — `waveX/waveY/waveP` shared values that every other bubble samples in its own worklet (distance to the ring front → glow + lift), so a scene-wide effect costs **zero re-renders**. The deeper three transform the world: healing walks `HEALING_CYCLE` (garden→lavender→cherry) and blooms flowers, golden → sunset, galaxy → moonlit, aurora → aurora sky. **That discovery replaces the brief's cumulative-unlock ladder on purpose** — nothing here tracks how long or how often you return. Seven `ENVIRONMENTS` records carry sky/floor/life/**bubble tints** (skins are drawn from the current sky, so bubbles always belong to it) and crossfade over 2s, prev layer beneath. Breathing mode (dock chip, `breathe` icon) drives a 4-2-6-2 rhythm through the world's scale — visual guidance only, no text. **Reduced Motion is honoured** (`useReducedMotion` → ambient density ×0.4, static fields, no self-breathing). Specials read by *shape* (petals/stars/sparks/rings/swirl/ribbon) not hue, and every bubble keeps a rim stroke, for colour-blind legibility. Own silent `BUBBLE_AUDIO` registry. **No Skia** — the brief asked for it, but it isn't a dependency and every scene here is SVG + Reanimated; 14 bubbles + 3 field layers is the honest 60fps budget, not "200+".
- **RainCatcher is tending, not arcade.** Drag a weighted umbrella (spring-follow, lag-tilt, catch-dip); a fixed pool of 12 **recycled** raindrops falls on a shared wind sine, and a per-drop `useAnimatedReaction` checks the canopy line (`CATCH_HALF` forgiving) — caught drops splash and water the meadow (every 3rd catch a layered-unfold flower, every 3rd a sprout; pools capped, old blooms **fade into scenery, never pop out**). No hazards, no misses that matter. Cumulative catches walk six palettes — Fresh Meadow→Spring→Cherry→Lavender→Golden→Moonlit (`environmentForCatches`, node-tested) — via a two-layer crossfade: previous `Environment` stays mounted beneath while the new one `FadeIn`s over 1.7s; the garden layer sits outside the crossfade so it persists. Weather/ambience per palette record: clouds, breathing mist, faint spring rainbow, gliding bird (day), fireflies (dusk+), static star field + twinkles (moonlit); hills/ground carry a few px of umbrella-parallax. Own silent `RAIN_AUDIO` registry + mute chip, same pattern as Zen. All skies keep mid-value zeniths so the player's white chrome reads in every environment.
- **Kintsugi is restoration, not repair-as-task.** A ceramic piece (one of six — cup/bowl/vase/lantern/plate/bird) rests in a golden-hour studio already broken; tracing a fracture draws liquid gold along it. Seams are **`strokeDashoffset` reveals** (dry break + wide gold bloom + core + a bright droplet at the leading edge via `pointAtT`), which is why the gold appears to *flow* rather than fade in along its whole length. Geometry is flat `[x0,y0,…]` polylines in a shared 200×200 piece space; the scene scales that box and maps touches back into it. `utils/kintsugi.ts` holds `PIECES`, `crackCumulative`, `nearestOnCrack`, `pointAtT`, `crackPath` — RN-free and node-tested, each carrying **`'worklet'`** so the *same tested code* runs on the UI thread (the whole trace loop is one worklet; `runOnJS` fires only for haptics and seam events). Tracing is deliberately forgiving: wide catch radius (`FORGIVE`), no need to start at an end, and fill is **monotonic** — gold advances at a capped rate (`FLOW_STEP`) and can never retreat, so a wandering finger costs nothing. Completing every seam plays a ritual (glow, slow `rotateY` turn, blossom) and then fades in a **different** piece, so a session never dead-ends; a `finished` shared value latches so a still-moving finger can't re-fire it. Piece bodies are lit-face + shade-pass SVG (flat vector reads as thrown ceramic only with the shade pass). Own silent `KINTSUGI_AUDIO` registry. **No Skia** — the brief asked for it, but it isn't a dependency and dash-offset seams are sharper and cheaper here than a shader.
- **`escapes/previews.tsx`** — living miniature vignettes (mostly-static SVG + 1–2 slow loops each) used by `ResetScreen`, which renders each escape as a full-bleed art card (156px, scrim + per-`chrome` ink, icon chip) instead of an icon row. SVG gradient `id`s must be unique per mounted component (web shares one DOM document — see the per-index `` bt-skin-${index} `` ids in BubbleTherapy).
- **`EscapePlayerScreen`** lives in the ROOT stack (covers the tab bar; `animation:'fade'`). Chrome = fading hint pill + close only; per-scene `chrome: 'light'|'dark'` picks overlay ink. After `plannedSec` a check-out card asks "Feeling a little better?" → stored as `ResetSession.response` (`better|same|no`); closing after ≥20s records `response: null`. `NavControls` returns null on this route.
- **Adaptive loop:** heavy MoodTracker check-in → inline suggestion card (not `Alert` — RN-web Alert is a no-op) → player; `resetSessions` check-outs feed two AIInsights generators (`reset-suggest`, `reset-effect`). Hub = `ResetScreen` (Home stack), doorway card on Home.
- **Audio is wired but ships silent.** `expo-audio` is a dependency (config plugin added to app.json). ZenGarden's `ZEN_AUDIO` registry at the top of the file is deliberately empty — drop .mp3s into `src/escapes/audio/` and register them there to enable looping wind/water/piano beds + a placement chime; the dock then grows a mute chip (`HAS_AUDIO`). Registry entries must be static `require()`s (Metro resolves at bundle time — no dynamic paths). Haptics carry feedback until assets exist.

### Navigation — `src/navigation/`
- `RootNavigator.tsx`: root stack swaps `Onboarding` ↔ `MainTabs` on `showOnboarding || !user`; `EscapePlayer` sits alongside `MainTabs` at the root. Tabs (Home/Calendar/Analytics/Settings) each wrap their own native stack; `PeriodLogger`, `SymptomLogger`, `MoodTracker`, `AIInsights`, `Reset` live only in the Home stack (reached from Home's primary "Log Period" CTA, the quick-action grid, and the "Need a moment?" card).
- Tab bar: frosted `BlurView` (the one place glass is still used — content scrolls under it), theme-aware; icons are stroke **`Icon`** glyphs that spring + thicken stroke on activation.
- **Browser-style back/forward:** `navRef.ts` (nav container ref) + `useNavHistory.ts` (separate Zustand store). It snapshots the full nav state on each distinct page and keeps a pointer; back/forward restore snapshots (`goBack`/`goForward`), a new nav truncates forward entries. Wired in `App.tsx` via `onReady`/`onStateChange`. Rendered by `NavControls.tsx` (chevron `Icon`s on a soft fill, top-left).

### Theme — `src/theme/` — the **Bloomly** design language

Full reference: **`docs/BLOOMLY-DESIGN.md`** (audit, IA, motion spec, handoff notes).

- **The identity is a GARDEN, not a chart.** Phases are a year in a garden:
  Menstrual=Rose (letting go) → Follicular=Sage (budding) → Ovulation=Gold (full
  bloom) → Luteal=Lavender (winding down). Warm to cool, closing on itself.
  That loop is why this reads as Bloomly and not as another pink tracker.
- **`constants/index.ts`** owns brand colour. Every hue ships in **three
  values** — `pastel` (the petal, fills + dark-mode text), `deep` (the stem,
  ≥3:1 for strokes/dots/chart marks), `ink` (the soil, ≥4.5:1 for text and
  filled buttons). Reach for the wrong one and `contrast.test.ts` fails. `PAPER`
  holds the surfaces the palette is tuned against.
- **`palette.ts`: never plain white, never plain black.** Canvas is warm white
  (`#FFFAF7`) falling to blush (`#FBEFF1`); card is cream (`#FFFDFB`) — *lighter*
  than the blush it floats on. That ~2% step plus a wide plum-tinted shadow is
  what separates them, so **`cardBorder` is `transparent` and no card has an
  outline**. A test asserts it. If borders ever look necessary again the bug is
  in the palette, not in `Surface`. Dark is plum ink, not charcoal — neutral
  grey drains the warmth out of every pastel laid on it.
- **`tokens.ts`**: `SPACE` (4-based; `h1`–`h4` are *composition* steps, not
  sizes), `RADIUS` (card 28, hero 34 — rounder than a system default on
  purpose), `TYPE` (`FONT_DISPLAY` rounded for headings, `FONT` for body;
  overlines are sentence-case with open tracking, **never all-caps**), `SHADOW`
  (warm plum `#7A4356`, wide and faint — black shadow under a blush card reads
  as grey sludge), `MOTION` (+ `springBloom`, the **only** spring allowed to
  overshoot, reserved for things that literally bloom), `BREATH` (4s in / 6s
  out, shared by every ambient rhythm so the app breathes together),
  `MIN_TAP` 44 / `MIN_TAP_COMFORT` 56.
- **`usePhaseColor()` / `phaseInk()` / `inkFor()` / `deepFor()`** —
  accessibility-critical surface-safe lookups.

#### ⚠ Phase is carried by SHAPE, not colour — this is not optional

The four phase hues were run through a CVD validator. Best achievable on-brand
set: **ΔE 15.3 normal vision (pass) / ΔE 3.1 deuteranopia (fail)**. The earlier
Rose/Peach/Gold/Lavender set was worse — ΔE **0.7** between peach and gold,
i.e. literally the same colour to a deutan reader, and only 6.8 to everyone
else. Deuteranopia collapses pink and green *by definition*; **no arrangement of
four soft pastels passes.**

So colour was demoted to reinforcement and shape promoted to carrier:
`PHASE_GLYPH` → **drop / leaf / sun / moon**, rendered by `components/PhaseMark`
(+ `PhaseLegend`). Four silhouettes that survive any colour vision, greyscale
and a 10px calendar dot.

**Anywhere a phase appears — ring, calendar, legend, chart, chip — use
`PhaseMark`. A bare coloured dot is a regression, and no test can catch it in a
new file.** Follicular moved peach → sage as part of this (which also tells the
garden story better: new growth is green).

### Atmosphere — `src/theme/atmosphere.ts` + `components/Atmosphere.tsx`

One pure function, `atmosphere({ phase, hour, isDark, reducedMotion })`, answers
*what does the app feel like right now?* and returns a record the visual layer
consumes wholesale — so a phase change re-tints the whole app coherently rather
than via conditionals in eleven screens. RN-free, **30 tests**.

- **Why it was zeroed out and why it is back.** A previous pass set the canvas
  to flat `#FFF`/`#000` after device feedback that phase tinting read as a
  colour cast. *That feedback was correct and the diagnosis was wrong.* The
  problem was not that the canvas had colour — it was that it had colour
  **uniformly**: a flat 8% rose over the whole screen has no light source, so
  the eye files it as broken white balance. Three fixes: (1) the canvas is
  already warm *before* phase touches it — shifting a warm canvas reads as
  weather, tinting a white one reads as a filter; (2) **tint pools downward**
  (`PHASE_LIFT` 0.15 at the top → 1.0 at the bottom) so colour gathers where
  light would settle, giving the gradient a direction and therefore a cause —
  *this is the change that made phase colour stop looking broken*; (3) day is
  nearly clean, so phase is most visible at dawn/dusk/night.
- **A test ties every atmosphere hue back to `COLORS`.** This is not
  hypothetical: when follicular moved peach → sage, this module kept tinting the
  background peach, putting a sage arc on a peach wash — exactly the
  "background disagreeing with the numbers" failure it exists to prevent.
- **Renderer: four strata** — graded wash → three drifting soft-falloff orbs →
  three parallax **petal** layers → paper grain. **Hard budget: six animated
  nodes regardless of particle count, zero re-renders once mounted, no
  per-particle animation ever.** Each layer is ONE `Svg` drawn twice (at `y` and
  `y+h`) translating by one screen height, so the wrap is seamless and costs one
  transform per layer. Sway rides the same shared value, so it is free.
- **Orbs are SVG `radialGradient`, never a flat circle.** An even fill has a
  hard edge at *any* alpha, so a solid disc reads as a coloured *plate* laid
  over the page. This bug shipped twice (ring halo, onboarding backdrop) and was
  caught both times by screenshotting.
- Light mode runs *higher* alphas than intuition suggests; the two themes are
  matched by eye, not by number.
- **Reduced motion removes movement, never colour** — a test asserts `canvas`,
  `glow` and `orbs` are byte-identical with the flag on. Someone who gets motion
  sick still deserves the app to feel like evening at 9pm.
- **No Skia.** Not a dependency, needs a native prebuild, would break the web
  preview workflow. SVG + Reanimated covers everything.

## Design system — "Bloomly"

Soft, warm, premium, alive. Colour is meaning, not decoration. Stroke icons
(never emoji), flat pastel illustrations, generous space, soft depth, no
borders anywhere. See **`docs/BLOOMLY-DESIGN.md`** for the full system.

**Signature components:**
- **`BloomRing`** — the hero. **A flower opening over a month**, not a progress
  bar. 12 petals, each owning a cycle slice and taking its phase's colour; open
  behind you, folded ahead, one caught mid-open. Progress *and* phase become
  legible without a number or a legend, and it looks visibly different on day 4
  and day 22 (a progress ring never does). Colours come from `getCyclePhase()`
  so the flower cannot disagree with its own label. Petals are `Animated.View`s,
  not SVG paths — transforms are worklet-native and behave identically on
  RN-web. **The folded-petal `grow` floor is 0.72 and the window is narrow:**
  0.80 made a day-3 flower read as a *sun* (pale spikes), 0.50 hid the buds
  inside the core disc. Constraint is `rBase·grow − (ph·scaleY)/2 > core radius`.
- **`TodaysGarden`** + **`utils/garden.ts`** (RN-free, 20 tests) — every log
  plants something. **Chosen over a streak deliberately:** a streak has a number
  that can hit zero on the one week someone is too unwell to open a period
  tracker. A garden only accumulates. Same retention mechanic, opposite
  emotional sign. **No decay, no wilting, no "your garden misses you"** — all
  three reintroduce the punishment, and a test asserts the functions take no
  time input. Counted **by day, not by entry** (six symptoms on a bad day must
  not out-grow a quiet day — that rewards suffering). No stage label may contain
  a digit. One shared wind drives all 14 plants.
- **`MoodBloom`** — nine feelings as flowers with faces. **Petals change shape
  with the mood, not just hue**, which is both the character and the
  colour-blind story. Replaced a 1–5 valence scale that had no square for
  "anxious but fine"; still maps to the same ordinal underneath.
- **`Illustration`** — 12 flat pastel scenes on a shared construction: one
  ground ellipse, two values per shape, one accent, **no outlines**. Code not
  PNGs (re-tints per theme, scales without @3x, zero bundle bytes). At most one
  animated node each, all reading one shared clock. **Never medical** — symptom
  glyphs draw the *sensation*, not the organ.
- **`PetalBurst`** — petals, not confetti rectangles. Ballistic so it *falls*
  (radial-only reads as a firework). Never blocks input; silent under reduced
  motion, but the haptic still fires.
- **`SplashBloom`** — three petal rings opening outside-in. The gate in
  `App.tsx` requires **both** hydration and intro completion: dismissing the
  instant hydration lands cuts the flower off mid-open, and a half-finished
  animation reads as a glitch where a complete one reads as an intro.
- **`PhaseMark` / `PhaseLegend`** — see the phase-shape rule above.
- **`Chip`** — opens a small flower behind the icon on select.
- **`States`** — `EmptyState` (says what *will* be here, never what is missing),
  `ErrorState` (**never red** — red is reserved for destructive confirmation;
  spending it on a network hiccup leaves nothing in reserve), `BloomLoader`,
  `LoadingState`, `Shimmer`.

**Core:**
- **`Screen`** — owns canvas, column cap, gutter, tab-safe inset; renders
  `<Atmosphere/>` so ambient life is a property of *being a screen*; publishes
  scroll offset via `ScrollContext` (`useScrollY()`, read in worklets → zero
  re-renders).
- **`Surface`** — `hero | card | quiet | glass | inset`. **At most one `hero`
  per screen.** `quiet` is translucent so secondary cards recede *into* the
  atmosphere. `tint` washes a card in a brand hue at ~7%. `lift` opts into
  scroll parallax (opt-in so a long list doesn't allocate twenty nodes).
- **`Button`** — pill, tonal gradient. Press squashes **and** softens its
  shadow; opacity alone reads as "disabled", the opposite message.
- **`Text`** (typed variants) · **`Icon`** (57 glyphs, the only icon source) ·
  **`Reveal`** (`index × MOTION.stagger`).

**Charts — `PetalChart` is ONLY for data indexed by cycle day.** Radial charts
are usually a mistake; the exception is earned because a cycle is genuinely
periodic (day 28 is adjacent to day 1, so a Cartesian axis has to cut the loop
somewhere). It encodes by **length, not area**, is zero-anchored, has labelled
rings and a mandatory phase legend. Everything non-periodic goes to `BarChart`
(rounded data-end only, zero-anchored, **width capped at 56pt** or bars read as
colour blocks, peak-only direct label). **Chart marks use `deep`, never
`pastel`** — rose pastel is 2.19:1 on cream, under the 3:1 WCAG requires of a
graphical object (this was a live bug).

### Screen convention
Screens are functional, theme-read via `useTheme()`; static styles in a module-level `StyleSheet.create`, dynamic bits inline from `c.*`/tokens. Wrap in `<Screen>`, group content in `<Surface>`, stagger with `<Reveal index>`. Editorial copy: **fewer words** ("Luteal · Day 22", not "Current Menstrual Cycle Phase"). Old per-screen `makeStyles(c)` factories are gone.

**Composition: proximity carries grouping.** Related things sit `SPACE.sm` apart and read as one object; unrelated clusters sit `SPACE.h2` apart. Home was previously ten full-width blocks at a uniform `SPACE.lg` — which is *why* it read as disconnected. Ten equally-spaced identical cards produce a list with no structure; that was a spacing problem wearing a styling costume, and no amount of card decoration fixes it. Pair this with `Surface` variants: at most one `hero` per screen, `quiet` for anything supporting. See `HomeScreen` for the reference (ring floating on the canvas in *no card at all* — wrapping the hero in the same Surface as everything else is what flattens it).

## Shipping / EAS
- **`eas.json` exists** with all four profiles. `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` is set in `build.base.env` so it applies to every profile — gotcha #2 below is handled, and builds will not fail on it.
- **Blocked on one human step: `eas login`.** Everything else is ready. `eas config`, `eas build` and even `eas whoami` all require an account, and the login is interactive. After logging in, run `eas init` — it writes the real `extra.eas.projectId`.
- **`app.json` no longer carries a bogus projectId.** It was the literal string `"period-tracker-app"`; real ones are UUIDs and an invalid one fails the build, whereas an *absent* one lets `eas init` link the project properly.
- **Android permissions are now empty**, with `READ_PHONE_STATE`/`READ_CALENDAR`/`WRITE_CALENDAR`/`RECORD_AUDIO` in `blockedPermissions` so a transitive dependency cannot reintroduce them unnoticed. Nothing in the app used them, and asking for device identifiers contradicts the privacy promise on the Settings screen.
- **Still required before submission, and none of it is code:** privacy policy URL, store listing copy, screenshots, and the data-safety / privacy-nutrition answers. Notifications are local-only (no push token, no server), so they add nothing to those declarations beyond the notification permission.

## Environment gotchas (fix before EAS release)
1. ~~**Node 21.3.0 is too old.**~~ — **resolved, but not by replacing the system Node.** RN 0.85 wants 20.19+/22.13+/24.3+, and 21.3 broke Metro's error reporter so real bundling errors showed garbled. It also crashed `eas-cli` outright. Node **22.13.0 now lives at `%LOCALAPPDATA%
ode22`**, installed from the official zip because the winget/MSI route needs an admin UAC click that a non-interactive shell cannot answer. The system Node is still 21.3.0 and was left alone. To use the good one:
   ```powershell
   $env:PATH = "$env:LOCALAPPDATA
ode22;$env:PATH"
   ```
   Verified under 22.13: `tsc --noEmit` clean, `expo export` succeeds, and `eas-cli` runs (`eas-cli/21.0.2 node-v22.13.0`). Worth putting on the PATH permanently, or replacing the system install when someone can click through UAC.
2. **`EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` is permanent, not a workaround.** SDK 56 flags `expo-router` as incompatible with `@react-navigation` (which we use). `expo-router` is **not** a direct dependency and can't be uninstalled — `npm ls expo-router` shows it arriving transitively via `expo` → `@expo/cli` → `@expo/router-server`. So the flag is the fix; it must be set in the EAS build env (or `app.json`), not just typed into a local shell, or EAS builds will fail.
3. ~~Pre-existing `expo-image` typecheck errors~~ — **fixed**: the leftover template components were deleted in the redesign. `tsc --noEmit` is now fully clean.
4. Dev server sometimes stops between sessions — just restart it.
5. `app.json` sets native `userInterfaceStyle: "light"`; consider `"automatic"` so native dialogs match dark mode in a real build.
6. `react-native-svg` is now a **direct** dependency (added via `expo install`) — the icon set, charts and cycle ring all depend on it. Previously it was only present transitively via `react-native-chart-kit`.
7. **`Alert.alert` is a NO-OP on RN-web.** Not cosmetic — it silently breaks real functionality. A button-array Alert means the buttons *never exist*, so the action is unreachable on web; deleting a logged period and "Log out and erase" were both dead this way, and three validation guards failed in total silence. **Anything the user must see or act on renders in the tree** (`components/Notice`, or an inline confirm that keeps the target visible while you decide). Alert is still fine for fire-and-forget native niceties, but never as the only channel. Grep before adding one.
8. **Screenshot before you believe it.** `node scripts/screenshot.js <name> [dark]`
   seeds `localStorage` past onboarding and captures Home + every tab + the
   Home-stack screens. Four real bugs in the redesign were invisible to both
   `tsc` and the 244-test suite and obvious in a screenshot: the plate-not-glow
   halo, the sun-not-flower petals, a settings gear that was geometrically the
   same drawing as a sun (two icons from the theme toggle's actual sun), and a
   canvas tinting peach for a phase that had moved to sage.
9. **Web UI testing traps** (puppeteer-core, `localStorage['period-tracker-store']` seeding). Two ways a test lies and reports green: (a) **inactive tab screens stay mounted in the DOM**, so finding an element is *not* proof it is visible — navigate for real (tabs are `[role="tab"]` matched by text) before asserting; (b) **puppeteer's auto-scroll does not work inside RN-web ScrollViews** — clicks on below-the-fold elements get clamped to the viewport edge and land on the floating tab bar, silently navigating elsewhere. `scrollIntoView({block:'center'})` then click by `boundingBox` centre. Also: `git worktree` gets no `node_modules` and a plain symlink fails on Windows without elevation, so every commit "fails" typecheck identically (if *all* results are the same failure, suspect the harness, not the code).
10. **DANGER — never junction `node_modules` into a git worktree.** The obvious fix for #8 is `New-Item -ItemType Junction` pointing at the real `node_modules`. Do **not**: `git worktree remove --force` (and `rm -rf`) recurse *through* the junction and delete the real directory's contents, wiping the project's install. This has already happened once. To typecheck an old commit, either `npm ci` inside the worktree, or check out the commit in place, or just trust the branch-level check. Recovery is `npm ci` (~2 min) — nothing is lost as long as work is committed, which is a good reason to commit before archaeology.

## Done

Persistence + hydration · onboarding · symptom-log/cycle-math separation ·
period logging + derived cycle context · Tiny Escapes (7 scenes + player +
adaptive suggestion + check-out loop) · browser-style back/forward · glass tab
bar · RN-web `Alert` dead-action fixes · unit tests for `cycleCalculations`,
`tinyEscapes`, `aquarium`, `reminders`, `atmosphere`, `garden` + the contrast
audit (**244 tests, typecheck clean**).

### The Bloomly redesign — complete

Brand + colour system (three-value, CVD-audited) · warm canvas + phase-graded
living atmosphere with drifting petals · **BloomRing** · **TodaysGarden** ·
**MoodBloom** · **PhaseMark** · **PetalChart** · **PetalBurst** · **Illustration**
(12 scenes) · **Chip** · **States** · **SplashBloom** · Surface variants + glass ·
gradient pill Button · Home rebuilt as the signature screen · Mood (nine
feelings) · Symptoms (grouped + illustrated chips) · Calendar phase silhouettes ·
6-page onboarding · chart contrast + mark specs · **`docs/BLOOMLY-DESIGN.md`**.

**Screens specified but NOT built** (new features, not redesigns — they need
product decisions and in two cases a backend; direction is settled in
`docs/BLOOMLY-DESIGN.md` §15): Sign In, Community, Premium, Journal,
Notifications centre, Profile.

**One open decision:** `FONT_DISPLAY` resolves to SF Pro Rounded on iOS only.
Bundling a rounded family (Nunito/Quicksand) via `expo-font` is a one-constant
change — left as a bundle-size and licensing call rather than made.

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
