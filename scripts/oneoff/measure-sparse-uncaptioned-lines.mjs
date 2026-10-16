// WHAT ARE THE 66 SPARSE LINES THAT CARRY NO CAVEAT?
//
// measure-track-density-vs-waypoint-identity.mjs found 66 routes whose line has a median vertex
// spacing of 500 m or more and a handful of points — 4 at the median past 1 km. A GPS receiver
// samples on a clock, so that cannot be a recording. None of them says so, because
// `trackIsJustTheWaypoints` asks whether every vertex is a waypoint and these are not.
//
// Before proposing anything, ask what they ARE. Three possibilities, and they want different words:
//   1. a waypoint list with a stranded vertex   -> the existing caveat is exactly right
//   2. a line drawn through SOME of the pins    -> the existing wording is half true
//   3. a line unrelated to the pins             -> it is a sketch, but not "between the waypoints",
//                                                  so the existing sentence would be a false claim
//
// MEASUREMENT ONLY.
import { selectAll } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const pointOf = (p) => {
  if (!p) return null;
  if (Array.isArray(p)) return typeof p[0] === "number" && typeof p[1] === "number" ? { lat: p[0], lng: p[1] } : null;
  return typeof p.lat === "number" && typeof p.lng === "number" ? { lat: p.lat, lng: p.lng } : null;
};
const pct = (xs, f) => xs.length ? xs[Math.min(xs.length - 1, Math.floor(xs.length * f))] : NaN;

const rows = await selectAll("routes", "id,gpx,waypoints", "", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

const buckets = { allPins: [], somePins: [], noPins: [], noPinsAtAll: [] };
let sparse = 0;
for (const r of rows) {
  const line = (r.gpx || []).map(pointOf).filter(Boolean);
  if (line.length < 2) continue;
  if (trackIsJustTheWaypoints(r.gpx, r.waypoints)) continue;
  const gaps = [];
  for (let i = 1; i < line.length; i++) gaps.push(metres(line[i - 1], line[i]));
  gaps.sort((a, b) => a - b);
  if (pct(gaps, 0.5) < 500) continue;                 // dense enough to be a recording
  sparse++;
  const pins = (r.waypoints || []).map(pointOf).filter(Boolean);
  const on = line.filter((v) => pins.some((p) => metres(v, p) < 5)).length;
  const rec = { id: r.id, n: line.length, on, pins: pins.length, p50: Math.round(pct(gaps, 0.5)) };
  if (!pins.length) buckets.noPinsAtAll.push(rec);
  else if (on === line.length) buckets.allPins.push(rec);           // should not happen
  else if (on > 0) buckets.somePins.push(rec);
  else buckets.noPins.push(rec);
}

console.log(`${sparse} line(s) with median vertex spacing >= 500 m and no caveat.\n`);
const show = (k, label) => {
  const g = buckets[k];
  console.log(`${label.padEnd(46)} ${String(g.length).padStart(3)}`);
  for (const t of g.slice(0, 5)) console.log(`      ${t.id}  ${t.n} pts, ${t.on} on a pin, ${t.pins} pins, p50 ${t.p50} m`);
  if (g.length > 5) console.log(`      … ${g.length - 5} more`);
};
show("somePins", "a line through SOME of its own pins");
show("noPins", "no vertex on any pin — unrelated to the pins");
show("noPinsAtAll", "the route has no placed waypoints at all");
show("allPins", "every vertex on a pin (predicate should have caught)");

console.log("\nMEASUREMENT ONLY — nothing written.");
