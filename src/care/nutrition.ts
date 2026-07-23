import { CareSymptom } from './types';
import { SourceId, Strength } from './evidence';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EAT / DRINK / CARE FOR — the non-movement suggestions.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── The line this file walks ──────────────────────────────────────────────
 *
 * Nutrition is where period apps do their worst work. The genre convention is
 * a confident list — "magnesium reduces cramps", "cut out dairy", "seed
 * cycling" — that sounds authoritative and is mostly unsupported.
 *
 * The actual state of the evidence, from the Cochrane review of dietary
 * supplements for dysmenorrhoea: **"no high quality evidence to support the
 * effectiveness of any dietary supplement"**, and evidence of safety is
 * lacking too. Some individual supplements have low-quality positive signals
 * (magnesium, vitamin B1, omega-3), which is worth something but is not worth
 * a recommendation with a dose on it.
 *
 * So three rules, all encoded in the data:
 *
 * 1. **Food, never doses.** Bloomly suggests "something with magnesium in it —
 *    dark chocolate, nuts, leafy greens". It never says how many milligrams of
 *    anything, because that is a supplement recommendation wearing a food
 *    costume, and it is not a call an app can make.
 * 2. **`strength` is honest and visible.** Most of this file is `limited`, and
 *    the UI renders that as "Evidence is limited" rather than hiding it. A
 *    suggestion that is pleasant, harmless and weakly supported is fine to
 *    make — as long as you say which of those three it is.
 * 3. **Iron is the one that is properly grounded.** Heavy periods are a common
 *    cause of iron deficiency, per the NHS, and the vitamin C pairing advice
 *    is standard dietetic guidance rather than folklore. That entry gets to be
 *    `good`; almost nothing else does.
 *
 * ── Never restriction ─────────────────────────────────────────────────────
 *
 * Nothing in this file tells anyone to cut something out. Bloomly is used by
 * people at every relationship with food, on days they feel bad about their
 * bodies, and "avoid sugar" is not worth the risk of being the sentence that
 * lands badly. Where a guideline mentions reducing caffeine or alcohol, it is
 * phrased as an option and framed around how it might feel — never as a rule.
 */

