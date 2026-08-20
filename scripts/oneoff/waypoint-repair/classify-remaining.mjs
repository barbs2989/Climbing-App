// WHAT IS ACTUALLY LEFT? Correct scope this time.
//
// My first attempt at this filtered on ">8 decimals" and reported 364 where the untouched population
// is 795 -- it silently dropped the entire RUN class, whose pins were written to 5 decimals from the
// start and are fabricated by interpolation rather than by division. That is the same
// proxy-the-defect-satisfies mistake that made an earlier measurement claim 754 pins repaired
// against ~370 writes. "Still fabricated" means the live coordinate still equals the one
// fab-pins.json recorded, and nothing else.
//
// The point is not a tidy taxonomy. It is to find whether another class is MECHANICALLY solvable the
// way fords turned out to be, before concluding that what is left needs judgement or is unfixable.
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
const ro = headers(anonKey());

const WATER = /\b((?:(?:North|South|East|West|Middle|Upper|Lower)\s+Fork\s+)?(?:[A-Z][a-z']+\s+){1,3}(?:Creek|River))\b/;
const FORDISH = /\b(cross(?:ing)?|ford|footlog|log ?jam|logjam|cablecar|cable car|bridge)\b/i;
// A junction of two NAMED ways is the same computation as a ford: intersect two mapped lines.
const NAMED_TRAIL = /\b((?:[A-Z][A-Za-z'\-]+\s+){0,3}Trail|PCT|Pacific Crest Trail)\b/g;
const JUNCTIONISH = /\bjunction|\bjct\b|\/\s*(?:PCT|[A-Z])/i;
// GNIS-style named point features: the class the gazetteer pass already harvested.
const GNIS_FEATURE = /\b([A-Z][a-z']{2,}(?:\s+[A-Z][a-z']{2,})*)\s+(Lake|Lakes|Pass|Glacier|Basin|Falls|Meadows?|Tarn|Butte|Dome|Spire|Ridge|Peak|Mountain|Creek|River)\b/;
const CAMP = /\b(camp|campsite|bivy|horse camp)\b/i;

const fab = JSON.parse(fs.readFileSync(process.env.WP_DATA_DIR || "./waypoint-repair-data/fab-pins.json", "utf8"));
const ids = [...new Set(fab.map(r => r.id))];
const rows = {};
for (let i = 0; i < ids.length; i += 40) {
  const b = ids.slice(i, i + 40).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${b})`, { headers: ro });
  if (!r.ok) { console.log("FAIL-CLOSED " + r.status); process.exit(1); }
  for (const x of await r.json()) rows[x.id] = x;
}
if (!Object.keys(rows).length) { console.log("FAIL-CLOSED: empty read"); process.exit(1); }

const B = { ford: [], twoNamedWays: [], gnisNamed: [], campNamed: [], descriptive: [] };
let total = 0;
for (const r of fab) {
  const w = (rows[r.id] || {}).waypoints || [];
  for (const p of r.pins) {
    const cur = w[p.i];
    if (!cur || cur.lat == null) continue;
    if (Math.abs(+cur.lat - +p.lat) > 1e-9 || Math.abs(+cur.lng - +p.lng) > 1e-9) continue;  // repaired
    total++;
    const nm = String(cur.name || "");
    const rec = { route: r.id, i: p.i, name: nm, elev: cur.elev };
    const trails = [...new Set((nm.match(NAMED_TRAIL) || []).map(t => t.trim()))];
    if (FORDISH.test(nm) && WATER.test(nm)) B.ford.push(rec);
    else if (trails.length >= 2 || (trails.length >= 1 && JUNCTIONISH.test(nm) && WATER.test(nm))) { rec.ways = trails; B.twoNamedWays.push(rec); }
    else if (CAMP.test(nm) && /\b[A-Z][a-z']{2,}\b/.test(nm.replace(/^(Camp|Bivy)\b/, ""))) B.campNamed.push(rec);
    else if (GNIS_FEATURE.test(nm)) B.gnisNamed.push(rec);
    else B.descriptive.push(rec);
  }
}
console.log(`still fabricated: ${total}\n`);
const pct = n => `${n}  (${(100 * n / total).toFixed(1)}%)`;
console.log(`  A. named watercourse + crossing/ford  -> INTERSECT two mapped lines : ${pct(B.ford.length)}`);
console.log(`  B. two named ways / trail junction    -> INTERSECT two mapped lines : ${pct(B.twoNamedWays.length)}`);
console.log(`  C. named camp                         -> OSM/NPS point lookup       : ${pct(B.campNamed.length)}`);
console.log(`  D. other named feature                -> gazetteer (already swept)  : ${pct(B.gnisNamed.length)}`);
console.log(`  E. purely descriptive                 -> NOT LOCATABLE by any record: ${pct(B.descriptive.length)}`);

console.log(`\n--- B, in full (the candidate second mechanical class) ---`);
for (const x of B.twoNamedWays) console.log(`  ${x.route}[${x.i}]  ${x.name}   ways=${JSON.stringify(x.ways)}`);
console.log(`\n--- C sample ---`);
for (const x of B.campNamed.slice(0, 30)) console.log(`  ${x.name}`);
console.log(`\n--- E sample (what "unfixable" actually looks like) ---`);
for (const x of B.descriptive.slice(0, 30)) console.log(`  ${x.name}`);
fs.writeFileSync(process.env.WP_DATA_DIR || "./waypoint-repair-data/remaining-classes.json", JSON.stringify(B, null, 1));
