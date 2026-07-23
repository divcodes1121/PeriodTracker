# Bloomly — Design System

**Gentle care for every cycle.**

This is the reference for Bloomly's visual language: what it is, why each
decision was made, and what a developer needs to build against it.

Two things to know before reading:

1. **The system is enforced by tests, not by this document.** Contrast ratios,
   the three-value colour system, phase-glyph distinctness and the atmosphere's
   agreement with the brand palette all fail the build if broken. Where a rule
   here has a test, the test is named. Where it doesn't, treat the rule as a
   convention that can rot.
2. **Everything below is implemented** unless a section is explicitly marked
   *Specified, not built*. Those are new features, not redesigns — they need
   product decisions (and in two cases a backend) that are outside a visual
   language's remit.

---

## 1. UX audit — what was wrong

The app that existed was competent and cold. It had a coherent "Editorial"
language: warm off-white canvas, white cards, stroke icons, generous space,
WCAG AA throughout. Nothing was broken. It also had no personality, and several
specific failures worth naming.

### 1.1 Colour was decorative, so it carried no information

The previous pass enforced "~80% of every screen stays neutral" so completely
that **luteal Tuesday and ovulation Saturday rendered identically**. Phase
existed as a word and a small dot. The app knew which of four distinct
biological states you were in and chose not to show you.

An earlier attempt to fix this by tinting the canvas per phase was reverted
after device feedback that it read as a colour cast — see §4.3 for why that
feedback was right and the diagnosis was wrong.

### 1.2 The canvas was pure white, which forced borders onto every card

`bg: '#FFFFFF'` with `card: '#FFFFFF'` makes the page and the card *the same
colour*. Shadow alone cannot separate two identical surfaces, so every card
grew a hairline outline. An outlined pastel card reads as a **sticker**, not a
surface. This is a chain reaction from one decision, and the fix has to happen
at the root.

### 1.3 The hero was a progress ring, i.e. the same object every competitor ships

A circular progress bar with a number in it is a perfectly good chart and
nobody's favourite thing about any app. Critically, it is **visually almost
identical on day 4 and day 22** — it can only ever be "a bit more full", so
there is no reason to look at it.

### 1.4 Mood was a measurement instrument

A 1–5 valence scale: Low, Down, Okay, Good, Great. There is no square on that
scale for "anxious but fine" or "loved and exhausted". A user who cannot find
themselves stops answering honestly, and every downstream insight quietly
degrades.

### 1.5 Symptoms were a wall

Ten pills in one undifferentiated block. Ten of anything in a row has no entry
point, so choosing requires deliberate reading rather than recognition — on a
screen someone uses while unwell.

### 1.6 Empty, error and loading states did not exist as designs

A `ActivityIndicator`, a couple of grey sentences. A new user meets the empty
state *before* they meet the product; someone whose action just failed meets
the error state at their least patient.

### 1.7 There was no reason to come back

No mechanic rewarded returning. The obvious fix — a streak — is actively wrong
here: a streak has a number that can go to zero, and it will do so on the one
week someone is too unwell to open a period tracker.

### 1.8 Accessibility was strong on contrast, absent on colour blindness

Contrast was tested and passing. But phase — the app's central concept — was
carried by four soft hues and nothing else. Measured, the best achievable
on-brand set scores **ΔE 3.1 under deuteranopia**. Roughly 1 in 12 people were
reading a strictly worse app, and no test caught it because contrast tests
don't model colour vision deficiency.

---

## 2. Brand

| | |
|---|---|
| **Name** | Bloomly |
| **Tagline** | Gentle care for every cycle. |
| **Feels like** | Calm · Soft · Elegant · Premium · Warm · Private |
| **Nearest neighbours** | Calm + Apple Health + Finch |
| **Explicitly not** | a medical tracker, a clinic, another pink period app |

### The one idea

**The identity is a garden, not a chart.**

Everything descends from this. The four cycle phases are a year in a garden
rather than four arbitrary highlighter hues:

| Phase | Hue | Season | Glyph |
|---|---|---|---|
| Menstrual | Rose | Letting go | drop |
| Follicular | Sage | Budding | leaf |
| Ovulation | Gold | In full bloom | sun |
| Luteal | Lavender | Winding down | moon |

Bloom → leaf → sun → dusk → back to bloom. It spans plant *and* sky, and it
closes on itself, which is what a cycle is. **That is why this reads as Bloomly
and not as another pink tracker: the pink is one station on a journey, not the
whole map.**

### Voice

Bloomly speaks like a kind friend who happens to know biology.

- Never diagnoses, never instructs, never uses the word *should*.
- Fewer words. "Luteal · Day 22", not "Current Menstrual Cycle Phase".
- Empty states say what *will* be here, never what is missing.
- Concrete promises over reassuring adjectives. "No account, no upload" beats
  "we take privacy seriously".

---

## 3. Colour

`src/constants/index.ts` · enforced by `src/theme/contrast.test.ts`

### 3.1 The three-value system

**A pastel never carries text.** Blossom is 1.7:1 on cream — beautiful as a
petal fill, illegible as a label background. So every brand hue ships in three
values:

