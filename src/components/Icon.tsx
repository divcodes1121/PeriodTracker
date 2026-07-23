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
  | 'minus'
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
  | 'star'
  | 'rake'
  | 'stone'
  | 'shell'
  | 'sound'
  | 'soundOff'
  | 'umbrella'
  | 'aurora'
  | 'fish'
  | 'dandelion'
  | 'breathe'
  // Symptoms — sensations, not organs.
  | 'spark'
  | 'headache'
  | 'back'
  | 'bloat'
  | 'wave'
  | 'acne'
  | 'cherry'
  | 'petal'
  // Navigation & features
  | 'book'
  | 'hand'
  | 'trophy'
  | 'user';

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

      {/* Settings — sliders, not a gear.
          The gear was drawn as a hub with eight radial spokes, which at 24pt
          is *geometrically the same drawing as a sun*. It sat in the tab bar
          two icons away from the theme toggle's actual sun, and the two were
          indistinguishable at a glance. Sliders carry "adjust things" with no
          such collision. */}
      {name === 'settings' && (
        <>
          <Path d="M4 7.5h4.5M13.5 7.5H20" {...common} />
          <Path d="M4 16.5h7.5M16.5 16.5H20" {...common} />
          <Circle cx="11" cy="7.5" r="2.5" {...common} />
          <Circle cx="14" cy="16.5" r="2.5" {...common} />
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
      {name === 'minus' && <Path d="M5.5 12h13" {...common} />}

      {name === 'rake' && (
        <>
          <Path d="M6.5 4.5v5M12 4.5v5M17.5 4.5v5M4.5 9.5h15" {...common} />
          <Path d="M12 9.5v10" {...common} />
        </>
      )}
      {name === 'stone' && (
        <>
          <Path d="M5 14.5a7 5 0 1 0 14 0a7 5 0 1 0 -14 0" {...common} />
          <Path d="M8.5 12.5c1-1 2.4-1.5 3.8-1.4" {...common} />
        </>
      )}
      {name === 'shell' && (
        <>
          <Path d="M12 19.5 6.8 13.6a6.4 6.4 0 1 1 10.4 0Z" {...common} />
          <Path d="M12 19.5V7.5M8.6 16.2l1.7-7.9M15.4 16.2l-1.7-7.9" {...common} />
        </>
      )}
      {name === 'sound' && (
        <>
          <Path d="M4.5 10v4h3l4.5 3.5v-11L7.5 10h-3z" {...common} />
          <Path d="M15 9.5a4.2 4.2 0 0 1 0 5M17.5 7.5a7 7 0 0 1 0 9" {...common} />
        </>
      )}
      {name === 'soundOff' && (
        <>
          <Path d="M4.5 10v4h3l4.5 3.5v-11L7.5 10h-3z" {...common} />
          <Path d="m15.5 9.5 4.5 5M20 9.5l-4.5 5" {...common} />
        </>
      )}

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

      {/* Fish — a body, a tail and an eye, at icon weight. */}
      {name === 'fish' && (
        <>
          <Path d="M14.5 12c0 2.5-3 5-6.5 5s-5.5-2.5-5.5-5 2-5 5.5-5 6.5 2.5 6.5 5z" {...common} />
          <Path d="m14.5 12 4-3.5v7L14.5 12z" {...common} />
          <Path d="M6 10.5h.01" {...common} strokeWidth={2.4} />
        </>
      )}

      {/* Aurora — layered curtains of light over a horizon. */}
      {name === 'aurora' && (
        <>
          <Path d="M3 14c3-5 6-2 9-6s6-1 9-4" {...common} />
          <Path d="M3 18c3-5 6-2 9-6s6-1 9-4" {...common} opacity={0.55} />
          <Path d="M3 21h18" {...common} />
        </>
      )}

      {/* Dandelion — a bare stem, a pappus head, and two seeds on the wind. */}
      {name === 'dandelion' && (
        <>
          <Path d="M11 21c0-4 0-6 0-8" {...common} />
          <Path d="M11 13 8 10M11 13l3-3M11 13v-4M11 13 8.5 14M11 13l2.5 1" {...common} />
          <Path d="M18 5.5 20 4M18.5 8 21 7.5" {...common} opacity={0.6} />
        </>
      )}

      {name === 'umbrella' && (
        <>
          <Path d="M3.5 12a8.5 8.5 0 0 1 17 0Z" {...common} />
          <Path d="M12 2.5v1M12 12v6.5a2 2 0 0 0 4 0" {...common} />
        </>
      )}

      {name === 'breathe' && (
        <>
          <Circle cx="12" cy="12" r="3" {...common} />
          <Circle cx="12" cy="12" r="8.5" {...common} opacity={0.55} />
        </>
      )}

      {/* ── Symptom set ───────────────────────────────────────────────────
          Every symptom needs a glyph that reads at 20pt without being a
          medical pictogram. The trick throughout is to draw the *sensation*
          rather than the body part: cramps are a radiating pulse, not a
          uterus; bloating is a swell, not an abdomen. A period tracker that
          draws organs at people is a clinic, and this is not one. */}

      {/* Cramps — a squeeze: a tight core with pressure closing in on it.
          The first draft was a core with eight radiating rays, which is
          *geometrically the same drawing as the ovulation sun mark* — and both
          can appear on a filtered calendar at once. Inward arcs read as
          pressure rather than emission, which is also the truer sensation. */}
      {name === 'spark' && (
        <>
          <Circle cx="12" cy="12" r="3.4" {...common} />
          <Path d="M6.2 7.4A7 7 0 0 0 6.2 16.6" {...common} />
          <Path d="M17.8 7.4a7 7 0 0 1 0 9.2" {...common} />
          <Path d="M2.8 5.4A10.5 10.5 0 0 0 2.8 18.6" {...common} opacity={0.5} />
          <Path d="M21.2 5.4a10.5 10.5 0 0 1 0 13.2" {...common} opacity={0.5} />
        </>
      )}

      {/* Headache — a brow line with pressure arcs at the temple. */}
      {name === 'headache' && (
        <>
          <Path d="M6.5 20v-3a5.5 5.5 0 0 1 11 0v3" {...common} />
          <Path d="M9 12.5h6" {...common} opacity={0.7} />
          <Path d="M5 7.5 3 6M19 7.5 21 6M12 5.5v-2" {...common} />
        </>
      )}

      {/* Back pain — a spine with a flare at the base. */}
      {name === 'back' && (
        <>
          <Path d="M12 3.5c-2 3-2 5.5 0 8.5s2 5.5 0 8.5" {...common} />
          <Path d="M9.5 6.5h5M9 11h5.5M9.5 15.5h5" {...common} opacity={0.7} />
          <Path d="M18 13.5 20 12.5M18 16.5l2 1" {...common} />
        </>
      )}

      {/* Bloating — a swell, drawn as a widening arc pair. */}
      {name === 'bloat' && (
        <>
          <Path d="M12 4.5c-4.5 0-7.5 3.4-7.5 7.5S7.5 19.5 12 19.5s7.5-3.4 7.5-7.5S16.5 4.5 12 4.5" {...common} />
          <Path d="M8 11c1.4-1.4 2.6-1.4 4 0s2.6 1.4 4 0" {...common} opacity={0.65} />
          <Path d="M8.5 15c1.2-1.2 2.2-1.2 3.5 0s2.3 1.2 3.5 0" {...common} opacity={0.45} />
        </>
      )}

      {/* Nausea — an unsettled wave. */}
      {name === 'wave' && (
        <>
          <Path d="M3 9c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 6 0" {...common} />
          <Path d="M3 15c2-2.4 4-2.4 6 0s4 2.4 6 0 4-2.4 6 0" {...common} opacity={0.6} />
        </>
      )}

      {/* Acne — a cheek curve with three marks. */}
      {name === 'acne' && (
        <>
          <Path d="M5 4.5c-1 5-1 10 0 15 5 1.6 9 1.6 14 0 1-5 1-10 0-15-5-1.6-9-1.6-14 0Z" {...common} />
          <Circle cx="9.5" cy="10" r="1.3" {...common} />
          <Circle cx="14.5" cy="13.5" r="1.6" {...common} />
          <Circle cx="15" cy="8" r="1" {...common} opacity={0.6} />
        </>
      )}

      {/* Cravings — a cherry pair. Softer than a chocolate bar and it scales. */}
      {name === 'cherry' && (
        <>
          <Circle cx="8" cy="17" r="3.5" {...common} />
          <Circle cx="16.5" cy="18" r="3" {...common} />
          <Path d="M8 13.5c1-5 4-8 8-9M16.5 15c-.5-3.6.5-6.6 3-9" {...common} />
          <Path d="M13 5.5c2-1.6 4-1.6 6 .5-2 1.6-4 1.6-6-.5Z" {...common} opacity={0.65} />
        </>
      )}

      {/* Mood swings — a single petal. Used wherever "feelings" is the group. */}
      {name === 'petal' && (
        <>
          <Path d="M12 3c4.4 3.6 6.5 6.6 6.5 9.5A6.5 6.5 0 0 1 12 19a6.5 6.5 0 0 1-6.5-6.5C5.5 9.6 7.6 6.6 12 3Z" {...common} />
          <Path d="M12 8.5v7" {...common} opacity={0.5} />
        </>
      )}

      {/* Journal — a bound notebook with a ribbon. */}
      {name === 'book' && (
        <>
          <Path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 0-3 3Z" {...common} />
          <Path d="M5 4.5v15" {...common} />
          <Path d="M13.5 4.5v7l2-1.5 2 1.5v-7" {...common} opacity={0.7} />
        </>
      )}

      {/* Self-care — an open hand cupping a small bloom. */}
      {name === 'hand' && (
        <>
          <Path d="M4.5 12.5c0 4.4 3.4 7.5 7.5 7.5s7.5-3.1 7.5-7.5" {...common} />
          <Circle cx="12" cy="7" r="2.6" {...common} />
          <Path d="M12 9.6v3" {...common} opacity={0.6} />
        </>
      )}

      {/* Trophy — achievements. Muted gold, never a game badge. */}
      {name === 'trophy' && (
        <>
          <Path d="M7.5 4h9v5.5a4.5 4.5 0 0 1-9 0Z" {...common} />
          <Path d="M7.5 5.5H5A2.5 2.5 0 0 0 5 10.5h1M16.5 5.5H19a2.5 2.5 0 0 1 0 5h-1" {...common} />
          <Path d="M12 14v3.5M8.5 20.5h7" {...common} />
        </>
      )}

      {/* User — profile. */}
      {name === 'user' && (
        <>
          <Circle cx="12" cy="8" r="3.8" {...common} />
          <Path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" {...common} />
        </>
      )}
    </Svg>
  );
};

export default Icon;
