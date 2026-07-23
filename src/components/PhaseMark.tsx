import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Text from './Text';
import { useTheme } from '../theme/useTheme';
import { PHASE_GLYPH, PHASE_DEEP, PHASE_INK, COLORS, CYCLE_PHASES, PhaseGlyph } from '../constants';
import { SPACE } from '../theme/tokens';

type PhaseKey = keyof typeof CYCLE_PHASES;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE MARK — phase identity that survives colour blindness.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This component exists because of a measurement, not a preference.
 *
 * Bloomly's four phase hues were run through a CVD validator. The best
 * on-brand set achievable scores ΔE 15.3 between the worst adjacent pair for
 * normal vision (a pass) and **ΔE 3.1 under deuteranopia** (a hard fail). That
 * is not a tuning problem: deuteranopia collapses pink and green toward the
 * same yellow, so *any* four soft hues fail. The previous Rose/Peach/Gold set
 * was worse — peach and gold sat 0.7 ΔE apart, which is the same colour.
 *
 * The options were: use four garish hues, drop to two phases, or **stop asking
 * colour to do the job**. This is the third.
 *
 *     drop   menstrual    a shed petal, a drop
 *     leaf   follicular   first growth
 *     sun    ovulation    the light peaking
 *     moon   luteal       folding into dusk
 *
 * Four silhouettes that are unmistakable at 10px, in greyscale, in a
 * screenshot printed in black and white, and to every kind of colour vision.
 * The hue still ships — it just reinforces rather than carries.
 *
 * A pleasant side effect: the four shapes tell the garden story better than
 * the colours did. A moon reads as "winding down" instantly; lavender needs to
 * be learned.
 */

interface PhaseMarkProps {
  phase: PhaseKey | string;
  size?: number;
  /** Filled (on a coloured surface) or tinted (on a card). */
  variant?: 'plain' | 'filled';
  /** Override the mark colour. Defaults to the phase's surface-safe value. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const key = (p: string): PhaseKey =>
  (['menstrual', 'follicular', 'ovulation', 'luteal'].includes(p.toLowerCase())
    ? p.toLowerCase()
    : 'menstrual') as PhaseKey;

/**
 * The glyphs, on a 24-grid. Solid fills rather than strokes: at 10px a stroked
 * outline turns to mush, while a filled silhouette keeps its shape all the way
 * down to a calendar dot — which is the size that matters most.
 */
function glyphPath(g: PhaseGlyph): React.ReactNode {
  switch (g) {
    case 'drop':
      // A drop with a soft shoulder — reads as a petal as much as a droplet,
      // which is deliberate: this app is not about blood volume.
      return <Path d="M12 3c5 5.6 7.5 9.4 7.5 12.2A7.5 7.5 0 0 1 12 22.5a7.5 7.5 0 0 1-7.5-7.3C4.5 12.4 7 8.6 12 3Z" />;
    case 'leaf':
      // One leaf plus its midrib. The rib is what stops it reading as a comma.
      return (
        <>
          <Path d="M20.5 3.5c-9 0-16 4.5-16 11.5a7 7 0 0 0 2 5c8-1 14-7.5 14-16.5Z" />
          <Path d="M4 21c2-4.5 5.5-8.5 10-11" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" />
        </>
      );
    case 'sun':
      // Disc plus eight rays. The radial silhouette is unique in the set — it
      // is the only mark with anything sticking out of it.
      return (
        <>
          <Circle cx={12} cy={12} r={5.2} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * 45 * Math.PI) / 180;
            const x1 = 12 + Math.cos(a) * 8;
            const y1 = 12 + Math.sin(a) * 8;
            const x2 = 12 + Math.cos(a) * 10.8;
            const y2 = 12 + Math.sin(a) * 10.8;
            return (
              <Path
                key={i}
                d={`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`}
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </>
      );
    case 'moon':
    default:
      // A crescent as a single filled path, not two circles — a subtraction
      // needs a background colour to subtract *with*, which breaks the moment
      // the mark sits on a photo, a gradient or a coloured chip.
      return <Path d="M20 15.4A9.5 9.5 0 0 1 8.6 4 9.5 9.5 0 1 0 20 15.4Z" />;
  }
}

/**
 * One phase mark. Use anywhere a phase appears — never a bare coloured dot.
 */
const PhaseMark = ({ phase, size = 16, variant = 'plain', color, style }: PhaseMarkProps) => {
  const { isDark } = useTheme();
  const k = key(String(phase));
  const g = PHASE_GLYPH[k];

  const tint =
    color ??
    (variant === 'filled'
      ? '#FFFFFF'
      : isDark
        ? ((COLORS as Record<string, string>)[k] ?? COLORS.menstrual)
        : (PHASE_DEEP[k] ?? PHASE_INK[k]));

  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 24 24" color={tint} fill={tint}>
        {glyphPath(g)}
      </Svg>
    </View>
  );
};

export default PhaseMark;

/**
 * Phase legend row. Every chart or calendar that uses phase colour must render
 * one of these — the mark plus its name, so identity is never colour-alone
 * even for a reader who cannot tell a leaf from a drop at a glance.
 */
export function PhaseLegend({
  phases = ['menstrual', 'follicular', 'ovulation', 'luteal'],
  size = 14,
  style,
}: {
  phases?: PhaseKey[];
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, alignItems: 'center' },
        style,
      ]}
      accessibilityRole="list"
    >
      {phases.map((p) => (
        <View
          key={p}
          style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xs }}
          accessibilityRole="text"
          accessibilityLabel={CYCLE_PHASES[p].name}
        >
          <PhaseMark phase={p} size={size} />
          <Text variant="caption" tone="secondary">
            {CYCLE_PHASES[p].name}
          </Text>
        </View>
      ))}
    </View>
  );
}
