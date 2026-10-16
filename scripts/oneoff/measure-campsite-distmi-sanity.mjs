// One rendered value read "30.5 mi · 98 ft below the trailhead". A 30-mile approach exists in the
// Pasayten and the Pickets, so that is not absurd on its face — but a MILES/KILOMETRES mix-up
// would produce exactly this shape, and routes.dist_km is already documented as holding two
// conventions at once. So: what does the campsite waypoint distance distribution look like, and
// does the route's own dist_km corroborate the outliers?
//
// This is the cheap global check before the plausible story, in both directions.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints,dist_km&waypoints=not.is.null&limit=1000`, { headers: H });
if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const isCamp = (w) => /camp|bivy|bivouac/i.test(String((w && w.type) || ""));

const vals = [];
const kmKeyed = [];
const outliers = [];
for (const row of rows) {
  for (const w of arr(row.waypoints)) {
    if (!isCamp(w)) continue;
    if (has(w.distKm)) kmKeyed.push(Number(w.distKm));
    if (!has(w.distMi)) continue;
    const mi = Number(w.distMi);
    if (!isFinite(mi)) continue;
    vals.push(mi);
    // The route's own one-way distance is an independent record. A camp cannot be further in
    // than the route is long (allowing generous slack for the two being measured differently).
    const routeMi = has(row.dist_km) ? Number(row.dist_km) / 1.60934 : null;
    if (mi > 20 || (routeMi != null && mi > routeMi * 2 + 3)) {
      if (outliers.length < 12) outliers.push(`${String(mi).padStart(6)} mi  ${row.id}  "${String(w.name || "").slice(0, 48)}"  route dist_km ${row.dist_km == null ? "—" : row.dist_km} (${routeMi == null ? "—" : routeMi.toFixed(1)} mi)`);
    }
  }
}
vals.sort((a, b) => a - b);
const pct = (p) => (vals.length ? vals[Math.floor((vals.length - 1) * p)] : 0);
console.log(`== campsite waypoint distMi: ${vals.length} values\n`);
console.log(`   min ${String(pct(0)).padStart(7)} mi`);
console.log(`   p50 ${String(pct(0.5)).padStart(7)} mi`);
console.log(`   p90 ${String(pct(0.9)).padStart(7)} mi`);
console.log(`   p99 ${String(pct(0.99)).padStart(7)} mi`);
console.log(`   max ${String(pct(1)).padStart(7)} mi`);
console.log(`\n   sites ALSO carrying distKm: ${kmKeyed.length}  <- a second spelling; nonzero means two conventions`);
console.log(`\n   over 20 mi, or more than double the route's own one-way distance:`);
if (!outliers.length) console.log("      (none)");
outliers.forEach((o) => console.log(`      ${o}`));
