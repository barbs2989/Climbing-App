// Do unrelated routes share one byte-identical gpx track?
//
// The Colfax pair is the known instance: both Colfax routes carry the SAME 150-point array,
// and that track starts at Schriebers Meadow (Easton Glacier, SOUTH side of Baker) while every
// prose column on both routes describes Heliotrope Ridge / Coleman (NORTH side). So the
// waypoints sit faithfully on a track that is on the wrong side of a glaciated volcano.
//
// A track shared by two routes on ONE peak is legitimate — two lines up Forbidden share an
// approach. A track shared ACROSS peaks is a copy, and it drags every waypoint on those routes
// off their real line at once. That is the shape worth measuring before doing any per-route
// research, because one bad row can account for many findings.
//
// Read-only. Prints; writes nothing.
import crypto from "node:crypto";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

// `gpx` is a heavy column — 150-point arrays — so a wide page trips the anon role's 3s
// statement_timeout (57014) regardless of how simple the query is. Read under the service key
// (this script only ever SELECTs) and keep the page small: the timeout is per statement, so the
// fix is to ask for less at a time rather than retry the same too-large page.
const rows = await selectAll("routes", "id,name,area_id,gpx,waypoints", "id=like.wa_*",
  { pageSize: 120, key: requireServiceKey() });
if (!rows.length) { console.error("read 0 routes — refusing to report a clean result"); process.exit(1); }
console.log("wa routes read:", rows.length);

const withGpx = rows.filter(r => Array.isArray(r.gpx) && r.gpx.length >= 2);
console.log("with a gpx of >=2 pts:", withGpx.length);

const byHash = new Map();
for (const r of withGpx) {
  const h = crypto.createHash("sha1").update(JSON.stringify(r.gpx)).digest("hex").slice(0, 12);
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(r);
}

const shared = [...byHash.entries()].filter(([, v]) => v.length > 1);
console.log("distinct tracks:", byHash.size, "| tracks used by >1 route:", shared.length);

const families = [];
for (const [h, v] of shared) {
  const areas = [...new Set(v.map(r => r.area_id))];
  if (areas.length > 1) families.push({ h, pts: v[0].gpx.length, areas, routes: v.map(r => r.id) });
}
const routeCount = families.reduce((n, f) => n + f.routes.length, 0);
console.log("tracks shared ACROSS areas:", families.length, "covering", routeCount, "routes\n");

families.sort((a, b) => b.routes.length - a.routes.length);
for (const f of families) {
  console.log(`${f.h}  pts=${f.pts}  areas=${f.areas.length}  routes=${f.routes.length}`);
  console.log(`   areas:  ${f.areas.join(", ")}`);
  console.log(`   routes: ${f.routes.join(", ")}`);
}
