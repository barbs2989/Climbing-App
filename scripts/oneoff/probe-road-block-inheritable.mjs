// Is "1,371 routes have no road block" a RESEARCH backlog, or is some of it a COPY?
//
// CLAUDE.md already establishes the principle, in `audit:trailhead-road`: THE UNIT OF TRUTH IS THE
// ROAD, NOT THE ROUTE. A road is either gated or it is not, and that fact cannot vary by which
// climb you picked at the end of it — which is exactly why that audit treats two routes at one
// trailhead disagreeing as a defect.
//
// Run the same principle forwards instead of backwards. If a silent route shares a trailhead with
// routes that DO carry a road block, the fact is already in the catalog and reaching it is a copy,
// not research. That is the same collapse the gear ask took (4,938 routes of "research" turned out
// to be 13 of re-homing), so it has to be measured before anybody starts reading forest-service
// pages.
//
// THE DONORS MUST AGREE. A cluster whose populated routes contradict each other has no single fact
// to copy, and picking one would be inventing a winner — the thing this repo refuses to do in
// `audit:trailhead-road` ("it cannot say which row is right, only that they cannot both be").
// Those clusters are counted separately and excluded.
//
// Read-only. Clusters on the trailhead coordinate at the SAME radius as the audit, so the two
// cannot drift on what "one trailhead" means.
import { selectAll } from "../lib/supabase-env.mjs";

const RADIUS = 500; // metres — same as audit-trailhead-road-agreement.mjs
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const hav = (a, b, c, d) => {
  const R = 6371000, t = Math.PI / 180;
  const dLat = (c - a) * t, dLng = (d - b) * t;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const has = (v) => leaves(v).length > 0;

const rows = await selectAll("routes", "id,name,area_id,road,access,approach_logistics,waypoints", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("read 0 routes — broken scan, not a clean catalog"); process.exit(1); }

/* The population is the one the coverage probe reports: routes carrying access apparatus at all.
   A bare catalog row with none of it is not "missing its road block", it is unresearched — the
   distinction the coverage probe already draws, kept identical here. */
const pts = [];
for (const r of rows) {
  const enriched = has(r.access) || has(r.approach_logistics) || has(r.waypoints);
  if (!enriched) continue;
  const silent = !has(r.road) && !has(r.approach_logistics);
  const al = r.approach_logistics || {};
  let lat = num(al.trailheadLat), lng = num(al.trailheadLng);
  if (lat === null) {
    const w = (Array.isArray(r.waypoints) ? r.waypoints : []).find((w) => w && String(w.type || "").toLowerCase() === "trailhead");
    if (w) { lat = num(w.lat); lng = num(w.lng); }
  }
  pts.push({ id: r.id, name: r.name, area: r.area_id, silent, lat, lng, road: r.road || null });
}

const silentAll = pts.filter((p) => p.silent);
const locatable = pts.filter((p) => p.lat !== null && p.lng !== null);
const silentLocatable = locatable.filter((p) => p.silent);

// --- cluster by trailhead coordinate (single-link greedy, same as the audit) ---------------------
const clusters = [];
for (const p of locatable) {
  const c = clusters.find((c) => c.some((q) => hav(p.lat, p.lng, q.lat, q.lng) <= RADIUS));
  if (c) c.push(p); else clusters.push([p]);
}

/* Do the donors in a cluster agree? Compared on the road block's own rendered fields rather than
   on the whole object — two routes can carry different `driveNote` wording and still be saying the
   same thing about the gate. `status` and `seasonalGate` are what the page prints as
   "status — seasonalGate", so those are the claim. */
const claimOf = (p) => {
  const r = p.road || {};
  const s = [r.status, r.seasonalGate].filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim().toLowerCase());
  return s.length ? s.join(" | ") : null;
};

let inheritable = 0, contested = 0, aloneAtTrailhead = 0;
const examples = [], contestedEx = [];
for (const c of clusters) {
  const donors = c.filter((p) => !p.silent && claimOf(p));
  const takers = c.filter((p) => p.silent);
  if (!takers.length) continue;
  if (!donors.length) { aloneAtTrailhead += takers.length; continue; }
  const claims = new Set(donors.map(claimOf));
  if (claims.size > 1) {
    contested += takers.length;
    if (contestedEx.length < 3) contestedEx.push({ takers: takers.length, claims: [...claims] });
    continue;
  }
  inheritable += takers.length;
  if (examples.length < 8) examples.push({ takers: takers.map((t) => t.id), donor: donors[0].id, claim: [...claims][0], donors: donors.length });
}

const pct = (n, d) => (d ? `${(100 * n / d).toFixed(1)}%` : "n/a");
console.log(`\n=== is the road-block hole a COPY or RESEARCH? ===`);
console.log(`${rows.length} WA routes · ${pts.length} carry access apparatus · ${silentAll.length} of those say nothing about the road\n`);
console.log(`Of those ${silentAll.length} silent routes:`);
console.log(`  ${silentAll.length - silentLocatable.length} have NO trailhead coordinate — cannot be clustered, so cannot inherit (${pct(silentAll.length - silentLocatable.length, silentAll.length)})`);
console.log(`  ${silentLocatable.length} have a trailhead coordinate (${pct(silentLocatable.length, silentAll.length)}), and of those:`);
console.log(`     ${inheritable}  share a trailhead with routes that AGREE about the road  -> COPY, no research  (${pct(inheritable, silentAll.length)} of all silent)`);
console.log(`     ${contested}  share a trailhead with routes that DISAGREE               -> no single fact to copy`);
console.log(`     ${aloneAtTrailhead}  are alone at their trailhead, or no neighbour has a road block -> genuine research`);

console.log(`\nsample inheritable clusters:`);
for (const e of examples) console.log(`   ${e.takers.length} silent <- ${e.donors} donor(s) e.g. ${e.donor}\n      "${e.claim.slice(0, 110)}"`);
if (contestedEx.length) {
  console.log(`\ncontested clusters (NOT inheritable — the audit's whole point):`);
  for (const e of contestedEx) console.log(`   ${e.takers} silent, donors claim: ${e.claims.map((c) => `"${c.slice(0, 60)}"`).join("  VS  ")}`);
}
