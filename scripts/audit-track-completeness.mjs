// Does each stored GPX track run trailhead -> summit -> back to the trailhead?
//
// Read-only. Writes research-data/track-completeness-<date>.json and prints a summary.
// Run:
//   node scripts/audit-track-completeness.mjs
//
// The owner's standard (note, 2026-10-25): a track is only complete when it starts at the
// trailhead, reaches the summit, and returns to the trailhead. A one-way track (ends at the
// summit, or stops short of it) is reported, not repaired: removals are owner-reviewed.
//
// Thresholds: 300 m from the trailhead pin for start and end, 300 m from the summit pin for
// the summit. A route with no Trailhead or Summit pin is reported as unmeasurable.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll } from "./lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const END_TOL_M = 300;
const SUMMIT_TOL_M = 300;

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
export function haversineM(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const nearestM = (pts, p) => Math.min(...pts.map((q) => haversineM(q, p)));

export function assessTrack(gpx, waypoints) {
  const pts = gpx.map((p) => [p[0], p[1]]);
  const wps = (waypoints || []).filter((w) => w.lat != null && w.lng != null);
  const th = wps.filter((w) => /trailhead|start|parking/i.test(w.type || "")).map((w) => [w.lat, w.lng]);
  const sm = wps.filter((w) => /summit/i.test(w.type || "")).map((w) => [w.lat, w.lng]);
  const problems = [];
  if (!th.length) problems.push("no trailhead pin");
  else {
    const startM = Math.min(...th.map((t) => haversineM(pts[0], t)));
    const endM = Math.min(...th.map((t) => haversineM(pts.at(-1), t)));
    if (startM > END_TOL_M) problems.push(`track starts ${Math.round(startM)} m from the trailhead`);
    if (endM > END_TOL_M) problems.push(`track ends ${Math.round(endM)} m from the trailhead (one-way)`);
  }
  if (!sm.length) problems.push("no summit pin");
  else {
    const sumM = Math.min(...sm.map((s) => nearestM(pts, s)));
    if (sumM > SUMMIT_TOL_M) problems.push(`track misses the summit by ${Math.round(sumM)} m`);
  }
  return { complete: problems.length === 0, problems };
}

async function main() {
  const rows = (await selectAll("routes", "id,name,gpx,waypoints,discipline", "gpx=not.is.null", { pageSize: 1000 }))
    .filter((r) => Array.isArray(r.gpx) && r.gpx.length > 1);
  const results = rows.map((r) => ({ id: r.id, name: r.name, discipline: r.discipline, ...assessTrack(r.gpx, r.waypoints) }));
  const complete = results.filter((r) => r.complete).length;
  const date = new Date().toISOString().slice(0, 10);
  const out = path.join(ROOT, "research-data", `track-completeness-${date}.json`);
  fs.writeFileSync(out, JSON.stringify({ measuredAt: date, tracks: results.length, complete, incomplete: results.length - complete, routes: results }, null, 1));
  console.log(`tracks ${results.length}  complete ${complete}  incomplete ${results.length - complete}`);
  console.log(`written ${path.relative(ROOT, out)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
