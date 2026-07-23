import { Exercise, Keyframe, Pose } from './types';
import { POSES } from './poses';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE EXERCISE LIBRARY — 30 movements, entirely offline.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── What the evidence actually supports ───────────────────────────────────
 *
 * The Cochrane review on exercise for dysmenorrhoea found it "may provide a
 * large reduction in the intensity of period pain" — around 25mm on a 100mm
 * scale, more than twice the minimum clinically noticeable difference — from
 * sessions of roughly 45–60 minutes, at least three times weekly. It also
 * rated the overall quality of evidence as **low to very low**, and noted that
 * several trials deliberately *excluded* exercise during menstruation itself.
 *
 * Two honest consequences, both encoded below:
 *
 * 1. **Nothing here claims to treat period pain.** The `benefits` strings say
 *    what a movement does — opens the hips, releases the lower back, slows the
 *    breath — not what it cures. Where a benefit leans on the pain evidence at
 *    all, it is hedged and cited.
 * 2. **These are short and gentle by design.** A 45-minute thrice-weekly
 *    programme is what the trials studied, and it is not what someone on day
 *    two with severe cramps is going to do. So the library is built for the
 *    *actual* moment: 30 seconds to 5 minutes, restful or gentle, most of it
 *    doable in bed. The regular-exercise finding belongs in a different
 *    feature, on a different day.
 *
 * ACOG and the NHS both list gentle movement — walking, yoga, swimming,
 * stretching — among self-care measures for period pain, which is the level of
 * claim this library sits at.
 *
 * ── Every entry carries an `avoidIf` ──────────────────────────────────────
 *
 * An empty `avoidIf` is treated as a bug by the test suite. Every movement has
 * *some* circumstance where it is the wrong idea, and a wellness library that
 * cannot name one has not thought about it. Prone back-bends after eating,
 * inversions with a migraine, deep twists on a heavy-flow day — the engine
 * reads these and filters, so the list is functional rather than decorative.
 */

/** Keyframe shorthand. */
const F = (pose: Pose, ms: number, breath: Keyframe['breath'], cue?: string): Keyframe => ({
  pose,
  ms,
  breath,
  cue,
});

/**
 * A still hold that still breathes.
 *
 * Child's pose is not a still image — the ribcage moves. Two near-identical
 * keyframes with a tiny chest offset give a resting pose visible life for the
 * cost of one extra frame, and it is what makes a "rest" card feel restful
 * rather than broken.
 */
function breathe(pose: Pose, inMs = 3600, outMs = 4600, lift = 1.6): Keyframe[] {
  const lifted: Pose = {
    ...pose,
    chest: [pose.chest[0], pose.chest[1] - lift],
    neck: [pose.neck[0], pose.neck[1] - lift * 0.6],
  };
  return [F(lifted, inMs, 'in', 'Breathe in'), F(pose, outMs, 'out', 'Breathe out')];
}

