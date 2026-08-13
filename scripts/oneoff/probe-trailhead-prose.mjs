// Print the approach prose behind a trailhead pin, for routes probe-trailhead-consensus.mjs
// flagged as outliers.
//
// The consensus probe finds pins a majority disagrees with; it CANNOT say which side is right,
// and the majority has been wrong three times already (the Alpental/Rainier "Snow Lake" pair,
// Esmeralda, and Goodell Creek). The route's own prose names the trailhead it actually starts
// from, so it is the deciding evidence — and unlike the gpx track it was written by a pass that
// did not read the waypoints ([[probe-trailhead-vs-track-start]] documents that circularity).
//
// Read-only. node scripts/oneoff/probe-trailhead-prose.mjs <route_id> [<route_id> ...]
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const ids = process.argv.slice(2).filter(a => !a.startsWith("--"));
if (!ids.length) { console.error("usage: probe-trailhead-prose.mjs <route_id> ..."); process.exit(1); }
const key = requireServiceKey();

const rows = await selectAll("routes",
  "id,name,area_id,approach,approach_logistics,approach_variants,description,beta,overview,waypoints",
  `id=in.(${ids.join(",")})`, { pageSize: 60, key });
if (!rows.length) { console.error("read 0 routes — refusing to report"); process.exit(1); }

const by = new Map(rows.map(r => [r.id, r]));
for (const id of ids) {
  const r = by.get(id);
  if (!r) { console.log(`### ${id}   NOT FOUND\n`); continue; }
  const th = (r.waypoints || []).find(w => String(w.type || "").toLowerCase() === "trailhead");
  console.log(`### ${id}   "${r.name}"   area=${r.area_id}`);
  console.log(`   pin: ${th ? `"${th.name}" @${th.lat},${th.lng}` : "NO TRAILHEAD PIN"}`);
  for (const f of ["approach", "approach_logistics", "approach_variants", "description", "overview", "beta"]) {
    const v = r[f];
    if (!v) continue;
    const s = (typeof v === "string" ? v : JSON.stringify(v)).replace(/\s+/g, " ");
    console.log(`   ${f}: ${s.slice(0, 460)}`);
  }
  console.log("");
}
