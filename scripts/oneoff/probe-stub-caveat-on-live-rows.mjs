// DOES THE PLACEHOLDER CAVEAT FIRE ON THE ROWS IT WAS WRITTEN FOR, AND ONLY THOSE?
//
// check:track-caveat proves the sentence and the render against a fixture. That is not a statement
// about the catalog: the app reads a route through `dbRouteToCamel`, and a predicate can be correct
// while firing on nothing real — or on far more than intended. This asks the live rows.
//
// Two numbers matter and the second matters more:
//   * how many routes GAIN the caveat  — it should be the five silent stubs, by name
//   * how many LOSE an existing one    — must be zero; a new caption that displaces an old one is a
//     regression wearing an improvement's clothes, and a summary count hides it
//
// Read-only.
import { selectAll } from "../lib/supabase-env.mjs";
import { trackStubCaveat, trackIsJustTheWaypoints, trackCoverage, WAYPOINT_LINE_CAVEAT } from "../../lib/track.js";

const rows = await selectAll("routes", "id,gpx,waypoints", "gpx=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL-CLOSED: read returned nothing — this is not a clean catalog."); process.exit(1); }

const gained = [], both = [];
let sketch = 0, coverage = 0, silent = 0;
for (const r of rows) {
  const isSketch = trackIsJustTheWaypoints(r.gpx, r.waypoints);
  const cov = trackCoverage(r.gpx, r.waypoints);
  const stub = trackStubCaveat(r.gpx, r.waypoints);
  if (isSketch) sketch++;
  if (cov) coverage++;
  if (stub) {
    gained.push({ id: r.id, said: stub });
    // EXCLUSIVITY, ASSERTED RATHER THAN ASSUMED. The predicate refuses when either sibling fires,
    // so any row here carrying two captions means that gate is not doing its job.
    if (isSketch || cov) both.push(r.id);
  }
  if (!isSketch && !cov && !stub) silent++;
}

console.log(`${rows.length} route(s) with a line: ${sketch} captioned as sketches, ${coverage} with a coverage caveat.`);
console.log(`\nGAINED the placeholder caveat: ${gained.length}`);
for (const g of gained) console.log(`   ${g.id}\n      ${g.said}`);
console.log(`\ncarrying TWO captions (must be 0): ${both.length}${both.length ? " — " + both.join(", ") : ""}`);

// A stub that already captions as a sketch is NOT a finding — the line is disclaimed either way,
// and captioning it twice is the thing the exclusivity gate prevents. Reported so the number below
// is not read as coverage this adds.
console.log(`\nroutes still saying nothing about their line at all: ${silent}`);
process.exit(both.length ? 1 : 0);
