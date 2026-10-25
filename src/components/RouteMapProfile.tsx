import { useMemo, useState } from "react";
import GPXMap, { type GPXMapProps } from "./GPXMap.tsx";
import ElevChart from "./ElevChart.tsx";
import { recordedTrackPts } from "../../lib/track.js";

export interface RouteMapProfileProps extends GPXMapProps {
  /** The recorded track's elevations in feet, one per sample of `pts` (the route's elev_pts). */
  elevPts?: readonly number[] | null;
}

/** Distance in km from the first sample to each sample along the track (great-circle, per leg). */
function cumulativeKm(line: ReadonlyArray<readonly number[]>): number[] {
  const R = 6371, r = Math.PI / 180;
  const out = [0];
  for (let i = 1; i < line.length; i++) {
    const [la1, lo1] = line[i - 1], [la2, lo2] = line[i];
    const dLat = (la2 - la1) * r, dLng = (lo2 - lo1) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLng / 2) ** 2;
    out.push(out[i - 1] + 2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
  }
  return out;
}

/**
 * The route page's map with its elevation profile directly under it. Scrubbing the profile moves a
 * dot along the recorded track on the map; the map's own pin taps are unchanged. The scrub is offered
 * only when the stored elevations line up one-for-one with the track the map draws.
 */
export default function RouteMapProfile({ elevPts, ...mapProps }: RouteMapProfileProps) {
  const [idx, setIdx] = useState<number | null>(null);
  const { pts, waypoints } = mapProps;
  const line = useMemo(() => recordedTrackPts(pts, waypoints) as ReadonlyArray<readonly number[]> | null, [pts, waypoints]);
  /* The scrub needs the samples to line up one-for-one with the drawn track. Stored elevations that do
     not (an older import) still get the profile, as a static picture spaced by sample. */
  const aligned = !!line && !!elevPts && elevPts.length === line.length;
  const hasElev = !!elevPts && elevPts.length >= 2 && elevPts.every((v) => Number.isFinite(v));
  const km = useMemo(() => (aligned && line ? cumulativeKm(line) : null), [aligned, line]);
  const on = aligned && line && idx != null && idx >= 0 && idx < line.length ? line[idx] : null;
  return (
    <>
      <GPXMap {...mapProps} cursor={on ? [on[0], on[1]] : null} />
      {hasElev && elevPts ? (
        <div style={{ marginTop: 10 }}>
          <ElevChart pts={elevPts} km={km} index={on ? idx : null} onIndex={km ? setIdx : undefined} />
        </div>
      ) : null}
    </>
  );
}
