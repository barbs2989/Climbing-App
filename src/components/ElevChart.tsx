import { memo } from "react";
import { C, uElev } from "../../ClimbMatchCore.jsx";

export interface ElevChartProps {
  /** Elevation samples along the track, evenly spaced by index (the GPX map spaces them the same way). */
  pts?: readonly number[] | null;
  /** Line and fill colour (default the palette blue). */
  color?: string;
}

function ElevChartImpl({ pts, color }: ElevChartProps) {
  if (!pts || pts.length < 2) return null;
  const W = 340, H = 62, p = 8;
  const mn = Math.min(...pts), mx = Math.max(...pts);
  const x = (i: number) => p + (i / (pts.length - 1)) * (W - 2 * p);
  const y = (v: number) => H - p - ((v - mn) / (mx - mn || 1)) * (H - 2 * p);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const col = color || C.blue;
  return (
    <div style={{ background: "#050d1a", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <path d={d + ` L${x(pts.length - 1)},${H} L${x(0)},${H} Z`} fill={`${col}22`} />
        <path d={d} stroke={col} strokeWidth="2" fill="none" />
        <text x={x(0) + 2} y={H - 2} fontSize="8" fill={C.green}>{uElev(pts[0])}</text>
        <text x={x(pts.length - 1) - 2} y={H - 2} fontSize="8" fill={C.red} textAnchor="end">{uElev(pts[pts.length - 1])}</text>
        <text x={W / 2} y={12} fontSize="8" fill={col} textAnchor="middle">+{uElev(mx - mn)}</text>
      </svg>
    </div>
  );
}

/** The memoised profile, as core had it: re-renders only when the points or colour change. */
const MemoElevChart = memo(ElevChartImpl);

/**
 * The elevation profile under the route map: a filled line, the start and end heights in the
 * climber's units, and the total gain across the top. Renders nothing for fewer than two points.
 * (The exported function wraps the memoised component because the guard stitch expects exactly one
 * `export default function` per moved file.)
 */
export default function ElevChart(props: ElevChartProps) {
  return <MemoElevChart {...props} />;
}
