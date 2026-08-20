// POLICY, decided by the user: "trad is alpine when it climbs a peak."
//
// Before changing the gate, measure what the rule actually admits — and what it still excludes,
// because the second half is where a rule like this goes wrong quietly.
//
// The catalog's own record of "is this a peak" is areas.area_type. This file already records that
// area_type is NOT reliable evidence in one direction (Tiffany Mountain is typed a crag and its
// routes are a 6-pitch 5.8, a 5-pitch arete and an ice couloir), so the rule will MISS some real
// peaks. A miss leaves today's behaviour unchanged, which is the safe direction; a false ADMIT
// would put a camping panel on a roadside crag. Report both.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
const rows = await q("routes?select=id,name,discipline,area_id,high_point_ft,gain_ft,pitches,bivy,waypoints&bivy=not.is.null&limit=1000");
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }
const areaIds = [...new Set(rows.map((x) => x.area_id).filter(Boolean))];
const areaOf = new Map();
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  for (const a of await q(`areas?select=id,name,area_type&id=in.(${chunk})`)) areaOf.set(a.id, a);
}
if (!areaOf.size) { console.log("FAIL: no areas — every route would look crag-typed"); process.exit(1); }

const GATED = new Set(["alpine", "mountaineering", "scrambling", "ice", "mixed"]);
const arr = (v) => (Array.isArray(v) ? v : []);
const isCamp = (w) => /camp|bivy|bivouac/i.test(String((w && w.type) || ""));

let excludedToday = 0, admittedByRule = 0, stillExcluded = 0;
const admits = [], misses = [];
const typeCount = new Map();

for (const r of rows) {
  const sites = arr(r.bivy).length + arr(r.waypoints).filter(isCamp).length;
  if (!sites) continue;
  const d = String(r.discipline || "").toLowerCase();
  if (GATED.has(d)) continue;
  excludedToday++;
  const a = areaOf.get(r.area_id) || {};
  const t = String(a.area_type || "(none)");
  typeCount.set(t, (typeCount.get(t) || 0) + 1);
  const line = `${r.id}  ${d}  area "${a.name}" [${t}]  high ${r.high_point_ft} ft  gain ${r.gain_ft}  ${r.pitches}p  ${sites} site(s)`;
  if (t === "peak") { admittedByRule++; admits.push(line); }
  else { stillExcluded++; misses.push(line); }
}

console.log(`== routes carrying camping data whose DISCIPLINE the gate excludes today: ${excludedToday}\n`);
console.log(`   their area types:`);
[...typeCount.entries()].sort((a, b) => b[1] - a[1]).forEach(([t, n]) => console.log(`      ${t.padEnd(12)} ${n}`));
console.log(`\n   ADMITTED by "trad is alpine when it climbs a peak": ${admittedByRule}`);
admits.forEach((l) => console.log(`      ${l}`));
console.log(`\n   STILL EXCLUDED (area not typed 'peak'): ${stillExcluded}`);
misses.forEach((l) => console.log(`      ${l}`));

// The other direction: how much of the catalog could this rule EVER admit? A gate is a promise
// about the whole catalog, not about the row that prompted it.
const all = await q("routes?select=id,discipline,area_id&discipline=in.(trad,sport,bouldering,rock)&limit=1000");
const allAreaIds = [...new Set(all.map((x) => x.area_id).filter(Boolean))];
const t2 = new Map();
for (let i = 0; i < allAreaIds.length; i += 150) {
  const chunk = allAreaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  for (const a of await q(`areas?select=id,area_type&id=in.(${chunk})`)) t2.set(a.id, a.area_type);
}
const onPeak = all.filter((r) => t2.get(r.area_id) === "peak").length;
console.log(`\n== SCOPE OF THE RULE across a 1000-route crag-discipline sample`);
console.log(`   on an area typed 'peak' : ${onPeak} (${Math.round((onPeak / all.length) * 100)}%)`);
console.log(`   -> those become eligible, but the panel still renders only where camping data EXISTS,`);
console.log(`      so nothing appears on a route that has none.`);