| Value | Nickname | Contract | Used for |
|---|---|---|---|
| `pastel` | the petal | <4.5:1 on cream, ≥4.5:1 on plum | fills, illustrations, dark-mode text |
| `deep` | the stem | ≥3:1 on cream **and** blush | strokes, dots, rings, chart marks |
| `ink` | the soil | ≥4.5:1 on cream **and** blush; white sits on it | text, glyphs, filled buttons |

Both ends of the canvas gradient are tested. A label that clears AA at the top
of the page and fails at the bottom is still a failure — it just fails
somewhere nobody screenshotted.

### 3.2 The palette

| Hue | pastel | deep | ink |
|---|---|---|---|
| Blossom | `#F7B3CA` | `#C2457A` | `#A83E68` |
| **Rose** (primary) | `#F291B1` | `#C2457A` | `#A83E68` |
| Peach | `#F9B98D` | `#C0692F` | `#A34B34` |
| Soft Coral | `#F79079` | `#C86243` | `#A34B34` |
| Muted Gold | `#EFC55E` | `#B08322` | `#7E5B0C` |
| Lavender | `#BFA0EE` | `#8A63C4` | `#64438F` |
| Lilac | `#DDC9F5` | `#8A63C4` | `#64438F` |
| Sage | `#6FC494` | `#3A8A5E` | `#2E6B49` |
| Sky | `#9DBEE8` | `#5B84BC` | `#3F6699` |

### 3.3 Paper — never plain white, never plain black

| Token | Light | Dark |
|---|---|---|
| Canvas top | `#FFFAF7` warm white | `#120E14` plum ink |
| Canvas bottom | `#FBEFF1` blush | `#17111A` |
| Card | `#FFFDFB` cream | `#1C161F` |
| Raised | `#FFFFFF` | `#251E29` |

**The card is lighter than the canvas it floats on.** That ~2% luminance step
plus a wide rose-tinted shadow is what separates them. `cardBorder` is
`transparent` in both themes and a test asserts it. If borders ever look
necessary again, the bug is in the palette, not in `Surface`.

Dark mode is plum ink, not charcoal: neutral grey drains the warmth out of
every pastel laid on it.

### 3.4 The colour-blindness finding

This is the most consequential decision in the system, so the evidence is
recorded rather than summarised.

The four phase hues were run through a CVD validator (adjacent-pair ΔE in
OKLab ×100, deuteranopia/protanopia/tritanopia simulated):

| Palette | Normal vision | Deuteranopia | Verdict |
|---|---|---|---|
| Rose / **Peach** / Gold / Lavender | ΔE 6.8 | **ΔE 0.7** | peach and gold are literally the same colour |
| Rose / **Sage** / Gold / Lavender (tuned) | ΔE 15.3 ✅ | ΔE 3.1 ❌ | best achievable on-brand |

Deuteranopia collapses pink and green *by definition*. **No arrangement of four
soft pastel hues passes.** The options were: use four garish hues, drop to two
phases, or stop asking colour to do the job.

**Colour was demoted to reinforcement and shape promoted to carrier.** Phase
identity is now four silhouettes — drop, leaf, sun, moon — that survive any
colour vision, greyscale printing, and a 10px calendar dot. Rendered by
`components/PhaseMark`; three tests in `contrast.test.ts` stop anyone reverting
to bare coloured dots.

A pleasant side effect: the shapes tell the garden story *better* than the
hues did. A moon reads as "winding down" instantly; lavender has to be learned.

### 3.5 Where colour is reserved

**Red is only ever destructive confirmation.** Errors use a soft rainbow
illustration and a retry button. Spending red on "the network hiccuped" leaves
nothing in reserve for "erase all your cycle history".

---

## 4. The living canvas

`src/theme/atmosphere.ts` · `src/components/Atmosphere.tsx` · 30 tests

One pure function answers one question — *what does the app feel like right
now?* — from three inputs (cycle phase, hour, reduced-motion) and returns a
record the visual layer consumes wholesale. One function, so a phase change
re-tints the whole app coherently instead of via conditionals in eleven screens.

### 4.1 Output

```ts
{ canvas: [4 stops], orbs: [3], glow, hue, mote, moteCount, lightAngle, warmth, driftSec }
```

`lightAngle` is shared: card rim highlights and the ring's gradient sweep all
align to it, so lighting across the app agrees with itself instead of every
gradient picking its own direction.

### 4.2 Rendering — four strata

1. **Canvas** — 4-stop vertical wash, graded by phase and hour
2. **Blooms** — three soft-falloff orbs drifting on unrelated periods
3. **Petals** — three parallax layers of drifting petals
4. **Grain** — static speckle so large washes don't band on 6-bit panels

**Performance contract: at most six animated nodes regardless of particle
count, zero React re-renders once mounted, no per-particle animation ever.**

The trick that buys it: each layer is *one* `Svg` whose petals are drawn twice,
at `y` and `y+h`. The layer translates upward by exactly one screen height on
loop, so the second copy slides into the first's place and the seam is
invisible. One transform per layer, not one per petal. Sway rides the same
shared value, so horizontal drift is free.

