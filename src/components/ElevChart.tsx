import { memo, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { C, uDist, uElev } from "../../ClimbMatchCore.jsx";

export interface ElevChartProps {
  /** Elevation of each recorded sample in feet (the route's elev_pts), index-aligned with the track. */
  pts?: readonly number[] | null;
  /** Distance along the track to each sample in km, non-decreasing, the same length as `pts`. Without
   *  it the samples are spaced evenly by index and the profile cannot be scrubbed. */
  km?: readonly number[] | null;
  /** The sample the climber is on (the map shows it), or null for none. */
  index?: number | null;
  /** Called with the sample under the finger or pointer while scrubbing; null when it lets go. */
  onIndex?: (i: number | null) => void;
  /** Line and fill colour (default the palette blue). */
  color?: string;
}

const W = 340, H = 92, P = 8;

/**
 * Total climb and descent over a profile, in the same units as `pts` (feet). A change counts only
 * once it is `threshold` feet away from the last level that counted, so the jitter of a GPS or a
 * barometer does not add up as hundreds of feet of gain on a flat walk.
 */
export function elevationGainLoss(pts: readonly number[], threshold = 10): { gain: number; loss: number } {
  let gain = 0, loss = 0;
  if (pts.length < 2) return { gain, loss };
  let base = pts[0];
  for (const v of pts) {
    if (v - base >= threshold) { gain += v - base; base = v; }
    else if (base - v >= threshold) { loss += base - v; base = v; }
  }
  return { gain, loss };
}

/** The sample whose distance is nearest `target`; `km` is sorted ascending. */
function nearestIndex(km: readonly number[], target: number): number {
  let lo = 0, hi = km.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (km[mid] < target) lo = mid + 1; else hi = mid;
  }
  return lo > 0 && target - km[lo - 1] < km[lo] - target ? lo - 1 : lo;
}

function ElevChartImpl({ pts, km, index, onIndex, color }: ElevChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);
  if (!pts || pts.length < 2 || (km && km.length !== pts.length)) return null;
  const n = pts.length;
  const total = km ? km[n - 1] : n - 1;
  if (!(total > 0)) return null;
  const scrub = !!km && !!onIndex;
  const mn = Math.min(...pts), mx = Math.max(...pts);
  const x = (i: number) => P + ((km ? km[i] : i) / total) * (W - 2 * P);
  const y = (v: number) => H - P - ((v - mn) / (mx - mn || 1)) * (H - 2 * P);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const col = color || C.blue;
  const { gain, loss } = elevationGainLoss(pts);
  const on = index != null && index >= 0 && index < n ? index : null;

  /* A finger or a pen scrubs only while it is down, so a page scroll never moves the marker; a mouse
     follows the pointer and lets go of it when it leaves the chart. */
  const at = (clientX: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || !r.width || !onIndex || !km) return;
    const frac = Math.min(1, Math.max(0, ((clientX - r.left) / r.width * W - P) / (W - 2 * P)));
    onIndex(nearestIndex(km, frac * total));
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    dragging.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* the pointer already ended */ }
    at(e.clientX);
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (dragging.current || e.pointerType === "mouse") at(e.clientX);
  };
  const up = (e: PointerEvent<SVGSVGElement>) => {
    dragging.current = false;
    if (e.pointerType !== "mouse" && onIndex) onIndex(null);
  };
  const leave = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse" && onIndex) onIndex(null);
  };
  /* The keyboard reaches the same marker: arrows step along the track, Escape clears it. */
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!scrub || !onIndex) return;
    const cur = on ?? 0;
    let next: number | null;
    if (e.key === "ArrowRight") next = Math.min(n - 1, cur + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, cur - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Escape") next = null;
    else return;
    e.preventDefault();
    onIndex(next);
  };

  return (
    <div style={{ background: "#050d1a", borderRadius: 8, padding: "8px 10px 4px", border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 12, color: C.textMuted, marginBottom: 4 }}>
        <span>Gain <strong style={{ color: col }}>{uElev(gain)}</strong> · Loss <strong style={{ color: C.red }}>{uElev(loss)}</strong></span>
        <span style={{ color: C.text }}>{on != null && km ? `${uElev(pts[on])} at ${uDist(km[on])}` : km ? uDist(total) : `${n} samples`}</span>
      </div>
      <svg
        ref={svgRef}
        role={scrub ? "slider" : "img"}
        tabIndex={scrub ? 0 : undefined}
        aria-label={scrub ? "Elevation along the recorded track. Drag or use the arrow keys to see where it is on the map" : "Elevation profile of the route"}
        aria-valuemin={scrub ? 0 : undefined}
        aria-valuemax={scrub ? n - 1 : undefined}
        aria-valuenow={scrub ? on ?? 0 : undefined}
        aria-valuetext={scrub ? (on != null && km ? `${uElev(pts[on])} at ${uDist(km[on])} along the track` : "No point chosen") : undefined}
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        onPointerDown={scrub ? down : undefined}
        onPointerMove={scrub ? move : undefined}
        onPointerUp={scrub ? up : undefined}
        onPointerCancel={scrub ? up : undefined}
        onPointerLeave={scrub ? leave : undefined}
        onKeyDown={scrub ? key : undefined}
        style={{ display: "block", touchAction: scrub ? "pan-y" : undefined, cursor: scrub ? "crosshair" : undefined, outlineOffset: 2 }}
      >
        <path d={d + ` L${x(n - 1)},${H - P} L${x(0)},${H - P} Z`} fill={`${col}22`} />
        <path d={d} stroke={col} strokeWidth="2" fill="none" />
        {on != null ? (
          <g pointerEvents="none">
            <line x1={x(on)} x2={x(on)} y1={P} y2={H - P} stroke={C.text} strokeWidth="1" strokeDasharray="2 2" />
            <circle cx={x(on)} cy={y(pts[on])} r="3.5" fill={col} stroke="#ffffff" strokeWidth="1.5" />
          </g>
        ) : null}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginTop: 2 }}>
        <span style={{ color: C.green }}>{uElev(pts[0])}</span>
        <span style={{ color: C.red }}>{uElev(pts[n - 1])}</span>
      </div>
    </div>
  );
}

/** The memoised profile: re-renders only when its points, scrub position or colour change. */
const MemoElevChart = memo(ElevChartImpl);

/**
 * The elevation profile under the route map: height against distance along the recorded track, the
 * climb and the descent, and a marker that moves along the track as the climber scrubs it. The map
 * shows the same point (GPXMap's `cursor`). Without distances it is a static picture, spaced by sample.
 * (The exported function wraps the memoised component because the guard stitch expects exactly one
 * `export default function` per moved file.)
 */
export default function ElevChart(props: ElevChartProps) {
  return <MemoElevChart {...props} />;
}
