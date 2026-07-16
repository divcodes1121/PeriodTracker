import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  /** Draw the soft area fill under the line. */
  fill?: boolean;
  /** Emphasize the final point with a dot. */
  showLast?: boolean;
  strokeWidth?: number;
}

/**
 * Smooth inline trend line.
 *
 * Uses a Catmull-Rom → cubic Bézier conversion so the curve passes exactly
 * through every sample. A plain quadratic smoother (the usual trick) drifts off
 * the real data points, which is fine for decoration but not for health data —
 * the line has to be honest about the values it plots.
 *
 * Renders responsively via viewBox rather than measuring layout.
 */
const Sparkline = ({
  data,
  color,
  height = 48,
  fill = true,
  showLast = true,
  strokeWidth = 2.25,
}: SparklineProps) => {
  const W = 100;
  const H = 100;
  const pad = strokeWidth * 2;

  const { line, area, lastPoint } = useMemo(() => {
    if (data.length < 2) return { line: '', area: '', lastPoint: null };

    const min = Math.min(...data);
    const max = Math.max(...data);
    // Flat series would divide by zero — pin it to the vertical centre.
    const span = max - min || 1;
    const flat = max === min;

    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * (W - pad * 2) + pad,
      y: flat ? H / 2 : H - pad - ((v - min) / span) * (H - pad * 2),
    }));

    const d = pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const p0 = pts[i - 2] ?? pts[i - 1];
      const p1 = pts[i - 1];
      const p2 = p;
      const p3 = pts[i + 1] ?? p;
      // Catmull-Rom control points (tension 1/6 → standard uniform CR).
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      return `${acc} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }, '');

    return {
      line: d,
      area: `${d} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`,
      lastPoint: pts[pts.length - 1],
    };
  }, [data, pad]);

  if (!line) return <View style={{ height }} />;

  return (
    <View style={{ height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.22} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {fill && <Path d={area} fill="url(#sparkFill)" />}
        <Path
          d={line}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          // preserveAspectRatio="none" would squash the stroke; this keeps it even.
          vectorEffect="non-scaling-stroke"
        />
        {showLast && lastPoint && (
          <Circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={color} vectorEffect="non-scaling-stroke" />
        )}
      </Svg>
    </View>
  );
};

export default Sparkline;