### 4.3 Why the previous version was zeroed out, and why it's back

An earlier pass set the canvas to flat `#FFF`/`#000` after device feedback that
phase tinting read as *a colour cast over the app*. **That feedback was correct
and the diagnosis was wrong.**

The problem was never that the canvas had colour. It was that the canvas had
colour **uniformly**: a flat 8% rose over the whole screen has no light source,
so the eye files it as broken white balance rather than as atmosphere.

Three changes fix it:

1. **The canvas is already warm before phase touches it.** Shifting a warm
   canvas reads as weather; tinting a white one reads as a filter.
2. **Tint pools downward.** `PHASE_LIFT` rises from 0.15 at the top of the
   screen to 1.0 at the bottom, so colour gathers where light would settle.
   This gives the gradient a direction and therefore a cause. *This is the
   single change that made phase colour stop looking broken.*
3. **Day is nearly clean.** Midday is the reference white; phase is most
   visible at dawn, dusk and night — the hours the app is actually opened, and
   the hours the eye forgives colour.

### 4.4 Reduced motion

Handled in one place so exactly one thing can get it wrong: motes → 0,
`driftSec` → Infinity, which the renderer reads as "draw the static frame".

**It removes movement, never colour.** A test asserts `canvas`, `glow` and
`orbs` are byte-identical with and without the flag. Someone who gets motion
sick still deserves the app to feel like evening at 9pm. Reduced motion is not
reduced beauty.

---

## 5. Typography

`src/theme/tokens.ts`

Two faces. `FONT` (system) for body; `FONT_DISPLAY` (rounded) for headings —
roundness in the letterforms separates "friendly" from "clinical" faster than
any amount of colour.

| Variant | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 46 / 50 | 700 | −1.4 | hero numerals only |
| `title1` | 33 / 40 | 700 | −0.7 | screen titles |
| `title2` | 27 / 34 | 700 | −0.5 | phase names |
| `title3` | 22 / 29 | 600 | −0.35 | greeting, card heroes |
| `headline` | 17 / 23 | 600 | −0.2 | card headings, rows |
| `body` | 16 / 25 | 400 | −0.1 | prose |
| `callout` | 15 / 22 | 400 | −0.1 | supporting |
| `subhead` | 14 / 20 | 500 | 0 | labels |
| `caption` | 13 / 19 | 400 | 0 | captions |
| `overline` | 12 / 16 | 600 | +0.4 | eyebrows |

Two decisions worth keeping:

- **Line heights run generous (~1.5 on body)** because Bloomly is read while
  tired, in bed, one-handed.
- **Overlines are sentence case with open tracking, not SCREAMING CAPS.**
  All-caps is the single most institutional thing a soft app can do, and it
  costs legibility at 12pt for nothing.

Display sizes use the rounded face; everything from `headline` down uses the
system face, because a rounded face at 13pt loses more legibility than it gains
warmth.

### Rounded-face status — the one open item

`FONT_DISPLAY` resolves to SF Pro Rounded on iOS (ships with the OS), to
`sans-serif-medium` on Android (no rounded system face exists), and to a
rounded stack on web. Where the name doesn't resolve the platform falls back to
the system face — degraded, never broken.

**The upgrade is one line.** Bundle a rounded family (Nunito or Quicksand both
suit) via `expo-font` and set the constant to its family name. Nothing else
changes, because every string goes through `components/Text` and every heading
reads `TYPE.*`. This is deliberately left as a decision rather than made,
because bundling a font family is a bundle-size and licensing call.

---

## 6. Space, shape, depth

### Spacing — 4-based, generous

`xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · h1 32 · h2 44 · h3 56 · h4 72`
Gutter 22 · tabSafe 124

`h1`–`h4` are **composition** steps, not sizes: they are the gaps that separate
ideas. Using `lg` where `h2` belongs is how a page turns into an
undifferentiated list.

> **The composition rule: proximity carries grouping.** Related things sit
> `SPACE.sm` apart and read as one object. Unrelated clusters sit `SPACE.h2`
> apart. Home was previously ten full-width blocks at a uniform `SPACE.lg` —
> which is *why* it read as disconnected. Ten equally-spaced identical cards
> produce a list with no structure. That was a spacing problem wearing a
> styling costume, and no amount of card decoration fixes it.

### Radius — rounder than a system default

`xs 10 · sm 14 · md 18 · lg 22 · card 28 · hero 34 · sheet 32 · pill 999`

A 28pt radius on a 200pt card is the cheapest thing that makes an interface
feel kind. Below ~20 on anything larger than a chip, the surface reads as a
dialog.

### Elevation — warm light, never a line

`shadowColor` is a desaturated plum `#7A4356`, not black. Black shadow under a
blush card turns the halo grey and instantly cheapens the surface — the shadow
has to belong to the same world as the thing casting it.

Offsets are large relative to opacity: wide and faint reads as *daylight in a
room*; tight and dark reads as a drop-shadow filter.

| | offset | blur | opacity |
|---|---|---|---|
| `xs` | 2 | 6 | 0.06 |
| `sm` | 6 | 18 | 0.08 |
| `md` | 12 | 30 | 0.11 |
| `lg` | 20 | 48 | 0.14 |
| `xl` | 28 | 64 | 0.17 |

