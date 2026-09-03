// DOES THE CAVEAT COME BACK ON SCREEN, OR ONLY IN THE COLUMN?
//
// fix-stranded-track-vertices.mjs gates on `trackIsJustTheWaypoints(r.gpx, r.waypoints)` — the RAW
// columns. RouteDetail renders `trackIsJustTheWaypoints(route.gpxPts, route.waypoints)`, and between
// the two sit `dbRouteToCamel` (which renames gpx -> gpxPts) and `normalizeWaypoints` (which COERCES
// lat/lng and rewrites `type`). Either could change the answer, and then 31 repaired columns would
// reach no screen — the descent_text shape: populated on 1,021 routes and rendered on none.
//
// So this runs the real hydration over the real repaired rows and asks the predicate again.
// It fails closed on a run that hydrated nothing.
import { selectAll } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints, WAYPOINT_LINE_CAVEAT } from "../../lib/track.js";
// lib/db.js uses vite-resolved extensionless imports, so it is bundled rather than imported.
// --define:import.meta.env={} because lib/supabase.js reads it at module scope.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "../..");
const dir = path.join(ROOT, "node_modules", ".probe-caveat");
execFileSync("mkdir", ["-p", dir]);
const entry = path.join(dir, "entry.mjs");
writeFileSync(entry, 'export { dbRouteToCamel } from "' + path.join(ROOT, "lib/db.js") + '";\n');
const out = path.join(dir, "bundle.mjs");
execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node",
  "--define:import.meta.env={}", "--outfile=" + out], { cwd: ROOT, stdio: "pipe" });
const { dbRouteToCamel } = await import(out);

const all = await selectAll("routes", "id,gpx,waypoints", "", { pageSize: 1000 });
if (!all.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

// the population the repair created: raw columns satisfying the predicate
const synth = all.filter((r) => trackIsJustTheWaypoints(r.gpx, r.waypoints));
console.log(`${synth.length} route(s) satisfy the predicate on the RAW columns.`);
if (!synth.length) { console.log("FAIL CLOSED: nothing to check"); process.exit(1); }

// re-read those in full and push them through the app's own hydration
const ids = synth.slice(0, 60).map((r) => r.id);
const full = await selectAll("routes", "*", `id=in.(${ids.join(",")})`, { pageSize: 200 });
if (!full.length) { console.log("FAIL CLOSED: the full re-read returned nothing"); process.exit(1); }

let agree = 0, lost = [];
for (const r of full) {
  let hydrated;
  try { hydrated = dbRouteToCamel(r); } catch (e) { lost.push(`${r.id}: hydration threw — ${e.message}`); continue; }
  if (trackIsJustTheWaypoints(hydrated.gpxPts, hydrated.waypoints)) agree++;
  else lost.push(`${r.id}: true on the column, FALSE after hydration`);
}
console.log(`hydrated ${full.length}; the predicate still holds on ${agree}.`);
if (lost.length) { for (const l of lost.slice(0, 10)) console.log(`   ${l}`); }
console.log(`\ncaveat that will render: "${WAYPOINT_LINE_CAVEAT}"`);
console.log(agree === full.length
  ? "-> the repair reaches the screen: every repaired line still reads as a sketch after hydration."
  : "-> MISMATCH: the column says sketch and the hydrated route does not. The repair reaches no screen.");
process.exitCode = agree === full.length ? 0 : 1;
