import Svg, { Path, Circle, Line, Ellipse } from 'react-native-svg';
import { StyleProp, ViewStyle } from 'react-native';

/**
 * SF Symbols-style icon set.
 *
 * Rules that keep the set coherent:
 * - Every glyph is drawn on a 24×24 grid.
 * - Stroke-only (no fills), round caps and joins, uniform 1.75 stroke weight
 *   that scales with the icon so optical weight stays constant at any size.
 * - Geometry is simplified to the minimum that still reads at 20pt.
 *
 * This replaces the previous emoji-as-icon approach: emoji can't inherit color,
 * can't match stroke weight, and render differently per platform.
 */

export type IconName =
  | 'home'
  | 'calendar'
  | 'chart'
  | 'settings'
  | 'sparkles'
  | 'drop'
  | 'heart'
  | 'moon'
  | 'sun'
  | 'note'
  | 'water'
  | 'plus'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'arrowRight'
  | 'check'
  | 'close'
  | 'lock'
  | 'bell'
  | 'trash'
  | 'info'
  | 'trend'
  | 'flame'
  | 'leaf'
  | 'activity'
  | 'clock'
  | 'wind'
  | 'flower'
  | 'bubble'
  | 'crystal'
  | 'rain'
  | 'star';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Multiplier on the base 1.75 stroke weight. */
  weight?: number;
  style?: StyleProp<ViewStyle>;
}

