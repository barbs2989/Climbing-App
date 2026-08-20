// The honest form of the road-block question.
//
// "1,371 routes have no road block" counts routes whose only access apparatus is a SHARED,
// area-level `access` blob — 18 distinct blobs across all 1,371, one of them covering 1,128 rows,
// 55% bouldering, 1.1% carrying any approach prose at all. A road block describes the DRIVE TO A
// WALK; those routes describe no walk, so the number is a property of how `access` was imported
// and not a gap. (Same collapse as "research gear for 4,938 routes" turning out to be 13.)
//
// So ask it the other way round, which is the turn that collapsed the gear ask too: of the routes
// that DO describe a walk, how many say nothing about the road? That population is small enough to
// read, and each member is a genuine question a climber would ask the page and not get answered.
//
// Then split it the way this repo splits every backlog: RE-HOMING (the fact is already in the
// row's own prose and just needs moving) versus RESEARCH (it is not in the catalog at all).
//
// Read-only.
import { selectAll } from "../lib/supabase-env.mjs";

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const has = (v) => leaves(v).length > 0;

const rows = await selectAll("routes",
  "id,name,discipline,road,access,approach_logistics,waypoints,approach,beta,overview,dist_km,gain_ft,area_id",
  "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("read 0 routes — broken scan, not a clean catalog"); process.exit(1); }

/* A route "describes a walk" if it carries approach prose, a trailhead pin, or a measured
   approach. Any one of those means the page is already telling a climber to go somewhere on
   foot — and therefore already implies a drive it says nothing about. */
const trailheadPin = (r) => (Array.isArray(r.waypoints) ? r.waypoints : []).some((w) => w && /trailhead/i.test(String(w.type || "")));
const walks = (r) => has(r.approach) || trailheadPin(r) || r.dist_km != null || r.gain_ft != null;
const roadSilent = (r) => !has(r.road) && !has(r.approach_logistics);

const walkers = rows.filter(walks);
const silentWalkers = walkers.filter(roadSilent);

const pct = (n, d) => (d ? `${(100 * n / d).toFixed(1)}%` : "n/a");
console.log(`\n=== routes that describe a WALK but say nothing about the ROAD ===`);
console.log(`${rows.length} WA routes`);
console.log(`  ${walkers.length} describe a walk (approach prose | trailhead pin | dist_km | gain_ft)`);
console.log(`  ${silentWalkers.length} of those carry NO road block and NO approach_logistics  (${pct(silentWalkers.length, walkers.length)})\n`);

/* RE-HOMING vs RESEARCH. A road fact already in the row's own prose is a move; anything else needs
   a source outside the catalog. The needle is deliberately about a NAMED road or a gate, not the
   mere word "road" — "walk the road grade" is not a statement about driving. */
const ROADISH = /\b(?:FS ?R?|FR|NF|USFS)[- ]?\d+\b|\b(?:SR|US|I)[- ]?\d+\b|\bHighway \d+\b|\b[A-Z][a-z]+(?: [A-Z][a-z]+)* (?:Road|Rd|Highway|Hwy)\b/;
const GATEISH = /\bgate(?:d)?\b|\bplowed\b|\bclosed (?:for|in|until|beyond|to vehicles)\b|\bopens? (?:in|by|around|~|about|early|mid|late)\b|\bwashed out\b|\bhigh[- ]clearance\b|\b4wd\b|\bpassenger car\b|\bsno[- ]?park\b|\bNorthwest Forest Pass\b/i;

const proseOf = (r) => [r.approach, r.beta, r.overview].filter((x) => typeof x === "string").join("\n");
const rehome = [], research = [];
for (const r of silentWalkers) {
  const p = proseOf(r);
  const road = ROADISH.exec(p), gate = GATEISH.exec(p);
  if (road || gate) rehome.push({ r, road: road && road[0], gate: gate && gate[0] });
  else research.push(r);
}

console.log(`  ${rehome.length} already state a road fact in their OWN prose  -> RE-HOMING (verifiable, no external source)`);
console.log(`  ${research.length} state nothing about the road anywhere        -> RESEARCH\n`);

console.log(`discipline mix of the ${silentWalkers.length}:`);
const m = {}; for (const r of silentWalkers) m[r.discipline] = (m[r.discipline] || 0) + 1;
for (const [k, n] of Object.entries(m).sort((a, b) => b[1] - a[1])) console.log(`  ${String(k).padEnd(16)} ${n}`);

console.log(`\n--- RE-HOMING candidates (${rehome.length}) ---`);
for (const x of rehome.slice(0, 40)) {
  console.log(`  ${x.r.id.padEnd(48)} [${String(x.r.discipline).padEnd(9)}]  road=${x.road ? `"${x.road}"` : "-"}  gate=${x.gate ? `"${x.gate}"` : "-"}`);
}
if (rehome.length > 40) console.log(`  … ${rehome.length - 40} more`);

console.log(`\n--- RESEARCH candidates (${research.length}) ---`);
for (const r of research.slice(0, 30)) console.log(`  ${r.id.padEnd(48)} [${String(r.discipline).padEnd(9)}]  ${r.area_id}`);
if (research.length > 30) console.log(`  … ${research.length - 30} more`);