export interface CareItem {
  id: string;
  title: string;
  /** The "why". Shown alongside, never hidden behind a tap. */
  why: string;
  strength: Strength;
  sources: SourceId[];
  /** Symptoms this is offered for. Empty means "always eligible". */
  forSymptoms?: CareSymptom[];
  icon?: string;
  hue?: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Eat
// ───────────────────────────────────────────────────────────────────────────

export const FOODS: CareItem[] = [
  {
    id: 'iron',
    title: 'Something iron-rich',
    why: 'Heavy periods are one of the most common causes of low iron. Red meat, sardines, lentils, beans, tofu, dark leafy greens and fortified cereals are all good sources.',
    strength: 'good',
    sources: ['nhsIronAnaemia', 'nhsHeavyPeriods'],
    forSymptoms: ['fatigue'],
    icon: 'leaf',
    hue: 'sage',
  },
  {
    id: 'vitaminC',
    title: 'Vitamin C alongside it',
    why: 'Vitamin C markedly increases how much iron your body absorbs from plant sources. Peppers, citrus, strawberries or a glass of orange juice with the meal is enough — no supplement needed.',
    strength: 'good',
    sources: ['nhsIronAnaemia'],
    forSymptoms: ['fatigue'],
    icon: 'sun',
    hue: 'gold',
  },
  {
    id: 'magnesium',
    title: 'Magnesium-rich foods',
    why: 'Nuts, seeds, dark chocolate, beans and leafy greens. Reviews have found low-quality evidence that magnesium may help period pain, though the right amount is unclear — so this is food, not a supplement suggestion.',
    strength: 'limited',
    sources: ['cochraneSupplements'],
    forSymptoms: ['cramps', 'backPain'],
    icon: 'sparkles',
    hue: 'lavender',
  },
  {
    id: 'omega3',
    title: 'Oily fish or seeds',
    why: 'Salmon, mackerel, sardines, walnuts, chia and flax. Several small reviews suggest omega-3 may reduce period pain, though the evidence is not strong enough for a firm recommendation.',
    strength: 'limited',
    sources: ['cochraneSupplements'],
    forSymptoms: ['cramps'],
    icon: 'water',
    hue: 'sky',
  },
  {
    id: 'complexCarbs',
    title: 'Slower carbohydrates',
    why: 'Oats, wholegrain bread, rice, potatoes. Steadier energy across the afternoon than something quick, which tends to help when you are already tired.',
    strength: 'moderate',
    sources: ['nhsIronAnaemia'],
    forSymptoms: ['fatigue', 'cravings'],
    icon: 'flame',
    hue: 'peach',
  },
  {
    id: 'protein',
    title: 'Protein with each meal',
    why: 'Eggs, yoghurt, beans, fish, chicken, tofu. Helps meals hold you for longer, which makes the afternoon dip less sharp.',
    strength: 'moderate',
    sources: ['nhsIronAnaemia'],
    forSymptoms: ['fatigue', 'cravings'],
    icon: 'heart',
    hue: 'rose',
  },
  {
    id: 'warmMeal',
    title: 'Something warm and simple',
    why: 'Soup, dal, congee, scrambled eggs. Easy to eat when your appetite is odd, and warm food is comforting in a way that is hard to argue with.',
    strength: 'limited',
    sources: ['clevelandDysmenorrhea'],
    forSymptoms: ['nausea', 'digestive', 'cramps'],
    icon: 'flame',
    hue: 'coral',
  },
  {
    id: 'smallMeals',
    title: 'Smaller plates, more often',
    why: 'When you are bloated or queasy, several small things across the day usually sit better than one large meal.',
    strength: 'limited',
    sources: ['clevelandDysmenorrhea'],
    forSymptoms: ['bloating', 'nausea', 'digestive'],
    icon: 'clock',
    hue: 'lilac',
  },
  {
    id: 'potassium',
    title: 'Potassium-rich snacks',
    why: 'Bananas, potatoes, beans, dried apricots. Often suggested for bloating, though the evidence for it specifically is thin.',
    strength: 'limited',
    sources: ['clevelandDysmenorrhea'],
    forSymptoms: ['bloating'],
    icon: 'leaf',
    hue: 'sage',
  },
  {
    id: 'ginger',
    title: 'Ginger, in food or tea',
    why: 'Long used for nausea and reasonably well tolerated. Grate it into food or steep it in hot water.',
    strength: 'limited',
    sources: ['cochraneSupplements'],
    forSymptoms: ['nausea', 'cramps'],
    icon: 'flame',
    hue: 'gold',
  },
  {
    id: 'eatWhatYouWant',
    title: 'Eat what actually appeals',
    why: 'Cravings during a period are extremely common and not a failure of anything. Eating something you want is better than eating nothing because it was not on a list.',
    strength: 'moderate',
    sources: ['clevelandDysmenorrhea'],
    forSymptoms: ['cravings'],
    icon: 'heart',
    hue: 'blossom',
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Drink
// ───────────────────────────────────────────────────────────────────────────

export const DRINKS: CareItem[] = [
  {
    id: 'water',
    title: 'Water, steadily',
    why: 'Nothing dramatic — just easier than catching up later. Keeping a glass within reach does most of the work.',
    strength: 'moderate',
    sources: ['clevelandDysmenorrhea'],
    icon: 'water',
    hue: 'sky',
  },
  {
    id: 'warmWater',
    title: 'Warm water or warm lemon water',
    why: 'Warm drinks are settling, and the warmth itself is part of why. If you like it, it counts.',
    strength: 'limited',
    sources: ['heatMetaAnalysis'],
    forSymptoms: ['cramps', 'nausea'],
    icon: 'flame',
    hue: 'gold',
  },
  {
    id: 'gingerTea',
    title: 'Ginger tea',
    why: 'Warm, and ginger has a long history of use for nausea. Fresh slices in hot water work as well as a bag.',
    strength: 'limited',
    sources: ['cochraneSupplements'],
    forSymptoms: ['nausea', 'cramps'],
    icon: 'flame',
    hue: 'peach',
  },
  {
    id: 'peppermintTea',
    title: 'Peppermint tea',
    why: 'Often used for bloating and a full, uncomfortable stomach. Caffeine-free, so it works late.',
    strength: 'limited',
    sources: ['cochraneSupplements'],
    forSymptoms: ['bloating', 'digestive', 'nausea'],
    icon: 'leaf',
    hue: 'sage',
  },
  {
    id: 'chamomile',
    title: 'Chamomile before bed',
    why: 'Warm, caffeine-free, and a small ritual before sleep is often worth more than the drink itself.',
    strength: 'limited',
    sources: ['cochraneSupplements'],
    forSymptoms: ['fatigue'],
    icon: 'moon',
    hue: 'lavender',
  },
  {
    id: 'caffeineOption',
    title: 'Maybe one coffee fewer',
    why: 'Cleveland Clinic mentions cutting back on caffeine for cramps. Worth a try if you drink a lot of it — and completely fine to ignore if coffee is what is holding today together.',
    strength: 'limited',
    sources: ['clevelandDysmenorrhea'],
    forSymptoms: ['cramps'],
    icon: 'clock',
    hue: 'coral',
  },
  {
    id: 'ironTiming',
    title: 'Tea and coffee between meals, not with them',
    why: 'Tannins in tea and coffee reduce how much iron you absorb from a meal. Leaving an hour either side is an easy change that matters more on heavy days.',
    strength: 'good',
    sources: ['nhsIronAnaemia'],
    forSymptoms: ['fatigue'],
    icon: 'clock',
    hue: 'sage',
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Care for yourself
// ───────────────────────────────────────────────────────────────────────────

export const SELF_CARE: CareItem[] = [
  {
    id: 'heat',
    title: 'Heat on your lower belly or back',
    why: 'A heating pad, hot water bottle or warm bath. This is one of the best-supported things on the list — a recent review found heat comparable to over-the-counter painkillers for period pain, with fewer side effects.',
    strength: 'good',
    sources: ['heatMetaAnalysis', 'acogDysmenorrhea', 'nhsPeriodPain', 'clevelandDysmenorrhea'],
    forSymptoms: ['cramps', 'backPain'],
    icon: 'flame',
    hue: 'coral',
  },
  {
    id: 'warmBath',
    title: 'A warm bath or shower',
    why: 'Named by both ACOG and the NHS among the things that help period pain. Heat plus twenty minutes where nobody can ask you anything.',
    strength: 'good',
    sources: ['acogDysmenorrhea', 'nhsPeriodPain'],
    forSymptoms: ['cramps', 'backPain', 'fatigue'],
    icon: 'water',
    hue: 'sky',
  },
  {
    id: 'massage',
    title: 'Massage your lower belly or back',
    why: 'The NHS and Cleveland Clinic both list this. Slow circles with a warm hand, no technique required.',
    strength: 'moderate',
    sources: ['nhsPeriodPain', 'clevelandDysmenorrhea'],
    forSymptoms: ['cramps', 'backPain'],
    icon: 'hand',
    hue: 'blossom',
  },
  {
    id: 'earlyNight',
    title: 'An earlier night than usual',
    why: 'Cleveland Clinic specifically suggests extra rest during your period. Half an hour earlier is a real difference.',
    strength: 'moderate',
    sources: ['clevelandDysmenorrhea'],
    forSymptoms: ['fatigue'],
    icon: 'moon',
    hue: 'lavender',
  },
  {
    id: 'meditation',
    title: 'A few quiet minutes',
    why: 'ACOG lists meditation and yoga among the things that help people cope with period pain. It does not have to be formal — sitting still counts.',
    strength: 'moderate',
    sources: ['acogDysmenorrhea'],
    icon: 'breathe',
    hue: 'lilac',
  },
  {
    id: 'journal',
    title: 'Write down what today was like',
    why: 'Two lines is enough. Over a few cycles it turns "I always feel awful" into something with a shape you can show a doctor.',
    strength: 'limited',
    sources: ['clevelandDysmenorrhea'],
    icon: 'book',
    hue: 'peach',
  },
  {
    id: 'outside',
    title: 'Ten minutes outside',
    why: 'Daylight and a change of scene, without it needing to be exercise.',
    strength: 'moderate',
    sources: ['acogDysmenorrhea'],
    icon: 'sun',
    hue: 'gold',
  },
  {
    id: 'music',
    title: 'Something calm to listen to',
    why: 'A small, easy way to change how a bad afternoon feels. No effort required from you.',
    strength: 'limited',
    sources: ['clevelandDysmenorrhea'],
    icon: 'sound',
    hue: 'lavender',
  },
  {
    id: 'sayNo',
    title: 'Take one thing off today',
    why: 'Pick the least important thing on your list and move it to tomorrow. That is a legitimate use of a bad day, not a failure of one.',
    strength: 'limited',
    sources: ['clevelandDysmenorrhea'],
    icon: 'check',
    hue: 'rose',
  },
  {
    id: 'painkillers',
    title: 'Painkillers are a reasonable option',
    why: 'Over-the-counter anti-inflammatories like ibuprofen are effective for period pain for most people. Follow the packet, take them with food, and check with a pharmacist if you have asthma or stomach problems.',
    strength: 'good',
    sources: ['acogDysmenorrhea', 'nhsPeriodPain'],
    forSymptoms: ['cramps', 'backPain', 'headache'],
    icon: 'info',
    hue: 'sky',
  },
];
