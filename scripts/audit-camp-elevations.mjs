// ARE THE CAMP ELEVATIONS ALREADY ON SCREEN CORRECT?
//
// 3,821 bivy sites carry an elevation. Almost all were written by enrichment passes, and NOTHING
// has ever checked them against the ground. `audit:waypoint-elevations` asks this of the waypoint
// store; the bivy store — which is 11x larger and feeds the same panel — has never been asked.
//
// A blank says "unknown" honestly. A wrong number says something false, today, on a screen a
// climber plans a night out from. Filling blanks adds data; this finds data that is already
// there and wrong.
//
// METHOD: locate the camp by name in OSM, bounded to a box around the route's own peak, then read
// the USGS DEM at that coordinate and compare it to what the catalog stores. The name-matching
// gates are IMPORTED from scripts/lib/camp-names.mjs, the same module solve-camp-elevations.mjs
// writes through — a solver and an audit that disagree about "the same place" would either bless
// the solver's mistakes or report correct work as broken.
//
// PROVEN BY CONTROL: probe-camp-elev-control.mjs runs four known heights through this exact path
// and reproduces all four within 68 ft. Without that, "a plausible elevation" — the expected
// output — is indistinguishable from a broken pipeline's.
//
// REPORT-ONLY, and it must stay so. A disagreement says one of the two records is wrong; it does
// not say which. The DEM is the ground at a gazetteer's idea of where the name sits, which is not
// always where the camp is. Read each one.
//
// Read-only, anon key. Fails closed on an empty read, on zero locatable names, and on a gazetteer
// that answers nothing — each of which otherwise prints as a clean catalog.
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first"); // AAAA records on these hosts are unroutable here.
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";
import { elevationAt } from "./lib/terrain.mjs";
import { norm, ident, placeOf, searchCandidates, unresolvable, LINEAR, SUBFEATURE } from "./lib/camp-names.mjs";

const TOL = Number((process.argv.find((a) => a.startsWith("--tol=")) || "--tol=400").split("=")[1]);
const SEVERE = 1000;
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "--limit=9999").split("=")[1]);
const UA = "ClimbMatch-camp-elevation-audit/1.0 (climbing route catalog; contact via repo)";
const H = headers(anonKey());

const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status}) — this is NOT "every elevation is right".`); process.exit(1); }
  return r.json();
};
const rows = await q("routes?select=id,area_id,high_point_ft,bivy&bivy=not.is.null&limit=1000");
if (!rows.length) { console.log("FAIL: read no routes carrying bivy — an empty audit proves nothing"); process.exit(1); }
const areaIds = [...new Set(rows.map((x) => x.area_id).filter(Boolean))];
const areaOf = new Map();
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  for (const a of await q(`areas?select=id,name,lat,lng&id=in.(${chunk})`)) areaOf.set(a.id, a);
}
if (!areaOf.size) { console.log("FAIL: no area coordinates — every search would be unbounded"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const ftOf = (b) => (has(b.elev) ? Number(b.elev) : has(b.elevM) ? Number(b.elevM) * 3.28084 : null);

async function nominatim(name, box) {
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&viewbox=${box.minLng},${box.maxLat},${box.maxLng},${box.minLat}&bounded=1&q=${encodeURIComponent(name)}`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(25000) });
      if (r.ok) return await r.json();
    } catch { /* retried */ }
    await new Promise((s) => setTimeout(s, 1200 * (t + 1)));
  }
  return null;
}

// ---- 1. A CHECK THAT NEEDS NO GAZETTEER AT ALL, so it covers every populated site rather than
//         the sample the OSM half is limited to. A camp cannot be above the summit of the route
//         it serves.
let populated = 0, aboveSummit = 0;
const impossible = [];
for (const r of rows) {
  const hp = has(r.high_point_ft) ? Number(r.high_point_ft) : null;
  for (const b of arr(r.bivy)) {
    const e = ftOf(b);
    if (e == null) continue;
    populated++;
    if (hp != null && e > hp + 200) {
      aboveSummit++;
      // The AREA NAME is what makes this judgeable. A camp above the route's high point is
      // legitimate on a traverse — you sleep on a neighbouring, higher summit — but it is a
      // misassignment when the camp names a different mountain entirely. Only seeing both
      // names together separates those, and no column can.
      const an = (areaOf.get(r.area_id) || {}).name || r.area_id;
      if (impossible.length < 25) impossible.push(`+${String(Math.round(e - hp)).padStart(4)} ft  "${String(b.name || "").slice(0, 42)}" ${Math.round(e)} ft  ON  ${String(an).slice(0, 30)} (${hp} ft)`);
    }
  }
}
console.log(`== ${populated} bivy sites carry an elevation\n`);
console.log(`-- HIGHER THAN THE ROUTE'S OWN HIGH POINT (needs no gazetteer, so this covers ALL of them)`);
console.log(`   ${aboveSummit} site(s), ${((aboveSummit / populated) * 100).toFixed(2)}% — a READING LIST, not a defect count.`);
console.log(`   Measured on the first run: MOST of these are correct data. Two shapes, and only`);
console.log(`   reading the pair of names separates them:`);
console.log(`     - a TRAVERSE camp on a neighbouring, higher summit. "South Twin Sister summit`);
console.log(`       bivies" (6,932 ft) serves North Twin, Little Sister, Skookum and Cinderella`);
console.log(`       because it is the range high point. Correct.`);
console.log(`     - an OVER-BROAD zone assignment: every camp in a corridor handed to every route`);
console.log(`       in it. wa_ellation (5,000 ft) carries "Ruth Mountain summit camp" at 7,100 ft,`);
console.log(`       7 km away. The camp and its elevation are both right; the pairing is noise.`);
console.log(`   NEITHER is a wrong elevation. Do not sweep this list.\n`);
impossible.forEach((x) => console.log(`      ${x}`));

