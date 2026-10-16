// 1,763 bivy sites carry no elevation. That is a ROW count, and rows are not the unit of work:
// the same camp is recorded against every route it serves, so "Boston Basin" may be one lookup
// answering twenty rows. Before commissioning any research, ask how many DISTINCT PLACES those
// 1,763 rows actually are — and how many are already answered elsewhere in the catalog.
//
// Three buckets, needing three different actions:
//   FREE      the same name, in the same region, already has an elevation on another route.
//             Re-homing, not research. Verifiable without leaving the database.
//   RESEARCH  a distinct place nothing in the catalog knows the height of.
//   AMBIGUOUS the name exists elsewhere WITH an elevation, but in a different region — the
//             "names are not identities" trap this catalog keeps paying for (two Lena Lakes,
//             two Horseshoe Basins, three Mount Olympuses). Never propagate across these.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
// `path` is an ltree on AREAS, not on routes; routes carry area_id. Two reads, joined here.
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,bivy&bivy=not.is.null&limit=1000`, { headers: H });
if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.log("FAIL: read nothing — an empty measurement proves nothing"); process.exit(1); }

const areaIds = [...new Set(rows.map((x) => x.area_id).filter(Boolean))];
const pathOf = new Map();
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  const ar = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,path&id=in.(${chunk})`, { headers: H });
  if (!ar.ok) { console.log(`FAIL: area read failed (${ar.status})`); process.exit(1); }
  for (const a of await ar.json()) pathOf.set(a.id, a.path);
}
if (!pathOf.size) { console.log("FAIL: read no area paths — every region would collapse to one"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const ft = (b) => (has(b.elev) ? Number(b.elev) : has(b.elevM) ? Number(b.elevM) * 3.28084 : null);
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
// Region = the ltree path trimmed to its sub-region. Deep enough that two same-named places in
// different drainages do not merge, shallow enough that one camp serving a whole basin does.
const region = (p) => String(p || "").split(".").slice(0, 4).join(".");

const known = new Map();   // normalised name -> Map(region -> elevation)
const missing = new Map(); // normalised name -> { display, regions:Set, rows:n }
let totalSites = 0, missingRows = 0;

for (const row of rows) {
  const reg = region(pathOf.get(row.area_id));
  for (const b of arr(row.bivy)) {
    totalSites++;
    const n = norm(b.name);
    if (!n) continue;
    const e = ft(b);
    if (e != null) {
      if (!known.has(n)) known.set(n, new Map());
      known.get(n).set(reg, e);
    } else {
      missingRows++;
      if (!missing.has(n)) missing.set(n, { display: b.name, regions: new Set(), rows: 0 });
      const m = missing.get(n);
      m.regions.add(reg);
      m.rows++;
    }
  }
}

let free = 0, freeRows = 0, ambiguous = 0, ambiguousRows = 0, research = 0, researchRows = 0;
const researchList = [], freeList = [], ambigList = [];
for (const [n, m] of missing) {
  const k = known.get(n);
  const sameRegion = k ? [...m.regions].some((reg) => k.has(reg)) : false;
  if (sameRegion) { free++; freeRows += m.rows; if (freeList.length < 10) freeList.push(`${m.display} (${m.rows} row(s))`); }
  else if (k) { ambiguous++; ambiguousRows += m.rows; if (ambigList.length < 10) ambigList.push(`${m.display} — known elsewhere, DIFFERENT region (${m.rows} row(s))`); }
  else { research++; researchRows += m.rows; researchList.push({ name: m.display, rows: m.rows }); }
}
researchList.sort((a, b) => b.rows - a.rows);

console.log(`== ${totalSites} bivy sites; ${missingRows} carry no elevation\n`);
console.log(`   distinct NAMES behind those ${missingRows} rows: ${missing.size}   <- the real unit of work\n`);
console.log(`   FREE      same name, same region, elevation already known : ${String(free).padStart(4)} name(s), ${freeRows} row(s)`);
console.log(`   AMBIGUOUS known elsewhere but a DIFFERENT region          : ${String(ambiguous).padStart(4)} name(s), ${ambiguousRows} row(s)  <- never propagate`);
console.log(`   RESEARCH  nothing in the catalog knows this place         : ${String(research).padStart(4)} name(s), ${researchRows} row(s)\n`);

if (freeList.length) { console.log(`   free examples:`); freeList.forEach((x) => console.log(`      ${x}`)); console.log(""); }
if (ambigList.length) { console.log(`   ambiguous examples:`); ambigList.forEach((x) => console.log(`      ${x}`)); console.log(""); }
// NOT every entry is a PLACE, and that decides whether an elevation exists to be found at all.
// A dispersed zone ("informal bivouacs above the basins") has no single height; writing one
// invents precision the source cannot carry, which is the same fabrication as a chord posing as
// a trail. A multi-place entry ("Lyman Lakes and Cloudy Pass") has two, and picking one silently
// is worse than leaving it blank.
// These patterns are a SORT, not a verdict — the list is meant to be read. A deny-list detector
// is beaten by one more adjective, so treat the buckets as a reading order.
const ZONE = /\b(dispersed|informal|improvised|bivies|bivouacs|sites|pullouts|zone|ledges|benches|anywhere|various|scattered|numerous|several|wherever|on-wall)\b/i;
const MULTI = /\band\b|,\s*[A-Z]|\u2014|\//;
const bucket = (n) => (ZONE.test(n) ? "ZONE" : MULTI.test(n) ? "MULTI" : "POINT");
for (const x of researchList) x.bucket = bucket(x.name);
const by = (b) => researchList.filter((x) => x.bucket === b);
const rowsOf = (l) => l.reduce((a, x) => a + x.rows, 0);
console.log(`   IS THERE AN ELEVATION TO FIND? (sort, not verdict — read the list)\n`);
for (const b of ["POINT", "MULTI", "ZONE"]) {
  const l = by(b);
  console.log(`   ${b.padEnd(6)} ${String(l.length).padStart(3)} name(s), ${String(rowsOf(l)).padStart(4)} row(s)`);
}
console.log(`\n   POINT — a single named place, one elevation to look up (top 45 by rows):`);
by("POINT").slice(0, 45).forEach((x) => console.log(`      ${String(x.rows).padStart(3)}  ${x.name.slice(0, 76)}`));
console.log(`\n   MULTI — names more than one place; one number would be a silent pick (top 12):`);
by("MULTI").slice(0, 12).forEach((x) => console.log(`      ${String(x.rows).padStart(3)}  ${x.name.slice(0, 76)}`));
console.log(`\n   ZONE — dispersed ground, no single height exists (top 12):`);
by("ZONE").slice(0, 12).forEach((x) => console.log(`      ${String(x.rows).padStart(3)}  ${x.name.slice(0, 76)}`));
