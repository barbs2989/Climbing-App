// Point-to-track geometry for the camp-pin audit and the camp-pin solver, so both measure "on the
// track" and "how far along it" the same way.
//
// DISTANCE TO THE LINE, NOT TO THE NEAREST VERTEX (audit-waypoints.mjs, lesson 1): a sparse track
// can put a point that sits exactly on the drawn line 400 m from the closest stored vertex.
// Each segment is projected onto a local flat plane around its own first vertex — at segment
// lengths of metres to a few km the error is far below the 500 m tolerance it is compared with.
import { pointOf, metresBetween } from "../../lib/track.js";

const M_PER_DEG_LAT = 111320;

// Nearest point on segment a-b to p: { d (metres), t (0..1 along the segment) }.
function toSegment(p, a, b) {
  const k = Math.cos((a.lat * Math.PI) / 180) * M_PER_DEG_LAT;
  const bx = (b.lng - a.lng) * k, by = (b.lat - a.lat) * M_PER_DEG_LAT;
  const px = (p.lng - a.lng) * k, py = (p.lat - a.lat) * M_PER_DEG_LAT;
  const L2 = bx * bx + by * by;
  const t = L2 ? Math.max(0, Math.min(1, (px * bx + py * by) / L2)) : 0;
  return { d: Math.hypot(px - t * bx, py - t * by), t };
}

/** The track as clean {lat,lng} points. */
export const trackLine = (gpx) => (Array.isArray(gpx) ? gpx : []).map(pointOf).filter(Boolean);

/** Metres from p to the nearest point of the track's polyline (`d`), and how far along the track
    the walk first comes that close (`alongM`). FIRST, because most recordings are out-and-back:
    the way in and the way out pass the same camp, and the nearest segment can be on the return,
    which would put a camp at 9 miles that is 4.5 miles up the trail. Any segment within
    `ALONG_SLACK_M` of the closest counts as passing it, and the earliest one wins. */
const ALONG_SLACK_M = 60;
export function nearestOnTrack(p, gpx) {
  const line = trackLine(gpx);
  if (!p || line.length < 2) return null;
  const segs = [];
  let run = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const seg = metresBetween(line[i], line[i + 1]);
    const { d, t } = toSegment(p, line[i], line[i + 1]);
    segs.push({ d, alongM: run + t * seg });
    run += seg;
  }
  const d = Math.min(...segs.map((s) => s.d));
  const first = segs.find((s) => s.d <= d + ALONG_SLACK_M);
  return { d, alongM: first.alongM, lengthM: run };
}

export function distanceToTrackM(p, gpx) {
  const n = nearestOnTrack(p, gpx);
  return n ? n.d : Infinity;
}