const Icon = ({ name, size = 24, color = '#1E1E22', weight = 1, style }: IconProps) => {
  const sw = 1.75 * weight;
  const common = {
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} pointerEvents="none">
      {name === 'home' && (
        <>
          <Path d="M3.5 10.5 12 3.5l8.5 7" {...common} />
          <Path d="M5.5 9.5v9a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-9" {...common} />
          <Path d="M9.5 20v-5.5h5V20" {...common} />
        </>
      )}

      {name === 'calendar' && (
        <>
          <Path
            d="M4.5 7.5A2 2 0 0 1 6.5 5.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"
            {...common}
          />
          <Line x1="4.5" y1="10" x2="19.5" y2="10" {...common} />
          <Line x1="8.5" y1="3.5" x2="8.5" y2="6.5" {...common} />
          <Line x1="15.5" y1="3.5" x2="15.5" y2="6.5" {...common} />
        </>
      )}

      {name === 'chart' && (
        <>
          <Path d="M4 19.5V4.5" {...common} />
          <Path d="M4 19.5h16" {...common} />
          <Path d="M7.5 16V12" {...common} />
          <Path d="M12 16V7.5" {...common} />
          <Path d="M16.5 16v-6" {...common} />
        </>
      )}

      {name === 'settings' && (
        <>
          <Circle cx="12" cy="12" r="2.75" {...common} />
          <Path
            d="M12 3.5v1.8M12 18.7v1.8M20.5 12h-1.8M5.3 12H3.5M18.01 5.99l-1.27 1.27M7.26 16.74l-1.27 1.27M18.01 18.01l-1.27-1.27M7.26 7.26 5.99 5.99"
            {...common}
          />
        </>
      )}

      {name === 'sparkles' && (
        <>
          <Path d="M12 3.5 13.6 8.4 18.5 10 13.6 11.6 12 16.5 10.4 11.6 5.5 10 10.4 8.4z" {...common} />
          <Path d="M18 15.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z" {...common} />
        </>
      )}

      {name === 'drop' && (
        <Path
          d="M12 3.5c3.2 3.6 5.5 6.6 5.5 9.4A5.5 5.5 0 0 1 12 18.4a5.5 5.5 0 0 1-5.5-5.5c0-2.8 2.3-5.8 5.5-9.4z"
          {...common}
        />
      )}

      {name === 'heart' && (
        <Path
          d="M12 19.5S4.5 15 4.5 9.9A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7.5 2.3c0 5.1-7.5 9.6-7.5 9.6z"
          {...common}
        />
      )}

      {name === 'moon' && (
        <Path d="M19 14.2A7.6 7.6 0 0 1 9.8 5a7.6 7.6 0 1 0 9.2 9.2z" {...common} />
      )}

      {name === 'sun' && (
        <>
          <Circle cx="12" cy="12" r="4" {...common} />
          <Path
            d="M12 3v1.8M12 19.2V21M21 12h-1.8M4.8 12H3M18.36 5.64l-1.27 1.27M6.91 17.09l-1.27 1.27M18.36 18.36l-1.27-1.27M6.91 6.91 5.64 5.64"
            {...common}
          />
        </>
      )}

      {name === 'note' && (
        <>
          <Path d="M6 3.5h8L19 8.5v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20.5v-15A1.5 1.5 0 0 1 6.5 4z" {...common} />
          <Path d="M13.5 3.5V9h5.5" {...common} />
          <Path d="M8.5 13.5h7M8.5 17h4.5" {...common} />
        </>
      )}

      {name === 'water' && (
        <>
          <Path d="M6.5 8.5h11l-1 11a1.5 1.5 0 0 1-1.5 1.4H9a1.5 1.5 0 0 1-1.5-1.4z" {...common} />
          <Path d="M7 13.5c1.7-1.2 3.3-1.2 5 0s3.3 1.2 5 0" {...common} />
          <Path d="M8 8.5 8.6 4a1 1 0 0 1 1-.9h4.8a1 1 0 0 1 1 .9l.6 4.5" {...common} />
        </>
      )}

      {name === 'plus' && <Path d="M12 5.5v13M5.5 12h13" {...common} />}

      {name === 'chevronRight' && <Path d="m9.5 5.5 6.5 6.5-6.5 6.5" {...common} />}
      {name === 'chevronLeft' && <Path d="M14.5 5.5 8 12l6.5 6.5" {...common} />}
      {name === 'chevronDown' && <Path d="m5.5 9.5 6.5 6.5 6.5-6.5" {...common} />}
      {name === 'arrowRight' && <Path d="M4.5 12h15m-6-6.5 6.5 6.5-6.5 6.5" {...common} />}

      {name === 'check' && <Path d="m5 12.5 4.5 4.5L19 7" {...common} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6 6 18" {...common} />}

      {name === 'lock' && (
        <>
          <Path d="M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5z" {...common} />
          <Path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" {...common} />
        </>
      )}

      {name === 'bell' && (
        <>
          <Path d="M18 16.5H6c1.2-1.2 1.5-2.4 1.5-4v-2a4.5 4.5 0 0 1 9 0v2c0 1.6.3 2.8 1.5 4z" {...common} />
          <Path d="M10.5 19.5a1.8 1.8 0 0 0 3 0" {...common} />
        </>
      )}

      {name === 'trash' && (
        <>
          <Path d="M4.5 7h15" {...common} />
          <Path d="M9.5 7V5.5A1 1 0 0 1 10.5 4.5h3a1 1 0 0 1 1 1V7" {...common} />
          <Path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" {...common} />
        </>
      )}

      {name === 'info' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Path d="M12 11v5.5" {...common} />
          <Path d="M12 7.75v.5" {...common} />
        </>
      )}

      {name === 'trend' && (
        <>
          <Path d="m4 15.5 5-5 3.5 3.5L20 6.5" {...common} />
          <Path d="M15 6.5h5v5" {...common} />
        </>
      )}

      {name === 'flame' && (
        <Path
          d="M12 20.5a5 5 0 0 0 5-5c0-4-4-5.5-3-10-3 1.5-5 4.5-5 7 0-1-1-2-1.5-2.5A6.4 6.4 0 0 0 7 15.5a5 5 0 0 0 5 5z"
          {...common}
        />
      )}

      {name === 'leaf' && (
        <>
          <Path d="M20 4.5c0 8-4.5 12.5-10 12.5a5 5 0 0 1-5-5C5 6.5 11 4.5 20 4.5z" {...common} />
          <Path d="M4.5 20c3-6 7-9 12-11" {...common} />
        </>
      )}

      {name === 'activity' && <Path d="M3.5 12h4l2.5-6 4 12 2.5-6h4" {...common} />}

      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Path d="M12 7v5.2l3.2 2" {...common} />
        </>
      )}

      {name === 'wind' && (
        <>
          <Path d="M3.5 8h12.7a2.4 2.4 0 1 0-2.4-2.4" {...common} />
          <Path d="M3.5 12h16a2.6 2.6 0 1 1-2.6 2.6" {...common} />
          <Path d="M3.5 16h8.5" {...common} />
        </>
      )}

      {name === 'flower' && (
        <>
          <Circle cx="12" cy="12" r="2.1" {...common} />
          {[0, 72, 144, 216, 288].map((a) => (
            <Ellipse
              key={a}
              cx="12"
              cy="6.4"
              rx="2.1"
              ry="3.3"
              transform={`rotate(${a} 12 12)`}
              {...common}
            />
          ))}
        </>
      )}

      {name === 'bubble' && (
        <>
          <Circle cx="10" cy="10.2" r="5.2" {...common} />
          <Circle cx="16.8" cy="15.8" r="2.8" {...common} />
          <Path d="M7.6 9a2.8 2.8 0 0 1 2-1.9" {...common} />
        </>
      )}

      {name === 'crystal' && (
        <>
          <Path d="M12 3l6 6.2L14.6 21H9.4L6 9.2z" {...common} />
          <Path d="M6 9.2h12M12 3l-2.2 6.2L12 21m0-18l2.2 6.2L12 21" {...common} />
        </>
      )}

      {name === 'rain' && (
        <>
          <Path
            d="M6.4 14.5a3.9 3.9 0 0 1 .8-7.7 5.1 5.1 0 0 1 9.9 1.1 3.4 3.4 0 0 1-.5 6.6H6.4z"
            {...common}
          />
          <Path d="M8.5 17.5v2.2M12 17.5v2.8M15.5 17.5v2.2" {...common} />
        </>
      )}

      {name === 'star' && (
        <Path
          d="M12 3.5l2.47 5.26 5.53.7-4.1 3.94 1.06 5.6L12 16.2 7.04 19l1.06-5.6L4 9.46l5.53-.7z"
          {...common}
        />
      )}
    </Svg>
  );
};

export default Icon;