// ---- 2. AGAINST THE GROUND, for every camp the gazetteer can place.
const work = new Map();
for (const r of rows) {
  const area = areaOf.get(r.area_id);
  if (!area || !has(area.lat) || !has(area.lng)) continue;
  for (const b of arr(r.bivy)) {
    const e = ftOf(b);
    if (e == null || !has(b.name)) continue;
    const k = ident(placeOf(b.name));
    if (!k) continue;
    if (!work.has(k)) work.set(k, { display: b.name, elevs: [], rows: 0, lat: Number(area.lat), lng: Number(area.lng), route: r.id });
    const w = work.get(k);
    w.elevs.push(e);
    w.rows++;
  }
}
console.log(`\n-- AGAINST THE GROUND (USGS DEM at the gazetteer's coordinate)`);
console.log(`   ${work.size} distinct populated names; querying those the gazetteer can place\n`);

let checked = 0, agreed = 0, gazetteerNull = 0, unresolved = 0, refusedShape = 0, disagreed = 0;
const findings = [];
let n = 0;
for (const [, w] of [...work.entries()].sort((a, b) => b[1].rows - a[1].rows)) {
  if (n >= LIMIT) break;
  if (unresolvable(w.display)) { unresolved++; continue; }
  n++;
  const d = 0.25;
  const box = { minLat: w.lat - d, maxLat: w.lat + d, minLng: w.lng - d * 1.5, maxLng: w.lng + d * 1.5 };
  let hits = null, used = null;
  for (const cand of searchCandidates(w.display)) {
    hits = await nominatim(cand, box);
    await new Promise((s) => setTimeout(s, 1100));
    if (hits && hits.some((h) => norm(h.name) === norm(cand))) { used = cand; break; }
  }
  if (!used) { gazetteerNull++; continue; }
  const hit = hits.find((h) => norm(h.name) === norm(used));
  const type = String(hit.type || "");
  // The same shape refusals the writer uses: a linear feature has no single height, and a summit's
  // height is not its basin's. Auditing against either would manufacture findings.
  if (LINEAR.has(type) || (/^(peak|mountain|volcano)$/i.test(type) && SUBFEATURE.test(w.display))) { refusedShape++; continue; }
  const ground = await elevationAt(Number(hit.lat), Number(hit.lon));
  if (ground == null) { gazetteerNull++; continue; }
  checked++;
  // Sites sharing a name may legitimately store slightly different values; judge the closest, so
  // a single stale copy does not condemn the group.
  const best = w.elevs.reduce((a, e) => (Math.abs(e - ground) < Math.abs(a - ground) ? e : a), w.elevs[0]);
  const delta = Math.round(best - ground);
  if (Math.abs(delta) <= TOL) { agreed++; continue; }
  disagreed++;
  findings.push({ name: w.display, stored: Math.round(best), ground: Math.round(ground), delta, rows: w.rows, type, osm: hit.display_name });
}

if (!n) { console.log("FAIL: no name was even attempted — the gate vocabulary matches nothing"); process.exit(1); }
if (!checked) { console.log("FAIL: the gazetteer placed nothing at all — this is a broken scan, not a clean catalog"); process.exit(1); }

findings.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
console.log(`   attempted        : ${n}`);
console.log(`   placed & checked : ${checked}`);
console.log(`   AGREE (<= ${TOL} ft): ${agreed} (${Math.round((agreed / checked) * 100)}%)`);
console.log(`   disagree         : ${disagreed}`);
console.log(`   not in gazetteer : ${gazetteerNull}`);
console.log(`   wrong-shape match: ${refusedShape}   <- linear feature or a summit for a sub-feature`);
console.log(`   unresolvable name: ${unresolved}   <- zones, multi-place, purely relative\n`);
if (findings.length) {
  console.log(`   DISAGREEMENTS, worst first — READ THESE, do not sweep them:`);
  findings.forEach((f) => {
    console.log(`      ${(f.delta > 0 ? "+" : "") + f.delta} ft  stored ${f.stored} vs ground ${f.ground}  ${Math.abs(f.delta) >= SEVERE ? "SEVERE  " : "        "}${f.rows} row(s)  "${f.name.slice(0, 44)}"`);
    console.log(`             located as [${f.type}] ${String(f.osm).slice(0, 84)}`);
  });
}
console.log(`\nREPORT-ONLY. A disagreement says ONE of the two records is wrong, never which:`);
console.log(`the DEM reads the ground at a gazetteer's idea of where the name sits, which is not`);
console.log(`always where the camp is. Confirm each before changing anything.`);
