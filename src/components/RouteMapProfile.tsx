import { useMemo, useState } from "react";
import GPXMap, { type GPXMapProps } from "./GPXMap.tsx";
import ElevChart from "./ElevChart.tsx";
import { recordedTrackPts, trackCoverage } from "../../lib/track.js";

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
 * dot along the recorded track on the map; the map's own pin taps are unchanged. The profile is drawn
 * only when the stored elevations line up one-for-one with the track the map draws.
 */
export default function RouteMapProfile({ elevPts, ...mapProps }: RouteMapProfileProps) {
  const [idx, setIdx] = useState<number | null>(null);
  const { pts, waypoints } = mapProps;
  const line = useMemo(() => recordedTrackPts(pts, waypoints) as ReadonlyArray<readonly number[]> | null, [pts, waypoints]);
  /* The profile describes THE TRACK ON THE MAP or it is not drawn. Elevations that do not line up
     one-for-one with that track were recorded on another line: ten routes kept an older one-way set
     under a newer up-and-back track (measured 2026-11-23), and the profile printed "Loss 36 ft" and a
     sample count under a track that comes back down 6,700 ft. */
  const aligned = !!line && !!elevPts && elevPts.length === line.length;
  const hasElev = aligned && !!elevPts && elevPts.length >= 2 && elevPts.every((v) => Number.isFinite(v));
  const km = useMemo(() => (aligned && line ? cumulativeKm(line) : null), [aligned, line]);
  /* A track that starts more than 2 km from the trailhead pin is a piece of the route (the upper
     mountain, or a walk from another trailhead), so its Gain and Loss are not the route's and are not
     printed. Measured 2026-11-23: Rainier's Ingraham Direct stores the top 3.8 km from 10,078 ft, and
     the profile read its 4,300 ft as the climb. `trackCoverage` is the same test the downloaded file's
     caveat uses; a route with no trailhead pin makes no claim and keeps its totals. */
  const partial = useMemo(() => !!trackCoverage(pts, waypoints)?.missingApproach, [pts, waypoints]);
  const on = aligned && line && idx != null && idx >= 0 && idx < line.length ? line[idx] : null;
  return (
    <>
      <GPXMap {...mapProps} cursor={on ? [on[0], on[1]] : null} />
      {hasElev && elevPts ? (
        <div style={{ marginTop: 10 }}>
          <ElevChart pts={elevPts} km={km} index={on ? idx : null} onIndex={km ? setIdx : undefined} partial={partial} />
        </div>
      ) : null}
    </>
  );
}