Dark mode uses near-black at ~4× the opacity — a plum shadow on a plum canvas
is invisible.

---

## 7. Motion

| Token | ms | Use |
|---|---|---|
| `instant` | 120 | press feedback, selection ticks |
| `fast` | 220 | chips filling, toggles |
| `base` | 340 | cards entering, sheets, cross-fades |
| `slow` | 520 | phase change, environment cross-fade |
| `bloom` | 900 | a flower opening |
| `ambient` | 4200 | breathing glows, drifting petals |
| `stagger` | 70 | delay between sibling reveals |

### Springs

| | damping | stiffness | mass | Use |
|---|---|---|---|---|
| `spring` | 18 | 180 | 0.9 | the default. Settled, never bouncy |
| `springSoft` | 22 | 120 | 1.0 | sheets, large surfaces |
| `springSnap` | 15 | 260 | 0.7 | press states, marker dots |
| `springBloom` | 11 | 150 | 0.8 | **the only spring allowed to overshoot** |

`springBloom` is reserved for things that literally bloom: petals opening, a
mood face landing, a chip filling, confetti. Used anywhere else it turns the app
into a toy.

### Guidelines

- **Motion settles, it never bounces.** Personality lives in the spring, not in
  long fades.
- **`BREATH` (4s in, 6s out) is shared.** The ambient glow, the Bloom Ring halo
  and the breathing exercise all inhale on the same clock, so the app breathes
  together rather than each component picking its own tempo.
- **Only one thing per screen may loop.** Two competing ambient rhythms make a
  page feel nervous rather than alive.
- **Celebrations never block.** `pointerEvents="none"`, ~1.5s, and the screen
  underneath stays fully interactive. A celebration you have to wait out is a
  penalty for succeeding.
- **Reduced motion renders the still frame**, with colour intact.

---

## 8. Illustration guidelines

`src/components/Illustration.tsx` — 12 scenes

Four moves, and the shared *construction* — not the subject matter — is what
makes a butterfly and a shield read as the same brand:

1. **A ground.** One wide, very faint ellipse under the subject. Without it a
   flat illustration floats in a void; with it the object is resting on
   something. Cheapest craft signal in the set.
2. **Two values per shape.** A pastel body and one darker facet, never a
   gradient mesh. Flat means flat.
3. **A single accent.** Exactly one element in a warmer or cooler hue, to give
   the eye somewhere to land.
4. **No outlines.** Shapes separate by value. An outlined flat illustration is
   a colouring book; an unoutlined one is a paper cut-out.

**Never medical.** Symptom icons draw the *sensation*, not the body part —
cramps are a radiating pulse, not a uterus. A period tracker that draws organs
at people is a clinic.

**Motion budget: at most one animated node per illustration**, always a slow
whole-object sway or breath, never per-petal. All twelve read the same shared
clock.

**Why code and not PNGs:** they re-tint per theme (a lavender that works on
cream is invisible on plum), scale without a @3x set, animate their own ambient
loop, and add zero bundle bytes.

Roster: `bloom · sprout · moon · sunrise · butterfly · bird · shield · vase ·
calendar · petals · teacup · rainbow`

---

## 9. Icon guidelines

`src/components/Icon.tsx` — 57 glyphs, the only icon source

- 24×24 grid, stroke-only, round caps and joins, uniform 1.75 weight scaled
  with size so optical weight is constant.
- Geometry simplified to the minimum that reads at 20pt.
- **Never emoji.** Emoji can't inherit colour, can't match stroke weight, and
  render as a different drawing on every platform.

**A caught mistake worth recording:** the settings glyph was a hub with eight
radial spokes — geometrically *the same drawing as a sun* — sitting two icons
from the theme toggle's actual sun in the tab bar. Redrawn as sliders. Draw the
icon set together and look at it together.

Phase marks (`PhaseMark`) are the exception to stroke-only: they are **filled
silhouettes**, because at 10px a stroked outline turns to mush while a filled
shape survives all the way down to a calendar dot — the size that matters most.

---

## 10. Component library

All in `src/components/`. Every screen composes from these; none hand-rolls a
font size, a radius or a shadow.

