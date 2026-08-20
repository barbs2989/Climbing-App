#!/usr/bin/env node
// audit:road-coverage — which routes describe a WALK but say nothing about the ROAD to it?
//
// THE NUMBER THIS EXISTS TO REPLACE IS 1,371, AND THAT NUMBER IS NOT WORK. A probe once reported
// "1,371 WA routes carry access apparatus but no road block", which reads as a research backlog.
// Measured, those routes qualify as "carrying access apparatus" only because `access` is
// populated — and `access` is the CRAG-LEVEL land-manager blob, not a per-route record: there are
// 18 distinct blobs across all 1,371 rows, one of them covering 1,128 of them. 55% are bouldering
// problems, 1.1% carry any approach prose at all, and 0.3% carry a dist_km. A road block describes
// THE DRIVE TO A WALK; those routes describe no walk, so the count is a property of how `access`
// was imported and not a gap in the catalog.
//
// Ask it the other way round — of the routes that DO describe a walk, how many say nothing about
// the road? — and it collapses to a readable number. Same turn that collapsed "research gear for
// 4,938 routes" into 13 routes of re-homing. `npm run audit:hazard-redundancy`,
// `audit:waypoint-order` and `audit:terrain` all carry the same warning in the other direction:
// ASK WHAT A COUNT IS A COUNT OF BEFORE TREATING IT AS A BACKLOG.
//
// It splits the findings the way every backlog here gets split:
//   RE-HOMING  — the row's own prose already names a road; the fact is in the catalog.
//   RESEARCH   — nothing in the row says anything about the drive.
// and reports, for each, whether a SIBLING on the same area already carries a researched block,
// because that is what decides whether a repair is a copy or a source hunt.
//
// Report-only and read-only. NOT a build gate — a property of the DB, not the checkout, so no code
// change can cause or fix it; same reasoning as `check:counts`.
import { selectAll } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (kk, d) => { const i = argv.indexOf(kk); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = String(arg("--state", "wa")).toLowerCase();
const LIMIT = Number(arg("--limit", 40));

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const has = (v) => leaves(v).length > 0;

const rows = await selectAll("routes",
  "id,name,discipline,area_id,road,access,approach_logistics,waypoints,approach,beta,overview,dist_km,gain_ft",
  `id=like.${STATE}_*`, { pageSize: 1000 });
// Fail closed: an empty read makes every route look covered, which is the false-pass direction.
if (!rows.length) { console.error(`FAIL — read 0 routes for state "${STATE}". That is a broken query, not a clean catalog.`); process.exit(1); }

/* A route "describes a walk" if it carries approach prose, a trailhead pin, or a measured
   approach. Any one of those means the page already tells a climber to go somewhere on foot, and
   therefore already implies a drive it says nothing about. */
const trailheadPin = (r) => (Array.isArray(r.waypoints) ? r.waypoints : []).some((w) => w && /trailhead/i.test(String(w.type || "")));
const walks = (r) => has(r.approach) || trailheadPin(r) || r.dist_km != null || r.gain_ft != null;
const roadSilent = (r) => !has(r.road) && !has(r.approach_logistics);

/* The needle is a NAMED road or a gate, never the bare word "road" — "walk the old road grade" is
   not a statement about driving, and matching it would report correct rows. Same discipline the
   trailhead-road audit had to learn six times over. */
const ROADISH = /\b(?:FS ?R?|FR|NF|USFS)[- ]?\d+\b|\b(?:SR|US|I)[- ]?\d+\b|\bHighway \d+\b|\b[A-Z][a-z]+(?: [A-Z][a-z]+)* (?:Road|Rd|Highway|Hwy)\b/;
const GATEISH = /\bgate(?:d)?\b|\bplowed\b|\bclosed (?:for|in|until|beyond|to vehicles)\b|\bopens? (?:in|by|around|~|about|early|mid|late)\b|\bwashed out\b|\bhigh[- ]clearance\b|\b4wd\b|\bpassenger car\b|\bsno[- ]?park\b|\bNorthwest Forest Pass\b/i;
const proseOf = (r) => [r.approach, r.beta, r.overview].filter((x) => typeof x === "string").join("\n");

const byArea = {};
for (const r of rows) (byArea[r.area_id] = byArea[r.area_id] || []).push(r);
const donorsFor = (r) => (byArea[r.area_id] || []).filter((s) => s.id !== r.id && (s.road || {}).name);

const walkers = rows.filter(walks);
const findings = [];
for (const r of walkers) {
  if (!roadSilent(r)) continue;
  const p = proseOf(r);
  const road = ROADISH.exec(p), gate = GATEISH.exec(p);
  findings.push({ r, kind: (road || gate) ? "RE-HOMING" : "RESEARCH", token: (road && road[0]) || (gate && gate[0]) || null, donors: donorsFor(r).length });
}

/* Context, printed so nobody re-derives the misleading figure and reads it as work. */
const enriched = rows.filter((r) => has(r.access) || has(r.approach_logistics) || has(r.waypoints));
const bareCount = enriched.filter(roadSilent).length;
const blobs = new Set(enriched.filter((r) => roadSilent(r) && has(r.access)).map((r) => JSON.stringify(r.access)));

const pct = (n, d) => (d ? `${(100 * n / d).toFixed(1)}%` : "n/a");
const rehome = findings.filter((f) => f.kind === "RE-HOMING");
const research = findings.filter((f) => f.kind === "RESEARCH");

console.log(`\n=== routes that describe a WALK but say nothing about the ROAD ===`);
console.log(`${rows.length} ${STATE.toUpperCase()} routes`);
console.log(`  ${walkers.length} describe a walk (approach prose | trailhead pin | dist_km | gain_ft)`);
console.log(`  ${findings.length} of those carry NO road block and NO approach_logistics  (${pct(findings.length, walkers.length)})\n`);
console.log(`  ${rehome.length} name a road in their OWN prose  -> RE-HOMING`);
console.log(`  ${research.length} say nothing about the drive     -> RESEARCH`);
console.log(`  ${findings.filter((f) => f.donors > 0).length} have a sibling on the same area already carrying a researched block`);

for (const bucket of [["RE-HOMING", rehome], ["RESEARCH", research]]) {
  if (!bucket[1].length) continue;
  console.log(`\n--- ${bucket[0]} (${bucket[1].length}) ---`);
  for (const f of bucket[1].slice(0, LIMIT)) {
    console.log(`  ${f.r.id.padEnd(50)} [${String(f.r.discipline).padEnd(9)}] ${String(f.donors).padStart(2)} sibling block(s)${f.token ? `   own prose: "${f.token}"` : ""}`);
  }
  if (bucket[1].length > LIMIT) console.log(`  … ${bucket[1].length - LIMIT} more (raise --limit)`);
}

console.log(`\n--- context: the number this audit exists to REPLACE ---`);
console.log(`${bareCount} routes carry access apparatus and no road block — but that is NOT a backlog.`);
console.log(`They qualify through \`access\` alone, which is a crag-level land-manager blob: ${blobs.size} distinct`);
console.log(`blobs cover all ${bareCount} rows. Mostly boulder and sport rows that describe no walk at all, so`);
console.log(`there is no drive for a road block to describe. Ask what a count is a count OF.`);

console.log(`\nA SIBLING BLOCK IS A DONOR, NOT AN ANSWER. A peak can have two genuine trailheads`);
console.log(`(Lundin, Remmel, Carru, Howard), and a road block can outlive the trailhead it described`);
console.log(`(audit:trailhead-road section 2). Copy one only when the route's OWN prose names the road.`);
console.log(`Report only; nothing was changed.`);
