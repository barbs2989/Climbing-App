// RE-MEASURE BEFORE QUOTING. `audit:map-pins` reported "40 pins across 16 WA routes" that the map
// silently drops — but a parallel session has been writing `waypoints` since, and every headline
// count in this catalog has moved when it was re-derived rather than carried forward.
//
// The defect is reader-side, not data-side: `GPXMap` skips a waypoint with no lat/lng without a
// word, so the row renders under the list looking exactly like a placed pin and is absent from the
// map. Filling the coordinates is research (and is the parallel session's lane); saying so on
// screen is not.
//
// It also asks the question that decides how bad each case is: does the route have ANY placed pin?
// A route whose only waypoint is unplaced draws an empty map, which reads as "no waypoints" rather
// than "we have waypoints and cannot place them".
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,area_id,discipline,waypoints,gpx", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read zero routes; a broken scan, not a clean catalog."); process.exit(1); }

/* Mimic the READER, not the column. `normalizeWaypoints` coerces lat/lng and CONTRIBUTED ROWS
   STORE THEM AS STRINGS, so a column test on typeof would report placed pins as unplaced. The map
   requires a finite number after coercion — that is the only test that matches what draws. */
const num = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const placed = (w) => w && num(w.lat) !== null && num(w.lng) !== null;

let pins = 0, routesHit = 0, mapDrawsNothing = 0;
const detail = [];
for (const r of rows) {
  const wps = Array.isArray(r.waypoints) ? r.waypoints.filter(Boolean) : [];
  if (!wps.length) continue;
  const bad = wps.filter((w) => !placed(w));
  if (!bad.length) continue;
  pins += bad.length; routesHit++;
  const anyPlaced = wps.some(placed);
  const hasTrack = Array.isArray(r.gpx) ? r.gpx.length > 1 : false;
  if (!anyPlaced && !hasTrack) mapDrawsNothing++;
  detail.push({ id: r.id, disc: r.discipline, total: wps.length, bad: bad.length, anyPlaced, hasTrack, names: bad.map((w) => `${w.name || "(unnamed)"} [${w.type || "?"}]`) });
}

console.log(`${rows.length} WA routes`);
console.log(`${routesHit} route(s) carry a waypoint the map cannot draw`);
console.log(`${pins} such pin(s) in total`);
console.log(`${mapDrawsNothing} of those routes have NO placed pin AND no track — the map draws nothing at all\n`);

for (const d of detail.sort((a, b) => b.bad - a.bad)) {
  const flag = !d.anyPlaced && !d.hasTrack ? "  <-- MAP DRAWS NOTHING" : "";
  console.log(`  ${d.id.padEnd(50)} [${String(d.disc).padEnd(9)}] ${d.bad}/${d.total} unplaced${flag}`);
  for (const n of d.names) console.log(`        ${n}`);
}

console.log(`\nThe COORDINATES are research and belong to the pin-repair work. What is fixable here is`);
console.log(`that the app presents an unplaced pin identically to a placed one.`);