### Foundations
| Component | Notes |
|---|---|
| `Screen` | Page scaffold. Owns canvas, content column, gutter, tab-safe inset. Renders `<Atmosphere/>` so ambient life is a property of *being a screen*. Publishes scroll offset via `ScrollContext` as a `SharedValue` — read with `useScrollY()` inside worklets, so scroll-reactive effects cost zero re-renders. |
| `Surface` | The card. Variants `hero · card · quiet · glass · inset`. **At most one `hero` per screen.** `quiet` is translucent so secondary cards recede *into* the atmosphere. `tint` washes a card in a brand hue at ~7%. `lift` opts into scroll parallax (one node per card, opt-in so a long list doesn't allocate twenty). |
| `Text` | Typed primitive. Pick a `variant` + `tone`, never a font size. `tabular` for numbers. |
| `Icon` | The icon set. |
| `Reveal` | The one staggered entrance (`index × MOTION.stagger`). |

### Signature
| Component | Notes |
|---|---|
| `BloomRing` | §11. |
| `TodaysGarden` | §12. |
| `MoodBloom` | Nine feelings as flowers with faces. **Petals change shape with the mood, not just hue** — that is the difference between nine coloured circles and nine feelings, and it is also the colour-blind story. |
| `PhaseMark` / `PhaseLegend` | The four phase silhouettes. Use anywhere a phase appears — never a bare coloured dot. |
| `PetalBurst` | Petals, not confetti rectangles. Ballistic arc so it *falls*; radial-only reads as a firework. |
| `SplashBloom` | Three petal rings opening outside-in. |
| `Illustration` | §8. |

### Controls
`Button` (pill, tonal gradient, press squashes *and* softens its shadow — opacity alone reads as "disabled", the opposite message) · `Chip` (opens a small flower behind the icon on select) · `Toggle` · `Severity` · `Stepper` · `Pill` · `Row` · `TextField` · `DateField` · `Notice`

### Data
`PetalChart` (§13) · `BarChart` · `Sparkline` · `MetricCard` · `InsightCard` · `AnimatedNumber` · `GhostChart`

### States
`EmptyState` · `ErrorState` · `LoadingState` · `BloomLoader` · `Shimmer`

---

## 11. The Bloom Ring — signature object

`src/components/BloomRing.tsx`

**A flower opening over a month**, not a progress bar.

Twelve petals around a ring. Each owns a slice of the cycle and takes the colour
of the phase that slice falls in. Petals behind you are open and full-colour;
petals ahead are folded, small and pale; the petal you are standing in is caught
mid-open.

Three things fall out of that, each replacing a piece of UI:

- **Progress is legible without a number.** How much of the flower is open *is*
  how far through the cycle you are.
- **Phase is legible without a legend.** The colour under the open petals is the
  phase; the boundary between colours is where phases change.
- **It rewards returning.** Visibly different on day 4 and day 22.

Petal colours come from `getCyclePhase()`, so the flower **cannot** disagree
with the label printed under it.

### Implementation notes

Each petal is an absolutely-positioned `Animated.View` holding one tiny `Svg`,
not a path in a shared canvas. Animating path geometry means rebuilding `d`
every frame; animating a **View transform** is worklet-native and behaves
identically on react-native-web, where the preview workflow lives. Cost: 12
animated nodes — affordable *here* precisely because it isn't everywhere
(`Atmosphere` runs on every screen under a six-node budget; this is one hero on
one screen).

### Two tuning failures worth recording

The folded-petal radius has a narrow window and both ends look broken:

| `grow` floor | Result |
|---|---|
| 0.80 | petals stay near the rim → a day-3 flower reads as a **sun**, eleven pale spikes |
| 0.50 | petals pull *inside* the core disc and vanish → one lonely petal beside a white circle |
| **0.72** | bud cluster sits just outside the core, where a real bud is |

The constraint is arithmetic: `rBase·grow − (ph·scaleY)/2` must exceed the core
radius. Both failures were caught by screenshotting, not by reasoning.

Similarly, the halo started as a flat `backgroundColor` circle. **An even fill
has a hard edge at any alpha**, so it read as a solid pink *plate* behind the
flower. It is now a radial gradient falling to zero opacity, which has no edge
at all. The same bug existed in the onboarding backdrop orbs and was fixed the
same way.

---

## 12. Today's Garden — the returning-user mechanic

`src/utils/garden.ts` (RN-free, 20 tests) · `src/components/TodaysGarden.tsx`

Every log plants something. Over weeks the strip of soil at the bottom of Home
fills in: bare earth → one sprout → a row of sprouts → buds → flowers → a garden.

### Why a garden and not a streak

A streak **punishes**. It has a number that can go to zero, and it will do so on
the one week someone is too unwell to open a period tracker. That turns a health
app into a source of guilt.

A garden only ever accumulates. Miss a month and it is still there, exactly as
you left it. The incentive to return is that returning *adds* something, not
that staying away destroys something. **Same retention mechanic, opposite
emotional sign.**

There is deliberately no decay, no wilting, and no "your garden misses you" copy
anywhere in the module. All three were considered and all three reintroduce the
punishment through the back door. A test asserts the functions take no time
input, so adding wilting means deleting a test that explains why not to.

### Rules encoded and tested

- **The first log must visibly change something**, or the mechanic never teaches
  itself. Thresholds are front-loaded (1, 4, 10, 20, 40) then stretch out.
- **Counted by day, not by entry.** Six symptoms on one bad day must not grow six
  flowers while a quiet day grows none — that rewards suffering.
- **A reset session counts as much as a log.** Taking a moment for yourself
  counts; that is why Reset is in this app rather than being a separate product.
- **Capped at 14 plants**, so a long-time user's garden stays a garden, not a
  hedge.
- **The mix shifts with the stage**, not just the count — a mature garden must
  look *different*, not merely denser.
- **No stage label may contain a digit.** "Level 3" and "12/20" are exactly the
  framing this mechanic exists to avoid. The whole gamification surface is one
  hairline progress bar and a warm sentence.

Motion: **one shared wind** drives every plant's sway, each reading it at its own
phase with amplitude derived from its own height. Fourteen plants, one node.

---

## 13. Data visualisation

### Choosing a form

| Data | Form | Why |
|---|---|---|
| indexed by **cycle day** | `PetalChart` | a cycle is a closed loop |
| everything else | `BarChart` / `Sparkline` | ordinary magnitude / trend |
| a single headline | `MetricCard` | not every number is a chart |

**`PetalChart` is only ever used for values indexed by cycle day.** Radial charts
are usually a mistake — they distort area and are chosen because they look good.
The exception is earned here because a cycle is genuinely periodic: day 28 is
adjacent to day 1, and a Cartesian axis has to *cut that loop somewhere*,
inventing a false discontinuity exactly where the most interesting transition
happens. Wrapping a non-periodic time series into a circle because circles are
pretty is the anti-pattern this rule exists to prevent.

### How the petal chart stays readable

1. **Length encodes value, not area.** A true Nightingale rose encodes by area
   and systematically overstates large values. This does not.
2. **Labelled gridline rings**, placed on the vertical so they never collide
   with a petal tip.
3. **Zero-anchored.** A petal at the hub means no data, visibly different from a
   short petal.
4. **Phase marks, not phase colours**, in a mandatory legend.
5. **A 2px surface gap** between petals, expressed angularly so it holds at
   every radius.

### Mark specification (all charts)

- **Rounded data-end only** — top corners rounded, baseline square. A fully
  rounded bar detaches from its axis and reads as a floating pill.
- **Zero-anchored, always.** Truncating an axis to "show the trend better" is
  lying with geometry.
- **Bar width capped at 56pt.** Bars stretched across a card read as colour
  blocks; the eye starts comparing *areas* instead of heights, which is the
  exact distortion a bar chart exists to avoid.
- **Selective direct labels** — only the peak carries its number. Labelling every
  bar turns a chart into a table with decoration.
- **Recessive grid** — one dashed mean line at most, in tertiary ink.
- **Never a dual axis.** Two measures of different scale → two charts.
- **Chart marks use `deep`, never `pastel`.** Rose pastel is 2.19:1 on cream,
  under the 3:1 WCAG requires of a graphical object. This was a live bug found
  during the redesign.

---

## 14. Information architecture

```
Root
├── Splash                    (gated on hydration AND intro completion)
├── Onboarding                6 pages → writes User, flips showOnboarding
└── MainTabs
    ├── Home        ▸ Period Logger · Symptoms · Mood · Insights · Reset · Calendar · Analytics
    ├── Calendar
    ├── Analytics
    └── Settings
└── EscapePlayer              root-level, covers the tab bar (full immersion)
```

Four tabs, deliberately. Everything reachable from Home is a *task* (logging,
checking in, resetting) and tasks belong behind the screen that motivates them,
not in a permanent bar. A five-tab bar with a centre FAB was considered and
rejected: it puts "add" at the same level as "where am I", and in this app
"where am I in my cycle" is the reason to open the app at all.

### Primary flow

```
open → Home (Bloom Ring answers "where am I") 
     → "Log period" CTA  → Period Logger → save → petal burst → Home, garden grows
     → quick actions     → Mood / Symptoms → save → burst → Home
     → heavy check-in    → inline reset offer → Escape Player → check-out → Insights
```

The adaptive loop is worth naming: a heavy mood check-in earns a gentle **offer**
of a two-minute reset, never a redirect. Being moved somewhere you did not ask to
go is the opposite of care, however good the destination. Check-out responses
feed two insight generators, which is what turns the calming scenes from a toy
into a wellness feature — the app can eventually tell you whether resets actually
help *you*.

---

## 15. Screens

Implemented and following the language:

| Screen | Notes |
|---|---|
| **Splash** | Bloom opens over ~900ms. Gate requires hydration **and** intro completion — dismissing early cuts the flower off mid-open, and a half-finished animation reads as a glitch where a complete one reads as an intro. |
| **Onboarding** | 6 pages. Each either explains a benefit or asks for exactly one thing, never both. Petal-row progress. |
| **Home** | Four movements: Bloom Ring (no card, floating on the canvas — wrapping it in a Surface is what flattened it) → Act (gradient CTA welded to the two numbers it changes) → Today (quiet tinted cards) → Garden (last, unhurried). **No streak, no completion percentage, no "you haven't logged in 3 days".** |
| **Calendar** | Phase silhouettes per day, phase legend, expanding day panel. |
| **Symptoms** | Four short grouped sections. Four decisions of three options beat one decision of ten. Severity appears only for what was actually chosen — asking "how bad?" about eight unselected symptoms is the fastest way to make a check-in feel like paperwork. |
| **Mood** | Nine named feelings; the card washes to the chosen feeling's hue and that bloom grows an aura and breathes. The rest of the form doesn't exist until a feeling is picked. |
| **Analytics** | Cycle stats, bar series, prediction confidence, mood/energy sparklines. |
| **Insights** | AI cards with tone badge, confidence meter, sparkline evidence, "why this" disclosure. |
| **Reset** | Seven calming scenes as full-bleed art cards with living miniature previews. |
| **Period Logger** | The only writer of `periodEntries`. |
| **Settings** | Grouped rows, theme, privacy, data. |

### Specified, not built

These are new **features**, not redesigns. Each needs product decisions (and two
need a backend) that a visual language cannot supply. Specified here so the
direction is settled when they're picked up.

| Screen | Blocked on | Direction |
|---|---|---|
| **Sign In** | Backend. Local-only is currently the privacy selling point. | Guest-first: the app must be fully usable with no account. Apple/Google/email as *optional sync*, introduced only when there is something to sync. Never a wall in front of the product. |
| **Community** | A server, moderation policy, and a safety review. | Anonymous, flower reactions instead of likes, no follower counts. Health communities without moderation cause harm; this should not ship until moderation is resourced. |
| **Premium** | A pricing decision and IAP. | Muted gold, never rose — the brand colour shouldn't be the paywall colour. No countdown timers, no crossed-out prices. |
| **Journal** | New data model + photo/mic permissions. | Notebook UI on the cream card, mood stickers from `MoodBloom`, flower-margin backgrounds. Buildable locally without a backend — the nearest of the four. |
| **Notifications centre** | Product decision on what's worth surfacing. | Timeline of rounded cards; the local reminder scheduler already exists in `services/notifications.ts`. |
| **Profile** | Overlaps Settings. | Likely a Settings section (achievements in muted gold, cycle history, backup) rather than a fifth tab. |

---

## 16. Adaptation

### Mobile-first
`CONTENT_MAX_WIDTH` caps the content column; `SPACE.gutter` (22) is the edge
inset. `scale()` and `fontScale()` in `utils/responsive.ts` soften sizing on
small devices.

### Tablet
The column cap already centres content on wide screens rather than stretching
line lengths past readability — the single most important tablet behaviour, and
it works today. Beyond that, three changes are specified but not built:

- Home becomes two columns: ring + garden left, Today cards right.
- Calendar shows the month and the day panel side by side instead of stacked.
- `Surface` `hero` gains a wider max-width so it doesn't become a letterbox.

### Light / dark
Both are **designed**, not flipped. Dark mode selects its own values from the
same ramps: plum ink rather than inverted cream, pastels carrying text where
inks carry it in light, shadows near-black at ~4× opacity, and higher atmosphere
alphas because tint on a dark canvas has to *add* light.

---

## 17. Accessibility

| Requirement | How | Enforced by |
|---|---|---|
| WCAG AA text | every ink ≥4.5:1 on cream **and** blush | `contrast.test.ts` |
| WCAG 1.4.11 UI | every `deep` ≥3:1 on both | `contrast.test.ts` |
| Colour blindness | phase carried by **silhouette**; flow drawn as a petal *count*; moods differ in petal *shape* | `contrast.test.ts` (glyph distinctness) |
| Touch targets | `MIN_TAP` 44 floor; `MIN_TAP_COMFORT` 56 for anything tapped while unwell | convention |
| Dynamic Type | `allowFontScaling` on; `fontScale()` softens the ramp | convention |
| Reduced motion | resolved in one place; removes movement, **never colour** | `atmosphere.test.ts` |
| Screen readers | `PhaseMark` labelled, ring has an image role with day + phase, mood grid is a `radiogroup`, chips are `checkbox` with state, progress is a `progressbar` | convention |
| Never colour-alone | selection also changes weight, shape and state; legends always pair mark with name | convention |

**The honest limitation:** the phase hues do not pass deuteranopia separation and
cannot be made to. Shape carries phase everywhere. If you add a surface that
shows phase, it must use `PhaseMark` — a coloured dot is a regression even
though no test can catch it in a new file.

---

## 18. Microinteraction specification

| Interaction | Spec |
|---|---|
| **Button press** | scale → 0.976 on `springSnap`; `shadowOpacity` → 0.04 simultaneously. Selection haptic on press-in. Squash + shadow-soften reads as *pushed into the page*; opacity alone reads as disabled. |
| **Card press** | scale → 0.986 on `springSnap`, selection haptic. |
| **Chip select** | fill cross-fades rest → ink; three petals spring open behind the icon on `springBloom` (−40° → 0°, scale 0.3 → 1); label cross-fades ink → white; light impact haptic. |
| **Mood select** | bloom scales +10% on `springBloom`; aura grows 0.7 → 1.22 and fades in to ~0.28; the selected bloom starts breathing while the other eight go still; card washes to the hue over `MOTION.slow`. |
| **Bloom Ring mount** | `bloom` 0 → 1 over 900ms on `bezier(0.16,1,0.3,1)` after a 140ms delay. Each petal's openness is `target × bloom`, so the stagger is geometric, not a delay chain. |
| **Ring halo** | radial gradient; opacity 0.62 → 1.0 and scale 0.94 → 1.04 on the shared 4.2s breath. |
| **Garden growth** | each plant springs up with `index × 70ms` delay; `scaleY` 0 → 1 with `translateY` compensation so it grows *from the soil*. |
| **Garden sway** | one shared value; per-plant phase offset `index × 0.9`, amplitude `2 + height × 5`. |
| **Save completion** | `PetalBurst` — 16 petals, ballistic (constant horizontal velocity, gravity on vertical), 1.5s, per-petal delay up to 130ms re-normalised so all finish together. Success haptic. Navigation waits 620ms — the petals' apex. |
| **Scroll parallax** | header drifts −22pt and fades to 0.35 over 140pt; hero ring drifts −52pt, scales to 0.93, fades to 0.5 over 320pt; `lift` cards rise 10pt → 0. All in worklets, zero re-renders. |
| **Tab activation** | icon scale +6%, `translateY` −1.5, stroke weight 1 → 1.15 on `spring`. Weight change carries selection alongside colour. |
| **Screen entrance** | `Reveal` at `index × 70ms`. |

---

## 19. Developer handoff

### Where things live
```
src/
├── constants/index.ts     BLOOM hues, PAPER, phase tables, PHASE_GLYPH, symptom + mood data
├── theme/
│   ├── tokens.ts          SPACE RADIUS TYPE SHADOW MOTION BREATH MIN_TAP
│   ├── palette.ts         light/dark surface + ink
│   ├── atmosphere.ts      the pure grading function  (+ .test.ts)
│   ├── useAtmosphere.ts   binds it to live cycle state
│   ├── usePhaseColor.ts   surface-safe phase hue
│   └── contrast.test.ts   the accessibility enforcement
├── components/            the library (§10)
├── screens/               one file per screen
├── utils/
│   ├── cycleCalculations.ts  phase maths      (+ .test.ts)
│   ├── garden.ts             garden mechanic  (+ .test.ts)
│   ├── tinyEscapes.ts        Reset registry   (+ .test.ts)
│   └── aquarium.ts           worklet maths    (+ .test.ts)
└── escapes/               the seven calming scenes
```

### Rules that will bite you

1. **`Alert.alert` is a NO-OP on react-native-web.** Not cosmetic — a
   button-array Alert means the buttons never exist, so the action is
   unreachable. Three validation guards and two destructive actions were
   silently dead this way. Use `components/Notice` or an inline confirm. Grep
   before adding one.
2. **`EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` is permanent, not a
   workaround.** SDK 56 flags `expo-router` as incompatible with
   `@react-navigation`; `expo-router` arrives transitively and can't be
   uninstalled. Already set in `eas.json` `build.base.env`.
3. **Never junction `node_modules` into a git worktree.** `git worktree remove
   --force` recurses *through* the junction and deletes the real directory's
   contents. This has already happened once.
4. **Web UI testing lies in two specific ways.** Inactive tab screens stay
   mounted in the DOM, so finding an element is not proof it is visible —
   navigate for real. And puppeteer's auto-scroll does not work inside RN-web
   `ScrollView`s; clicks on below-the-fold elements clamp to the viewport edge
   and land on the tab bar. `scrollIntoView({block:'center'})` then click by
   bounding-box centre.
5. **SVG gradient `id`s must be unique per mounted component.** Web shares one
   DOM document, so two components using `id="glow"` will silently share the
   first one's gradient.
6. **Reanimated: import `SharedValue` as a named export**, not
   `Animated.SharedValue` — the namespace doesn't export it.

### Adding a new screen

```tsx
<Screen title="Title" subtitle="One short line">
  <Reveal index={0}>
    <Surface variant="hero">…</Surface>   {/* at most one per screen */}
  </Reveal>
  <Reveal index={1}>
    <Surface variant="quiet" lift tint={BLOOM.lavender.pastel}>…</Surface>
  </Reveal>
</Screen>
```

Static styles in a module-level `StyleSheet.create`; dynamic bits inline from
`c.*` and tokens. Never a literal font size, radius or shadow.

### Adding a colour

Add all three values to `BLOOM`, add the pastel→ink and pastel→deep entries to
`INK` and `DEEP`, and run `npm test`. The contrast suite iterates `BLOOM`
automatically, so a new hue is audited the moment it exists.

### Verify
```bash
npm run typecheck                          # tsc --noEmit, must be clean
npm test                                   # 244 tests
EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1 npx expo start --web --port 8082
node scripts/screenshot.js scratch [dark]   # seeded visual check
```

**Screenshot before you believe it.** Four real bugs in this redesign — the
plate-not-glow halo, the sun-not-flower petals, the sun-not-gear settings icon,
and a canvas tinting peach for a phase that had moved to sage — were invisible
to both the typechecker and the test suite, and obvious in a screenshot.

---

## 20. Open items

| Item | Status |
|---|---|
| Bundle a rounded display face | Decision, not work. One constant. §5. |
| Tablet two-column layouts | Specified §16, not built. Column cap already prevents the worst failure. |
| Sign In / Community / Premium / Journal | Specified §15, blocked on product + backend. |
| `upsertSymptomLog` doesn't dedupe by type | Pre-existing bug, unrelated to the redesign. Re-logging cramps on one day stores it twice. |
| `eas login` | The only human step blocking a build. |
| Store listing, privacy policy URL, data-safety answers | Not code. |
