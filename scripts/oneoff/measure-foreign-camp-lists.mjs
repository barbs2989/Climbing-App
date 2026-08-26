// HOW BIG IS THE OVER-BROAD ZONE ASSIGNMENT, REALLY?
//
// audit:camp-route-fit reports 6 pairings, and reading the repair context showed that number is
// an UNDERCOUNT of its own class. Mount Pilchuck (5,324 ft) carries 8 camps and SEVEN belong to
// other mountains — Three Fingers (the Lookout, Tin Can Gap, Goat Flats, Saddle Lake), Whitehorse
// (x2) and Big Four. The audit caught exactly one, because it requires the camp to name a
// distinctive UNIQUE PEAK, and "Tin Can Gap"/"Goat Flats"/"Saddle Lake" name no peak at all.
//
// So: a signal that needs no peak name. For each route, what fraction of its camps are places the
// route's own prose NEVER mentions? A route that describes its approach in 1,600 characters and
// never names the place it supposedly camps at has no evidence for that pairing anywhere in the
// row.
//
// THIS IS A MEASUREMENT, NOT A SHIPPED DETECTOR. The obvious failure is a thinly-written route
// where the prose mentions nothing at all — that is silence about everything, not evidence about
// camping. So the ratio is only reported for routes with real prose, and the count of routes
// EXCLUDED for thin prose is printed beside it.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { distinctiveTokens, placeOf } from "../lib/camp-names.mjs";

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
const rows = await q("routes?select=id,name,area_id,high_point_ft,bivy,overview,approach,beta,climbing_route,approach_logistics&bivy=not.is.null&limit=1000");
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }
const areaIds = [...new Set(rows.map((x) => x.area_id).filter(Boolean))];
const areaOf = new Map();
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  for (const a of await q(`areas?select=id,name&id=in.(${chunk})`)) areaOf.set(a.id, a);
}

const arr = (v) => (Array.isArray(v) ? v : []);
const MIN_PROSE = 600; // below this, silence says nothing about camping.

let considered = 0, thin = 0;
const scored = [];
for (const r of rows) {
  const camps = arr(r.bivy).filter((b) => b && b.name);
  if (camps.length < 3) continue; // a 1-2 camp list has no "mostly foreign" to measure
  const leaves = [];
  const walk = (v) => {
    if (typeof v === "string") leaves.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(r.overview); walk(r.approach); walk(r.beta); walk(r.climbing_route); walk(r.approach_logistics);
  const prose = leaves.join("  ").toLowerCase();
  if (prose.length < MIN_PROSE) { thin++; continue; }
  considered++;
  let foreign = 0;
  const foreignNames = [];
  for (const b of camps) {
    // A camp is "unmentioned" when NONE of its distinctive tokens appear in the route's prose.
    // Distinctive: generic camp and landform words are stripped, so "Goat Flats" tests `goat`
    // and "Whitehorse high camp" tests `whitehorse`.
    const toks = [...distinctiveTokens(placeOf(b.name))];
    if (!toks.length) continue;
    if (!toks.some((t) => prose.includes(t))) { foreign++; foreignNames.push(b.name); }
  }
  scored.push({ id: r.id, name: r.name, area: (areaOf.get(r.area_id) || {}).name, camps: camps.length, foreign, prose: prose.length, foreignNames });
}

scored.sort((a, b) => (b.foreign / b.camps) - (a.foreign / a.camps) || b.camps - a.camps);
const mostly = scored.filter((s) => s.foreign / s.camps >= 0.75 && s.camps >= 4);
console.log(`== ${considered} routes with >=3 camps and >=${MIN_PROSE} chars of prose (${thin} excluded as thin)\n`);
console.log(`   routes where >=75% of the camps are places the route NEVER mentions: ${mostly.length}\n`);

const hist = new Map();
for (const s of scored) {
  const bucket = Math.min(10, Math.round((s.foreign / s.camps) * 10));
  hist.set(bucket, (hist.get(bucket) || 0) + 1);
}
console.log(`   distribution (share of a route's camps unmentioned in its own prose):`);
for (let b = 0; b <= 10; b++) if (hist.get(b)) console.log(`      ${String(b * 10).padStart(3)}%  ${"#".repeat(Math.min(60, hist.get(b)))} ${hist.get(b)}`);

console.log(`\n   worst 15, most-foreign first:`);
mostly.slice(0, 15).forEach((s) => {
  console.log(`\n   ${s.foreign}/${s.camps} unmentioned  ${s.id}  on ${s.area}  (${s.prose} chars of prose)`);
  s.foreignNames.slice(0, 8).forEach((n) => console.log(`        ${String(n).slice(0, 62)}`));
});
console.log(`\n   A HIGH RATIO IS A HYPOTHESIS. A zone file listing a corridor's camping is a`);
console.log(`   deliberate feature, and prose that never names a camp is not proof the camp is`);
console.log(`   wrong. Read the pair before removing anything.`);
