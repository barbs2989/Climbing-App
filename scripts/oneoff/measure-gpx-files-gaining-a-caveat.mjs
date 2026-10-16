// HOW MANY DOWNLOADED FILES ACTUALLY CHANGE?
//
// check:gpx-caveats proves the writer against a fixture. That is not a statement about the catalog:
// a correct writer can still fire on nothing real. This asks the live rows which of them export a
// file that now carries a caveat, and which carried one on screen but cannot carry one in the file.
//
// It reads `exportedTrackNotes` and `waypointCaveat` — the two things `buildGpx` consults — rather
// than bundling the app, because those decide whether a <desc> is written at all.
//
// Read-only.
import { selectAll } from "../lib/supabase-env.mjs";
import { exportedTrackNotes, waypointCaveat } from "../../lib/track.js";

const rows = await selectAll("routes", "id,gpx,waypoints", "gpx=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL-CLOSED: read returned nothing."); process.exit(1); }

let trackOnly = 0, pinsOnly = 0, both = 0, none = 0;
const kinds = {};
for (const r of rows) {
  const route = { id: r.id, gpxPts: r.gpx, waypoints: r.waypoints };
  const notes = exportedTrackNotes(route);
  const wp = waypointCaveat(r.id, r.waypoints);
  for (const n of notes) {
    const k = /waypoints —/.test(n) ? "waypoint join"
      : /placeholder/.test(n) ? "placeholder"
      : /straight segment/.test(n) ? "too few points"
      : /does not pass any/.test(n) ? "different approach"
      : "partial coverage";
    kinds[k] = (kinds[k] || 0) + 1;
  }
  if (notes.length && wp) both++;
  else if (notes.length) trackOnly++;
  else if (wp) pinsOnly++;
  else none++;
}

console.log(`${rows.length} route(s) carry a drawn line.\n`);
console.log(`  file gains a TRACK description only:      ${trackOnly}`);
console.log(`  file gains a WAYPOINT description only:   ${pinsOnly}`);
console.log(`  file gains both:                          ${both}`);
console.log(`  file unchanged (nothing to disclose):     ${none}`);
console.log(`\n  total downloads that now carry a caveat: ${trackOnly + pinsOnly + both}`);
console.log("\nby kind of track note:");
for (const k of Object.keys(kinds).sort((a, b) => kinds[b] - kinds[a])) console.log(`   ${String(kinds[k]).padStart(4)}  ${k}`);
// AT MOST ONE TRACK NOTE FIRES TODAY — the three predicates are mutually exclusive by construction.
// Asserted rather than assumed, because a file stacking two contradictory sentences is worse than
// one carrying none.
const stacked = rows.filter((r) => exportedTrackNotes({ id: r.id, gpxPts: r.gpx, waypoints: r.waypoints }).length > 1);
console.log(`\nfiles that would carry TWO track sentences (should be 0): ${stacked.length}${stacked.length ? " — " + stacked.slice(0, 5).map((r) => r.id).join(", ") : ""}`);
process.exit(stacked.length ? 1 : 0);
