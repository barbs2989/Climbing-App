// CARRY THE SKETCHED LINE WITH THE PIN IT WAS DRAWN THROUGH.
//
// audit-stranded-track-vertices.mjs finds routes whose polyline is ALMOST their own waypoints: every
// vertex sits on a pin except one or two, which sit on the position a pin USED to hold. That is the
// collateral of a pin repair — this repo has applied 427 researched coordinates — and it is not
// cosmetic. `trackIsJustTheWaypoints` requires EVERY vertex to be on a pin, so one stranded vertex
// turns the predicate false and the route SILENTLY STOPS SAYING its line is a sketch. A seven-vertex
// line across the North Cascades then poses as a recorded GPS track, with Download GPX beneath it.
//
// The fingerprint is unmistakable once you look: a ROUNDED vertex beside a HIGH-PRECISION pin.
//     wa_tooth_and_claw                  vertex 48.521,-120.644     pin 48.51454,-120.64332
//     wa_whatcom_peak_southwest_route    vertex 48.8561,-121.3825   pin 48.8576357,-121.373549
//
// THE REPAIR INVENTS NOTHING: it moves the vertex onto a coordinate the row already holds, which is
// the "declare a winner, never a coordinate" contract. No latitude or longitude is typed here.
//
// AND THE POST-CONDITION IS EXACT, which is what makes a bulk run safe. Every candidate is applied
// in memory first and `trackIsJustTheWaypoints` — the app's own predicate, imported rather than
// re-implemented — must return TRUE afterwards. A route it does not is refused untouched, so this
// cannot half-repair a line or dress a genuine recording up as a sketch.
import { selectAll, patchRow } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const NEAR_M = 5;          // the predicate's own tolerance
const MAX_VERTICES = 40;   // the predicate's own cap
const MAX_MOVE_M = 3000;   // past this, a vertex is not a stale copy of this pin
const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const pointOf = (p) => {
  if (!p) return null;
  if (Array.isArray(p)) return typeof p[0] === "number" && typeof p[1] === "number" ? { lat: p[0], lng: p[1] } : null;
  return typeof p.lat === "number" && typeof p.lng === "number" ? { lat: p.lat, lng: p.lng } : null;
};
// keep the vertex's stored SHAPE — arrays carry an elevation third element on some rows
const withCoord = (v, p) => Array.isArray(v) ? [p.lat, p.lng, ...v.slice(2)] : { ...v, lat: p.lat, lng: p.lng };

const rows = await selectAll("routes", "id,gpx,waypoints", "", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

const plan = [], refused = [];
for (const r of rows) {
  const gpx = Array.isArray(r.gpx) ? r.gpx : [];
  const line = gpx.map(pointOf);
  const pins = (r.waypoints || []).map((w) => { const p = pointOf(w); return p ? { ...p, name: w.name } : null; })
    .filter(Boolean);
  if (line.filter(Boolean).length < 2 || !pins.length) continue;
  if (trackIsJustTheWaypoints(r.gpx, r.waypoints)) continue;      // already correct
  if (line.length > MAX_VERTICES) continue;                        // a real recording

  const adrift = [];
  line.forEach((v, i) => { if (v && !pins.some((p) => metres(v, p) < NEAR_M)) adrift.push({ i, v }); });
  const orphans = pins.filter((p) => !line.some((v) => v && metres(v, p) < NEAR_M));
  if (!adrift.length || adrift.length > 2) continue;
  if (line.length - adrift.length < 3) continue;

  // one stale vertex per repaired pin, or it is not this defect
  if (adrift.length !== orphans.length) {
    refused.push({ id: r.id, why: `${adrift.length} vertex adrift but ${orphans.length} pin(s) orphaned` });
    continue;
  }
  // Pair each adrift vertex with its nearest orphan. ORDER IS NOT AVAILABLE AS A RULE — measured,
  // 34% of sketched lines do not follow their own waypoint list (an out-and-back sketch reads
  // 0,1,2,2,2), so pairing by position would scramble them. Distance it is, with an ambiguity gate.
  const used = new Set(), pairs = [];
  let bad = null;
  for (const a of adrift) {
    let best = Infinity, bi = -1;
    orphans.forEach((p, j) => { if (used.has(j)) return; const d = metres(a.v, p); if (d < best) { best = d; bi = j; } });
    if (bi < 0) { bad = "no orphan left to pair with"; break; }
    if (best > MAX_MOVE_M) { bad = `nearest orphan is ${Math.round(best)} m away — not a stale copy`; break; }
    used.add(bi); pairs.push({ ...a, pin: orphans[bi], d: best });
  }
  if (bad) { refused.push({ id: r.id, why: bad }); continue; }

  // THE POST-CONDITION IS SATISFIED BY ANY BIJECTION, so with two adrift vertices a WRONG pairing
  // passes the gate while scrambling the drawn line. Require the chosen assignment to beat the
  // alternative by a clear margin; a near-tie is a coin flip and is refused.
  if (pairs.length === 2) {
    const mine = pairs[0].d + pairs[1].d;
    const swapped = metres(pairs[0].v, pairs[1].pin) + metres(pairs[1].v, pairs[0].pin);
    if (!(swapped > mine * 3)) {
      refused.push({ id: r.id, why: `the two pairings are within 3x (${Math.round(mine)} m vs ${Math.round(swapped)} m swapped) — a coin flip` });
      continue;
    }
  }

  // THE EXACT GATE: apply in memory and ask the app's own predicate
  const next = gpx.map((v, i) => {
    const hit = pairs.find((p) => p.i === i);
    return hit ? withCoord(v, hit.pin) : v;
  });
  if (!trackIsJustTheWaypoints(next, r.waypoints)) {
    refused.push({ id: r.id, why: "the predicate is still false after the move — refused untouched" });
    continue;
  }
  plan.push({ id: r.id, next, pairs, verts: line.length });
}

console.log(`${plan.length} route(s) repairable, ${refused.length} refused.\n`);
for (const p of plan) {
  console.log(`  ${p.id}  (${p.verts} vertices)`);
  for (const q of p.pairs) console.log(`      vertex ${q.i} -> pin "${q.pin.name}"  (${Math.round(q.d)} m)`);
}
if (refused.length) {
  console.log(`\n=== refused, reported rather than forced ===`);
  for (const r of refused) console.log(`  ${r.id}: ${r.why}`);
}

const moves = plan.flatMap((p) => p.pairs.map((q) => q.d)).sort((a, b) => a - b);
if (moves.length) {
  const q = (f) => Math.round(moves[Math.floor((moves.length - 1) * f)]);
  console.log(`\nmove distances: p10 ${q(0.1)} m, p50 ${q(0.5)} m, p90 ${q(0.9)} m, max ${Math.round(moves[moves.length - 1])} m`);
}

if (!process.argv.includes("--apply")) { console.log("\ndry run"); process.exit(0); }

let wrote = 0;
for (const p of plan) { await patchRow("routes", p.id, { gpx: p.next }); wrote++; }
console.log(`\nwrote ${wrote} row(s); re-reading to reconcile`);
const back = await selectAll("routes", "id,gpx,waypoints", "", { pageSize: 1000 });
const byId = new Map(back.map((r) => [r.id, r]));
let ok = 0;
for (const p of plan) {
  const r = byId.get(p.id);
  if (r && trackIsJustTheWaypoints(r.gpx, r.waypoints)) ok++;
  else console.log(`   MISMATCH ${p.id} — the predicate is still false`);
}
console.log(`verified ${ok}/${plan.length} now say their line is a sketch`);
process.exitCode = ok === plan.length ? 0 : 1;
