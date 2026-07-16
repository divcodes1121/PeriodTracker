import { Text as RNText, TextProps as RNTextProps, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { TYPE, TABULAR } from '../theme/tokens';

type Variant = keyof typeof TYPE;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent' | 'inherit';

interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  /** Tabular figures — use for any number that animates or sits in a column. */
  tabular?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Typed text primitive. Every string in the UI goes through this so the type
 * scale stays enforceable — screens pick a semantic variant rather than
 * hand-rolling fontSize/fontWeight, which is how scales rot.
 *
 * `allowFontScaling` stays on (RN default) so Dynamic Type works; the scale in
 * tokens is already softened via fontScale() to stay sane at large sizes.
 */
const Text = ({
  variant = 'body',
  tone = 'primary',
  tabular = false,
  color,
  style,
  children,
  ...rest
}: TextProps) => {
  const { colors: c } = useTheme();

  const toneColor: Record<Tone, string | undefined> = {
    primary: c.text,
    secondary: c.textSecondary,
    tertiary: c.textTertiary,
    accent: c.text,
    onAccent: c.onAccent,
    inherit: undefined,
  };

  return (
    <RNText
      style={[TYPE[variant], { color: color ?? toneColor[tone] }, tabular && TABULAR, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
};

export default Text;
