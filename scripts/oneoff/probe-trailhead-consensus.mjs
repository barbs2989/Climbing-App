// Can a misplaced trailhead pin be corrected from the catalog's OWN data?
//
// Most remaining waypoint work needs research, because knowing a pin is wrong does not tell you
// where it should be. But trailheads are SHARED: "Heliotrope Ridge Trailhead" is the start of
// four different Colfax/Baker routes, and each route stores its own copy of the coordinate. So
// when several routes name the same trailhead and their pins agree, the outlier is correctable
// WITHOUT inventing anything — the answer is already in the catalog, just on a different row.
//
// This only reports. A cluster is a hypothesis: two routes may legitimately use different
// trailheads that share a name, and a name is not an identity ([[route-name-vs-area-matching]]).
// Nothing is written here.
//
// Read-only. node scripts/oneoff/probe-trailhead-consensus.mjs [--state wa]
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const STATE = (process.argv.find(a => a.startsWith("--state=")) || "--state=wa").split("=")[1];
const key = requireServiceKey();

const R = Math.PI / 180;
function hav(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * R, dLng = (bLng - aLng) * R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * R) * Math.cos(bLat * R) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
}

const rows = await selectAll("routes", "id,name,area_id,waypoints", `id=like.${STATE}_*`,
  { pageSize: 400, key });
if (!rows.length) { console.error("read 0 routes — refusing to report"); process.exit(1); }

/* Normalise the NAME only, never the stored value — the vocabulary is canonicalised at read time
   and rewriting it in the DB has already been shown to be lossy
   ([[waypoint-vocabulary-is-canonicalised-at-read-time]]). This is a grouping key, not a write. */
/* DO NOT DROP THE PARENTHETICAL. The first draft did, and it merged two different trailheads
   that share a name: "Snow Lake Trailhead (Alpental)" at Snoqualmie and "Snow Lake Trailhead" in
   Mount Rainier NP are 78 km apart and both correct. With the qualifier stripped, the Rainier
   group outvoted Chair Peak 5-to-1 and the probe reported the RIGHT pin as the outlier — a
   finding that, acted on, would have moved a correct trailhead 78 km. The parenthetical is
   precisely the disambiguator, so it stays in the key. */
const norm = s => String(s || "").toLowerCase()
  .replace(/[^a-z0-9 ]+/g, " ")
  .replace(/\b(trailhead|th|trail|parking|lot|the)\b/g, " ")
  .replace(/\s+/g, " ").trim();

const groups = new Map();   // normalised name -> [{routeId, wpName, lat, lng}]
let pins = 0;
for (const r of rows) {
  for (const w of (Array.isArray(r.waypoints) ? r.waypoints : [])) {
    if (!w || String(w.type || "").toLowerCase() !== "trailhead") continue;
    if (w.lat == null || w.lng == null || !Number.isFinite(+w.lat) || !Number.isFinite(+w.lng)) continue;
    const k = norm(w.name);
    if (k.length < 4) continue;                    // too generic to identify anything
    pins++;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push({ routeId: r.id, area: r.area_id, wpName: w.name, lat: +w.lat, lng: +w.lng });
  }
}

console.log(`${STATE} routes: ${rows.length} · trailhead pins with coordinates: ${pins}`);
const shared = [...groups.entries()].filter(([, v]) => v.length > 1);
console.log(`distinct trailhead names: ${groups.size} · named by more than one route: ${shared.length}\n`);

/* An outlier is a pin far from the MEDIAN of its own name-group. Median, not mean: with three
   copies and one 12 km out, the mean is dragged toward the error and every pin looks mediocre. */
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const OUTLIER_M = 500;

const findings = [];
for (const [k, v] of shared) {
  const cLat = med(v.map(p => p.lat)), cLng = med(v.map(p => p.lng));
  const withD = v.map(p => ({ ...p, d: Math.round(hav(cLat, cLng, p.lat, p.lng)) }));
  const bad = withD.filter(p => p.d > OUTLIER_M);
  const good = withD.filter(p => p.d <= OUTLIER_M);
  // Need a real majority to call the rest an outlier: 1-vs-1 says only that two rows disagree.
  if (bad.length && good.length >= 2) findings.push({ k, good, bad, cLat, cLng });
}

findings.sort((a, b) => Math.max(...b.bad.map(x => x.d)) - Math.max(...a.bad.map(x => x.d)));
console.log(`-- trailhead names where a MAJORITY agrees and at least one pin does not (${findings.length}) --\n`);
for (const f of findings) {
  console.log(`"${f.bad[0].wpName}"   consensus of ${f.good.length}: ${f.cLat.toFixed(5)},${f.cLng.toFixed(5)}`);
  for (const b of f.bad) console.log(`   OUT  ${String(b.d).padStart(6)} m   ${b.routeId}   @${b.lat.toFixed(5)},${b.lng.toFixed(5)}`);
  for (const g of f.good.slice(0, 3)) console.log(`   ok   ${String(g.d).padStart(6)} m   ${g.routeId}`);
  console.log("");
}
console.log("Nothing was written. Each cluster is a HYPOTHESIS — two routes can legitimately");
console.log("share a trailhead NAME and start in different places. Confirm against the route's");
console.log("own approach prose before moving any pin.");