export const EXERCISES: Exercise[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Restful — for the worst days. Most of these work in bed.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'childs-pose',
    title: "Child's Pose",
    description: 'Knees wide, hips back to the heels, forehead resting down.',
    difficulty: 'restful',
    seconds: 90,
    helps: ['cramps', 'backPain', 'fatigue', 'bloating'],
    benefits: [
      'Lets the lower back lengthen without any effort from you',
      'A forward fold over the belly is warm and contained, which many people find settling',
      'Resting the forehead down tends to slow the breath on its own',
    ],
    avoidIf: ['You are pregnant and it presses uncomfortably', 'Knee pain that gets worse kneeling'],
    equipment: ['A cushion under the hips or forehead, if that is comfier'],
    steps: [
      'Kneel and bring your big toes together, knees as wide as feels good.',
      'Sit your hips back toward your heels.',
      'Walk your hands forward and let your forehead come down.',
      'Stay for as long as it feels kind. Nothing here needs effort.',
    ],
    breathing: 'Breathe into your back ribs — feel them widen behind you.',
    safety: 'Come out any time. If anything sharpens, this is not the pose for today.',
    sources: ['nhsPeriodPain', 'acogDysmenorrhea'],
    frames: breathe(POSES.childsPose, 4000, 5000, 2),
  },
  {
    id: 'savasana',
    title: 'Rest Position',
    description: 'Lying down, arms loose, doing nothing on purpose.',
    difficulty: 'restful',
    seconds: 180,
    helps: ['fatigue', 'cramps', 'headache'],
    benefits: [
      'Genuinely doing nothing is a legitimate use of five minutes',
      'Deliberate rest gives the nervous system a chance to settle',
    ],
    avoidIf: ['Lying flat makes you feel sick — try propped on your side instead'],
    equipment: ['A pillow under the knees takes pressure off the low back'],
    steps: [
      'Lie on your back with your legs a little apart.',
      'Let your arms rest away from your sides, palms up.',
      'Let your whole weight go into the floor or bed.',
      'You do not have to clear your mind. Just stay.',
    ],
    breathing: 'Let the breath be whatever it already is. No changing it.',
    safety: 'If lying flat is uncomfortable, curl onto your side — that counts.',
    sources: ['clevelandDysmenorrhea'],
    frames: breathe(POSES.savasana, 4200, 5400, 1.2),
  },
  {
    id: 'legs-up',
    title: 'Legs Up the Wall',
    description: 'Lie down, rest your legs up against a wall or headboard.',
    difficulty: 'restful',
    seconds: 180,
    helps: ['fatigue', 'backPain', 'bloating'],
    benefits: [
      'Takes all the weight out of tired, heavy legs',
      'A very low-effort way to lie still that most people find easy to stay in',
    ],
    avoidIf: ['Glaucoma or uncontrolled high blood pressure', 'It makes your head throb'],
    equipment: ['A wall, a sofa, or a headboard'],
    steps: [
      'Sit sideways next to a wall, one hip close to it.',
      'Lie back as you swing your legs up.',
      'Shuffle your hips as close as is comfortable — it does not need to be touching.',
      'Rest your arms wherever they land.',
    ],
    breathing: 'Long, slow out-breaths. Let each one be a little longer than the one before.',
    safety: 'Come down slowly, rolling to one side first.',
    sources: ['clevelandDysmenorrhea'],
    frames: breathe(POSES.legsUpWall, 4000, 5200, 1.4),
  },
  {
    id: 'knees-to-chest',
    title: 'Knees to Chest',
    description: 'On your back, knees hugged gently in.',
    difficulty: 'restful',
    seconds: 60,
    helps: ['cramps', 'backPain', 'bloating', 'digestive'],
    benefits: [
      'Gently rounds the lower back, which often feels like relief when it is aching',
      'Light pressure across the lower belly is comforting for a lot of people',
    ],
    avoidIf: ['Recent abdominal surgery', 'Pregnancy past the first trimester'],
    equipment: [],
    steps: [
      'Lie on your back and bend both knees.',
      'Draw them toward your chest and hold behind the thighs.',
      'Let your shoulders stay heavy on the floor.',
      'Rock a little side to side if that feels nice.',
    ],
    breathing: 'Breathe out as you draw the knees in, in as you let them ease away.',
    safety: 'Hold behind the thighs, not over the knee caps.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.supineKneesBent, 2600, 'in', 'Breathe in'),
      F(POSES.kneesToChest, 2800, 'out', 'Draw the knees in'),
      F(POSES.kneesToChest, 2200, 'hold', 'Rest here'),
    ],
  },
  {
    id: 'supine-twist',
    title: 'Supine Twist',
    description: 'On your back, knees dropping to one side.',
    difficulty: 'restful',
    seconds: 90,
    helps: ['backPain', 'bloating', 'digestive', 'cramps'],
    benefits: [
      'A slow twist along the spine, with the floor taking all your weight',
      'Often eases the band of tightness that sits across the low back',
    ],
    avoidIf: ['Disc problems, unless a clinician has cleared twists for you', 'Pregnancy'],
    equipment: ['A cushion between the knees if there is any pull'],
    steps: [
      'Lie on your back with your knees bent.',
      'Let both knees drop slowly to one side.',
      'Turn your head the other way if your neck likes that.',
      'Stay, then come back through the middle and change sides.',
    ],
    breathing: 'Breathe out as the knees drop. Let each out-breath soften the twist a little more.',
    safety: 'This should feel like a stretch, never a pinch. Back off if it does.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.supineKneesBent, 2800, 'in', 'Breathe in'),
      F(POSES.supineTwist, 3400, 'out', 'Let the knees fall'),
      F(POSES.supineTwist, 2600, 'hold', 'Soften'),
    ],
  },
  {
    id: 'happy-baby',
    title: 'Happy Baby',
    description: 'On your back, holding the outsides of your feet.',
    difficulty: 'restful',
    seconds: 60,
    helps: ['cramps', 'backPain'],
    benefits: [
      'Opens the hips and inner thighs while fully supported',
      'The low back stays broad against the floor throughout',
    ],
    avoidIf: ['Neck problems', 'Pregnancy past the first trimester', 'Knee pain'],
    equipment: ['A strap or scarf around each foot if you cannot reach'],
    steps: [
      'Lie on your back and draw your knees toward your armpits.',
      'Hold the outside edges of your feet, or your shins.',
      'Let your tailbone stay heavy.',
      'Rock gently side to side.',
    ],
    breathing: 'Slow and easy. Let the belly rise as you breathe in.',
    safety: 'Keep your head and shoulders on the floor.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.supineKneesBent, 2600, 'in', 'Breathe in'),
      F(POSES.happyBaby, 3000, 'out', 'Take hold of the feet'),
      F(POSES.happyBaby, 2400, 'hold', 'Rock gently'),
    ],
  },
  {
    id: 'figure-four',
    title: 'Figure Four Stretch',
    description: 'On your back, one ankle crossed over the opposite thigh.',
    difficulty: 'restful',
    seconds: 90,
    helps: ['backPain', 'cramps'],
    benefits: [
      'Reaches the outer hip and glute, which often tighten when the low back aches',
      'Done lying down, so nothing is holding you up',
    ],
    avoidIf: ['Hip replacement, unless cleared', 'Sharp groin or knee pain'],
    equipment: [],
    steps: [
      'Lie on your back with both knees bent.',
      'Cross your right ankle over your left thigh.',
      'Thread your hands behind the left thigh and draw it toward you.',
      'Change sides after a minute or so.',
    ],
    breathing: 'Breathe into wherever you feel the stretch.',
    safety: 'Keep the crossed foot flexed to look after the knee.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.supineKneesBent, 2600, 'in', 'Breathe in'),
      F(POSES.figureFour, 3200, 'out', 'Cross and draw in'),
      F(POSES.figureFour, 2600, 'hold', 'Breathe here'),
    ],
  },
  {
    id: 'belly-breathing',
    title: 'Belly Breathing',
    description: 'One hand on the belly, letting the breath drop lower.',
    difficulty: 'restful',
    seconds: 120,
    helps: ['cramps', 'headache', 'fatigue', 'nausea'],
    benefits: [
      'Slow breathing is one of the few things you can do anywhere, in any state',
      'Relaxation and breathing exercises are listed among self-care measures for period cramps',
    ],
    avoidIf: ['Deliberate breath control makes you anxious — try the walk instead'],
    equipment: [],
    steps: [
      'Lie down or sit however you are comfortable.',
      'Put one hand on your belly, one on your chest.',
      'Breathe in through the nose and let the lower hand rise first.',
      'Breathe out slowly through the mouth. Longer out than in.',
    ],
    breathing: 'In for four, out for six. If that is a strain, just make the out-breath longer.',
    safety: 'Never force a breath. Light-headedness means come back to normal breathing.',
    sources: ['clevelandDysmenorrhea', 'acogDysmenorrhea'],
    frames: [
      F(POSES.supine, 4000, 'in', 'In for four'),
      F(POSES.savasana, 6000, 'out', 'Out for six'),
    ],
  },
  {
    id: 'box-breathing',
    title: 'Square Breathing',
    description: 'Equal counts in, hold, out, hold.',
    difficulty: 'restful',
    seconds: 120,
    helps: ['headache', 'fatigue'],
    benefits: [
      'Gives an anxious mind something simple and countable to hold on to',
      'Works sitting up, at a desk, with nobody noticing',
    ],
    avoidIf: ['Breath-holding is uncomfortable — use belly breathing instead'],
    equipment: [],
    steps: [
      'Sit comfortably, spine easy rather than straight.',
      'Breathe in for four.',
      'Hold for four.',
      'Out for four, hold for four. Repeat.',
    ],
    breathing: 'Four counts each side of the square. Shorten to three if four feels long.',
    safety: 'Stop if you feel dizzy. This should feel calming, never effortful.',
    sources: ['clevelandDysmenorrhea'],
    frames: [
      F(POSES.seated, 3400, 'in', 'In, two, three, four'),
      F(POSES.seated, 3400, 'hold', 'Hold'),
      F(POSES.chestOpen, 3400, 'out', 'Out, two, three, four'),
      F(POSES.chestOpen, 3400, 'hold', 'Hold'),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Gentle — small movement, low commitment.
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'cat-cow',
    title: 'Cat–Cow',
    description: 'On hands and knees, moving the spine with the breath.',
    difficulty: 'gentle',
    seconds: 90,
    helps: ['backPain', 'cramps', 'bloating'],
    benefits: [
      'Moves the whole spine through its range without loading it',
      'Ties movement to breath, which is what makes it settling as well as loosening',
    ],
    avoidIf: ['Wrist pain — come onto forearms instead', 'Knee pain that kneeling worsens'],
    equipment: ['Something soft under the knees'],
    steps: [
      'Come onto hands and knees, wrists under shoulders.',
      'Breathe in and let your belly soften toward the floor, chest opening.',
      'Breathe out and round your spine, tucking your tailbone.',
      'Keep moving with your own breath, slowly.',
    ],
    breathing: 'In as you open, out as you round. Let the breath lead the movement.',
    safety: 'Small range is fine. This is about moving, not about how far.',
    sources: ['nhsPeriodPain', 'acogDysmenorrhea'],
    frames: [
      F(POSES.cow, 3200, 'in', 'Open the chest'),
      F(POSES.cat, 3600, 'out', 'Round the spine'),
    ],
  },
  {
    id: 'pelvic-tilt',
    title: 'Pelvic Tilts',
    description: 'On your back, rocking the pelvis in a small arc.',
    difficulty: 'gentle',
    seconds: 60,
    helps: ['backPain', 'cramps'],
    benefits: [
      'A very small movement that reaches the low back without any effort',
      'Can be done in bed, half asleep, which is often when it is wanted',
    ],
    avoidIf: ['Any sharp low-back pain — stop and check with a clinician'],
    equipment: [],
    steps: [
      'Lie on your back with your knees bent, feet flat.',
      'Breathe out and gently press your low back toward the floor.',
      'Breathe in and let it arch softly away again.',
      'Keep the movement small and slow.',
    ],
    breathing: 'Out as you flatten, in as you release.',
    safety: 'If you feel a pinch in the low back, make the movement smaller.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.supineKneesBent, 2800, 'in', 'Soften'),
      F(POSES.pelvicTilt, 3000, 'out', 'Press the low back down'),
    ],
  },
  {
    id: 'bridge',
    title: 'Bridge',
    description: 'On your back, lifting the hips a little way.',
    difficulty: 'gentle',
    seconds: 60,
    helps: ['backPain', 'fatigue'],
    benefits: [
      'Wakes up the back of the body without standing up',
      'Opens the front of the hips, which shorten from sitting or curling up',
    ],
    avoidIf: ['Neck problems', 'Any pain in the low back on lifting'],
    equipment: [],
    steps: [
      'Lie on your back, knees bent, feet hip width.',
      'Press through your feet and lift your hips a comfortable amount.',
      'Pause, then lower slowly, one vertebra at a time.',
      'Repeat a few times.',
    ],
    breathing: 'In to lift, out to lower.',
    safety: 'Keep your head and neck still. Do not turn while your hips are up.',
    sources: ['nhsPeriodPain', 'cochraneExercise'],
    frames: [
      F(POSES.supineKneesBent, 2600, 'in', 'Ready'),
      F(POSES.bridge, 2800, 'in', 'Lift'),
      F(POSES.supineKneesBent, 3200, 'out', 'Lower slowly'),
    ],
  },
  {
    id: 'butterfly',
    title: 'Butterfly Stretch',
    description: 'Sitting, soles of the feet together, knees falling open.',
    difficulty: 'gentle',
    seconds: 90,
    helps: ['cramps', 'backPain'],
    benefits: [
      'Opens the inner thighs and the front of the hips',
      'Sitting upright is easier than lying down when you feel bloated',
    ],
    avoidIf: ['Groin strain', 'Knee pain when the knees open'],
    equipment: ['Sit on a cushion so the hips are above the knees'],
    steps: [
      'Sit with the soles of your feet together.',
      'Let your knees fall out to the sides. Do not push them.',
      'Hold your feet or ankles.',
      'Sit tall, then fold forward a little if that feels good.',
    ],
    breathing: 'Breathe into the hips. Let each out-breath let the knees go a little heavier.',
    safety: 'Never press the knees down with your hands.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.butterfly, 3200, 'in', 'Sit tall'),
      F(POSES.butterflyFold, 3600, 'out', 'Fold a little'),
      F(POSES.butterfly, 3000, 'in', 'Rise back up'),
    ],
  },
  {
    id: 'seated-fold',
    title: 'Seated Forward Fold',
    description: 'Sitting with legs long, folding gently forward.',
    difficulty: 'gentle',
    seconds: 90,
    helps: ['backPain', 'fatigue', 'cramps'],
    benefits: [
      'Lengthens the whole back of the body from heels to head',
      'A quiet, inward-facing shape that many people find calming',
    ],
    avoidIf: ['Sciatica or disc problems', 'Any sharp pull behind the knees'],
    equipment: ['A strap or towel around the feet'],
    steps: [
      'Sit with your legs out in front, knees softly bent.',
      'Lengthen up through the spine first.',
      'Hinge from the hips and fold as far as is comfortable.',
      'Let your head hang. There is no target.',
    ],
    breathing: 'In to lengthen, out to fold a little further.',
    safety: 'Bend the knees as much as you need. Rounding the low back hard is not the goal.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.seated, 3200, 'in', 'Lengthen'),
      F(POSES.seatedFold, 3800, 'out', 'Fold'),
      F(POSES.seatedFold, 2600, 'hold', 'Rest here'),
    ],
  },
  {
    id: 'seated-side',
    title: 'Seated Side Stretch',
    description: 'Sitting, one arm reaching up and over.',
    difficulty: 'gentle',
    seconds: 60,
    helps: ['backPain', 'bloating'],
    benefits: [
      'Opens the side ribs, which lets the breath in more easily',
      'Reaches the band of muscle along the side of the waist',
    ],
    avoidIf: ['Shoulder injury on the reaching side'],
    equipment: [],
    steps: [
      'Sit cross-legged or on a chair.',
      'Reach your right arm up and over to the left.',
      'Let your left hand rest on the floor or your thigh.',
      'Change sides.',
    ],
    breathing: 'Breathe into the side you are opening. You should feel the ribs move.',
    safety: 'Keep both sitting bones down. Do not collapse into the bottom side.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.seated, 2800, 'in', 'Reach up'),
      F(POSES.seatedSide, 3400, 'out', 'And over'),
      F(POSES.seated, 2800, 'in', 'Back to centre'),
    ],
  },
  {
    id: 'seated-twist',
    title: 'Seated Twist',
    description: 'Sitting, turning gently from the waist.',
    difficulty: 'gentle',
    seconds: 60,
    helps: ['backPain', 'bloating', 'digestive'],
    benefits: [
      'Moves the mid-back, which stiffens fast when you are curled up',
      'Gentle rotation is often a relief when the belly feels full',
    ],
    avoidIf: ['Disc problems unless cleared', 'Pregnancy'],
    equipment: [],
    steps: [
      'Sit tall, cross-legged or on a chair.',
      'Breathe in and lengthen upward.',
      'Breathe out and turn to the right, hand behind you.',
      'Come back through centre and change sides.',
    ],
    breathing: 'In to grow taller, out to turn. Never turn further on an in-breath.',
    safety: 'Turn from the ribs, not by pulling on your knee.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.seated, 2800, 'in', 'Lengthen'),
      F(POSES.seatedTwist, 3200, 'out', 'Turn'),
      F(POSES.seated, 2800, 'in', 'Centre'),
    ],
  },
  {
    id: 'neck-stretch',
    title: 'Neck Release',
    description: 'Sitting, letting the head tip slowly to one side.',
    difficulty: 'gentle',
    seconds: 60,
    helps: ['headache', 'fatigue'],
    benefits: [
      'Releases the muscles that run from the neck into the shoulders',
      'Can be done anywhere, including at a desk',
    ],
    avoidIf: ['Any neck injury', 'Dizziness on moving the head'],
    equipment: [],
    steps: [
      'Sit tall and let your shoulders drop.',
      'Tip your right ear toward your right shoulder. Do not lift the shoulder.',
      'Stay for a few breaths.',
      'Come back to centre and change sides.',
    ],
    breathing: 'Slow breaths. Let the shoulder drop a little on each out-breath.',
    safety: 'Never roll the head backward in a circle.',
    sources: ['clevelandDysmenorrhea'],
    frames: [
      F(POSES.seated, 2600, 'in', 'Sit tall'),
      F(POSES.neckTilt, 3200, 'out', 'Ear toward shoulder'),
      F(POSES.seated, 2600, 'in', 'Centre'),
      F(POSES.neckTurn, 3200, 'out', 'And turn to look'),
    ],
  },
  {
    id: 'shoulder-rolls',
    title: 'Shoulder Rolls',
    description: 'Rolling the shoulders slowly backward.',
    difficulty: 'gentle',
    seconds: 45,
    helps: ['headache', 'fatigue'],
    benefits: [
      'Unsticks shoulders that have crept up toward the ears',
      'Thirty seconds, fully clothed, sitting down — the lowest bar there is',
    ],
    avoidIf: ['Shoulder injury'],
    equipment: [],
    steps: [
      'Sit or stand comfortably.',
      'Lift both shoulders up toward your ears.',
      'Roll them back and let them drop.',
      'Repeat slowly, five or six times.',
    ],
    breathing: 'In as they lift, out as they drop.',
    safety: 'Keep it slow. Speed makes this a shrug rather than a stretch.',
    sources: ['clevelandDysmenorrhea'],
    frames: [
      F(POSES.shouldersUp, 2200, 'in', 'Up'),
      F(POSES.chestOpen, 2600, 'out', 'Back and down'),
      F(POSES.seated, 2400, 'hold', 'Rest'),
    ],
  },
  {
    id: 'chest-opener',
    title: 'Chest Opener',
    description: 'Hands clasped behind, drawing the shoulders back.',
    difficulty: 'gentle',
    seconds: 45,
    helps: ['headache', 'fatigue'],
    benefits: [
      'Counters the closed-in shape that pain tends to put you in',
      'Opening the chest makes the breath easier almost immediately',
    ],
    avoidIf: ['Shoulder injury'],
    equipment: ['A towel between the hands if they do not meet'],
    steps: [
      'Sit or stand tall.',
      'Clasp your hands behind your back, or hold a towel.',
      'Draw your shoulder blades toward each other.',
      'Lift the chest without arching the low back.',
    ],
    breathing: 'Big, slow breaths into the front of the chest.',
    safety: 'Stop short of any pinching at the front of the shoulder.',
    sources: ['clevelandDysmenorrhea'],
    frames: [
      F(POSES.seated, 2600, 'in', 'Lift the chest'),
      F(POSES.chestOpen, 3400, 'out', 'Draw the shoulders back'),
    ],
  },
  {
    id: 'hip-circles',
    title: 'Hip Circles',
    description: 'Standing, drawing slow circles with the hips.',
    difficulty: 'gentle',
    seconds: 60,
    helps: ['cramps', 'backPain', 'bloating'],
    benefits: [
      'Moves the pelvis in every direction rather than one plane',
      'Standing and swaying is often the position people find themselves in anyway',
    ],
    avoidIf: ['Dizziness', 'Any sharp hip pain'],
    equipment: ['A wall or chair to steady yourself'],
    steps: [
      'Stand with your feet hip width, knees soft.',
      'Rest your hands on your hips.',
      'Draw a slow circle with your hips, as if stirring.',
      'Five or six one way, then change direction.',
    ],
    breathing: 'Let the breath be easy and unhurried. Do not hold it.',
    safety: 'Keep the knees soft, never locked.',
    sources: ['nhsPeriodPain', 'acogDysmenorrhea'],
    frames: [
      F(POSES.hipCircleA, 2400, 'in', 'Circle one way'),
      F(POSES.standing, 2400, 'hold'),
      F(POSES.hipCircleB, 2400, 'out', 'And the other'),
      F(POSES.standing, 2400, 'hold'),
    ],
  },
  {
    id: 'standing-fold',
    title: 'Standing Forward Fold',
    description: 'Standing, hinging forward with soft knees.',
    difficulty: 'gentle',
    seconds: 60,
    helps: ['backPain', 'headache', 'fatigue'],
    benefits: [
      'Lets the whole spine hang, which the low back often likes',
      'Letting the head drop below the heart is quieting for a lot of people',
    ],
    avoidIf: ['Migraine or a throbbing headache', 'Dizziness', 'High blood pressure', 'Glaucoma'],
    equipment: ['A chair to rest your hands on'],
    steps: [
      'Stand with your feet hip width and bend your knees generously.',
      'Fold forward from the hips.',
      'Let your head and arms hang, or rest your hands on a chair.',
      'Come up slowly, rolling through the spine.',
    ],
    breathing: 'Long out-breaths while you hang.',
    safety: 'Come up slowly. Standing straight up fast is how you get dizzy.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.standing, 2600, 'in', 'Stand tall'),
      F(POSES.forwardFold, 3400, 'out', 'Fold'),
      F(POSES.forwardFold, 2600, 'hold', 'Hang'),
    ],
  },
  {
    id: 'standing-side',
    title: 'Standing Side Stretch',
    description: 'Reaching one arm up and over.',
    difficulty: 'gentle',
    seconds: 45,
    helps: ['bloating', 'backPain'],
    benefits: [
      'Creates space along the side of the body, which can help when you feel full',
      'Quick enough to do while the kettle boils',
    ],
    avoidIf: ['Dizziness', 'Shoulder injury'],
    equipment: [],
    steps: [
      'Stand with your feet hip width.',
      'Reach your right arm overhead and lean gently to the left.',
      'Keep both feet evenly weighted.',
      'Change sides.',
    ],
    breathing: 'Breathe into the long side.',
    safety: 'Lean sideways, not forward or back.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.standingArmsUp, 2600, 'in', 'Reach up'),
      F(POSES.standingSide, 3200, 'out', 'Lean over'),
      F(POSES.standingArmsUp, 2600, 'in', 'Back up'),
    ],
  },
  {
    id: 'gentle-walk',
    title: 'A Short Walk',
    description: 'Five to ten minutes, at whatever pace suits.',
    difficulty: 'gentle',
    seconds: 300,
    helps: ['fatigue', 'cramps', 'bloating', 'digestive'],
    benefits: [
      'Walking is named by both ACOG and the NHS among the gentle activities that help period pain',
      'Being outside for ten minutes does something a stretch on the floor does not',
    ],
    avoidIf: ['You feel faint or unusually breathless — rest instead and see the note above'],
    equipment: ['Shoes'],
    steps: [
      'Go outside if you can. A corridor counts if you cannot.',
      'Walk at a pace where you could still hold a conversation.',
      'Turn around whenever you like. There is no distance to hit.',
    ],
    breathing: 'Nothing to manage — just notice it is easier by the end than the start.',
    safety: 'Stop and sit down if you feel light-headed.',
    sources: ['acogDysmenorrhea', 'nhsPeriodPain', 'cochraneExercise'],
    frames: [
      F(POSES.walkA, 900, 'in'),
      F(POSES.standing, 700, 'hold'),
      F(POSES.walkB, 900, 'out'),
      F(POSES.standing, 700, 'hold'),
    ],
  },
  {
    id: 'low-lunge',
    title: 'Low Lunge',
    description: 'One knee down, hips sinking gently forward.',
    difficulty: 'gentle',
    seconds: 90,
    helps: ['backPain', 'cramps'],
    benefits: [
      'Opens the front of the hip, which tightens from sitting and from curling up in pain',
      'Tight hip flexors often show up as a nagging low back',
    ],
    avoidIf: ['Knee pain kneeling', 'Balance problems without support'],
    equipment: ['A cushion under the back knee'],
    steps: [
      'From kneeling, step your right foot forward.',
      'Let your hips sink gently forward and down.',
      'Rest your hands on your front thigh or the floor.',
      'Change sides.',
    ],
    breathing: 'Breathe out as you sink. Let gravity do it rather than pushing.',
    safety: 'Front knee stays over the ankle, never past the toes.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.kneeling, 2800, 'in', 'Kneeling'),
      F(POSES.lowLunge, 3400, 'out', 'Sink forward'),
      F(POSES.lowLunge, 2800, 'hold', 'Breathe'),
    ],
  },
  {
    id: 'thread-needle',
    title: 'Thread the Needle',
    description: 'From all fours, one arm threading under the other.',
    difficulty: 'gentle',
    seconds: 90,
    helps: ['backPain', 'headache'],
    benefits: [
      'Reaches the upper back and between the shoulder blades',
      'A supported twist with the head resting down, so the neck can let go',
    ],
    avoidIf: ['Shoulder or neck injury'],
    equipment: ['Something soft under the knees and shoulder'],
    steps: [
      'Come onto hands and knees.',
      'Slide your right arm under your body, palm up.',
      'Let your right shoulder and temple rest down.',
      'Stay a few breaths, then change sides.',
    ],
    breathing: 'Slow. Let each out-breath let the shoulder sink a little more.',
    safety: 'Only as far as is comfortable for the shoulder. Never force the twist.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.tableTop, 2800, 'in', 'All fours'),
      F(POSES.thread, 3400, 'out', 'Thread through'),
      F(POSES.thread, 2800, 'hold', 'Rest the head'),
    ],
  },
  {
    id: 'sphinx',
    title: 'Sphinx',
    description: 'Lying on the front, propped on the forearms.',
    difficulty: 'gentle',
    seconds: 60,
    helps: ['backPain', 'fatigue'],
    benefits: [
      'A very small back-bend, fully supported by the forearms',
      'Opens the front of the body without asking anything of the arms',
    ],
    avoidIf: ['Lying on the belly is uncomfortable', 'Pregnancy', 'Low back pain that back-bends worsen'],
    equipment: [],
    steps: [
      'Lie on your front with your legs long.',
      'Bring your elbows under your shoulders, forearms down.',
      'Lift the chest a little and lengthen the back of the neck.',
      'Keep the hips heavy.',
    ],
    breathing: 'Breathe into the chest. Keep the belly soft against the floor.',
    safety: 'If there is any pinching in the low back, come down.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.prone, 2800, 'out', 'Rest down'),
      F(POSES.sphinx, 3200, 'in', 'Lift the chest'),
      F(POSES.sphinx, 2600, 'hold', 'Breathe here'),
    ],
  },
  {
    id: 'cobra',
    title: 'Cobra',
    description: 'Lying on the front, chest lifting on the hands.',
    difficulty: 'moderate',
    seconds: 45,
    helps: ['backPain', 'fatigue'],
    benefits: [
      'A slightly bigger opening across the front of the body than sphinx',
      'Often eases the stiffness that comes from a day spent curled up',
    ],
    avoidIf: [
      'Pregnancy',
      'Low back pain that back-bends make worse',
      'Wrist pain',
      'Straight after eating',
    ],
    equipment: [],
    steps: [
      'Lie on your front, hands under your shoulders.',
      'Press lightly into your hands and lift your chest.',
      'Keep your elbows bent and close to your ribs.',
      'Lower slowly.',
    ],
    breathing: 'In as you rise, out as you lower.',
    safety: 'Only lift as far as your back is comfortable. This is not a competition with your arms.',
    sources: ['nhsPeriodPain'],
    frames: [
      F(POSES.prone, 2600, 'out', 'Rest'),
      F(POSES.cobra, 2800, 'in', 'Lift'),
      F(POSES.prone, 3000, 'out', 'Lower'),
    ],
  },
  {
    id: 'bird-dog',
    title: 'Bird Dog',
    description: 'From all fours, extending opposite arm and leg.',
    difficulty: 'moderate',
    seconds: 60,
    helps: ['backPain'],
    benefits: [
      'Asks the deep trunk muscles to work quietly while the spine stays still',
      'Builds steadiness through the middle without any crunching',
    ],
    avoidIf: [
      'Severe pain of any kind — this needs more from you than the restful options',
      'Wrist or knee pain',
    ],
    equipment: ['Something soft under the knees'],
    steps: [
      'Come onto hands and knees.',
      'Reach your right arm forward and your left leg back.',
      'Keep your hips level — imagine a glass of water on your low back.',
      'Lower with control and change sides.',
    ],
    breathing: 'Out as you extend, in as you return.',
    safety: 'Stop if your low back arches. Smaller is better than wobbly.',
    sources: ['cochraneExercise'],
    frames: [
      F(POSES.tableTop, 2600, 'in', 'All fours'),
      F(POSES.birdDog, 3000, 'out', 'Extend'),
      F(POSES.tableTop, 2600, 'in', 'And back'),
    ],
  },
  {
    id: 'pelvic-floor-release',
    title: 'Pelvic Floor Release',
    description: 'Lying down, softening rather than squeezing.',
    difficulty: 'restful',
    seconds: 120,
    helps: ['cramps', 'backPain'],
    benefits: [
      'Most pelvic floor advice is about tightening; this is the opposite, and it is often what is wanted during a period',
      'Pairs a slow breath with a deliberate letting-go',
    ],
    avoidIf: ['You have been given specific pelvic floor exercises — follow those instead'],
    equipment: ['A cushion under the knees'],
    steps: [
      'Lie on your back with your knees bent and supported.',
      'Breathe in and imagine the pelvic floor softening downward.',
      'Breathe out without gripping anything.',
      'Keep going gently for a couple of minutes.',
    ],
    breathing: 'The in-breath is where the softening happens. Do nothing on the out-breath.',
    safety: 'If you are under the care of a pelvic health physio, their plan comes first.',
    sources: ['clevelandDysmenorrhea'],
    frames: breathe(POSES.supineKneesBent, 4400, 5600, 1.4),
  },
  {
    id: 'restorative-hold',
    title: 'Supported Rest',
    description: "Child's pose over a stack of cushions.",
    difficulty: 'restful',
    seconds: 240,
    helps: ['cramps', 'fatigue', 'backPain', 'tenderBreasts'],
    benefits: [
      'Being propped means you can stay far longer than you could unsupported',
      'Long, still, warm shapes are what restorative practice is actually for',
    ],
    avoidIf: ['Kneeling is uncomfortable — do the side-lying version instead'],
    equipment: ['Two or three cushions, or a folded duvet'],
    steps: [
      'Stack cushions lengthways in front of you.',
      'Kneel with knees wide and let the cushions take your whole torso.',
      'Turn your head to one side.',
      'Stay for several minutes, turning your head halfway through.',
    ],
    breathing: 'Nothing to do. Just let the breath be slow.',
    safety: 'Use as many cushions as you need. Being high enough is the whole point.',
    sources: ['clevelandDysmenorrhea', 'nhsPeriodPain'],
    frames: breathe(POSES.childsPose, 5000, 6000, 1.6),
  },
  {
    id: 'side-lying-rest',
    title: 'Side-Lying Rest',
    description: 'Curled on your side with a cushion between the knees.',
    difficulty: 'restful',
    seconds: 240,
    helps: ['cramps', 'backPain', 'nausea', 'fatigue'],
    benefits: [
      'The position most people naturally take when cramps are bad — made comfier on purpose',
      'A cushion between the knees keeps the pelvis level and takes strain off the low back',
    ],
    // Even rest has a wrong moment. An empty avoidIf fails the test suite on
    // purpose: a library that cannot name one has not thought about it.
    avoidIf: ['You have been told to avoid lying on one particular side'],
    equipment: ['A cushion between the knees, one under the head'],
    steps: [
      'Lie on whichever side is comfier.',
      'Bend both knees and put a cushion between them.',
      'Bring a hand or a warm bottle to your lower belly.',
      'Stay as long as you like.',
    ],
    breathing: 'Slow and low. Let the belly move under your hand.',
    safety: 'None. This is rest.',
    sources: ['nhsPeriodPain', 'heatMetaAnalysis'],
    frames: breathe(POSES.kneesToChest, 4600, 5800, 1.2),
  },
];

/** Fast lookup by id. */
export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e])
);

export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_BY_ID[id];
}
