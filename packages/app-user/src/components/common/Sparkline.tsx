import { useMemo } from 'react';

interface SparklineProps {
  points: { date: string; value: number }[];
  /** Stroke colour. */
  color?: string;
  height?: number;
  /** Show the y-axis labels and x-axis dates, as the agent Data tab does. */
  withAxes?: boolean;
  className?: string;
}

const compact = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
};

/**
 * Small line chart for the agent, streamer and creator dashboards.
 *
 * Inline SVG rather than a charting library: these are single-series trend
 * lines in a 300×120 box, and pulling in a chart dependency for that would
 * cost more than it returns.
 *
 * A flat series still draws a line through the middle instead of collapsing to
 * the baseline, so "all zeros" reads as real data rather than a broken chart.
 */
export const Sparkline = ({
  points,
  color = '#6366F1',
  height = 120,
  withAxes = false,
  className = '',
}: SparklineProps) => {
  const geometry = useMemo(() => {
    if (points.length === 0) return null;

    const width = 300;
    const padLeft = withAxes ? 34 : 4;
    const padRight = 6;
    const padTop = 8;
    const padBottom = withAxes ? 20 : 6;

    const values = points.map((p) => p.value);
    const max = Math.max(...values);
    const min = Math.min(...values, 0);
    const span = max - min || 1;

    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;

    const coords = points.map((p, i) => {
      const x = padLeft + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
      // A flat line sits mid-box rather than on the floor.
      const ratio = max === min ? 0.5 : (p.value - min) / span;
      const y = padTop + innerH - ratio * innerH;
      return { x, y, ...p };
    });

    const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const area = `${path} L${coords[coords.length - 1].x.toFixed(1)},${(padTop + innerH).toFixed(1)} L${coords[0].x.toFixed(1)},${(padTop + innerH).toFixed(1)} Z`;

    return { width, coords, path, area, max, min, padLeft, padTop, innerH };
  }, [points, height, withAxes]);

  if (!geometry) {
    return (
      <div className={`flex items-center justify-center text-xs text-ink-faint ${className}`} style={{ height }}>
        No data yet
      </div>
    );
  }

  const { width, coords, path, area, max, min, padLeft, padTop, innerH } = geometry;
  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      style={{ height }}
      role="img"
      aria-label="Trend chart"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {withAxes &&
        [0, 0.5, 1].map((ratio) => {
          const y = padTop + innerH - ratio * innerH;
          return (
            <g key={ratio}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - 6}
                y2={y}
                stroke="#EFEFF4"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text x={4} y={y + 3} fontSize="9" fill="#999999">
                {compact(min + (max - min) * ratio)}
              </text>
            </g>
          );
        })}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" fill="#FFFFFF" stroke={color} strokeWidth="2" />
      ))}

      {withAxes &&
        coords.map((c, i) =>
          // Only label the ends and the middle — labelling every point overlaps.
          i === 0 || i === coords.length - 1 || i === Math.floor(coords.length / 2) ? (
            <text key={`x-${i}`} x={c.x} y={height - 6} fontSize="9" fill="#999999" textAnchor="middle">
              {c.date.slice(5)}
            </text>
          ) : null
        )}
    </svg>
  );
};
