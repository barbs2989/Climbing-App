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
// THE POST-CONDITION MEASURES THE REPAIR, NOT THE CAPTION — and it used to delegate to
// `trackIsJustTheWaypoints`, which the widening of that predicate silently made VACUOUS.
//
// The old gate applied each candidate in memory and required the app's predicate to return true
// afterwards. That was exact while the predicate demanded every vertex be on a pin. It is not now:
// the predicate tolerates two stranded vertices on a line long enough for two to be a minority, so
// on exactly the routes this script exists to repair it returns true BEFORE the move as well. A
// post-condition satisfied by doing nothing is not a post-condition.
//
// The same widening silenced audit:stranded-track-vertices, which was fixed by making the caption a
// column rather than a filter. This is that lesson in a second consumer: a caption that FORGIVES a
// defect does not repair it, so what is asserted here is the repair itself —
//
//   * strictly FEWER vertices adrift than before, and
//   * no pin that was on the line before is orphaned after.
//
// Both are independent of how much slack the caption happens to allow, so a future widening cannot
// quietly weaken them. The predicate is still consulted, as a REPORTED column: a route that ends up
// captioned is worth knowing about, and a route that does not is not thereby a failure.
import { selectAll, patchRow } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints, coordinateIsComputed } from "../../lib/track.js";

const NEAR_M = 5;          // the predicate's own tolerance
const MAX_VERTICES = 40;   // the predicate's own cap
const MAX_MOVE_M = 3000;   // past this, a vertex is not a stale copy of this pin
// A PARTIAL PAIR HAS NO ELIMINATION BEHIND IT, so it must stand on its own and the bar is tighter.
//
// In a full pairing the last pair is sound BECAUSE the confident ones forced it — that is the whole
// argument for MAX_MOVE_M being as loose as 3 km. Once a computed vertex is excluded, or an
// unplaceable one stops the loop, the remaining pair is a stand-alone claim with no such support,
// and the only thing behind it is "this pin is nearer than the others".
//
// 500 m is NOT fitted to a wanted answer: it sits in a measured VOID. Across all 17 routes the
// proposed and refused move distances are 26, 85, 2103, 3156, 3546, 4583, 6257, 6257, 6258, 12430,
// 15682 — so a REFINEMENT (a pin re-measured onto its real position) is tens of metres here, a
// REPLACEMENT is kilometres, and 85 to 2,103 is empty. Anything in that gap draws the same line.
//
// It matters on wa_mount_rainier_liberty_ridge, which is why it is here: that vertex would move
// 2,103 m onto the Liberty Cap pin, and its own coordinate (3 decimals, ~111 m of granularity)
// sits about a kilometre from Rainier's MAIN summit — closer to Columbia Crest than to the pin it
// would be dragged to. Carrying it would assert the drawn line ends somewhere its author did not
// put it.
const PARTIAL_MOVE_M = 500;
const CONFIDENT_X = 3;     // an assigned orphan must be this much nearer than any other still free
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
let computedLeft = 0;
for (const r of rows) {
  const gpx = Array.isArray(r.gpx) ? r.gpx : [];
  const line = gpx.map(pointOf);
  const pins = (r.waypoints || []).map((w) => { const p = pointOf(w); return p ? { ...p, name: w.name } : null; })
    .filter(Boolean);
  if (line.filter(Boolean).length < 2 || !pins.length) continue;
  // NOT gated on the predicate. Since lib/track.js gained one vertex of slack, a route with a single
  // stranded vertex SATISFIES trackIsJustTheWaypoints and would be skipped here — but the caveat and
  // the drawn line are different questions. The slack restores the honesty; this restores the
  // ACCURACY, since that vertex is still painted on the map a kilometre from the pin it belongs to.
  // Routes with nothing adrift fall out below anyway.
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

  // A VERTEX THAT WAS COMPUTED IS NOT A STALE COPY OF A PIN, AND MOVING IT INVENTS A SHAPE THE LINE
  // NEVER HAD. This script's premise is that a pin repair left the drawn line behind, so the adrift
  // vertex sits where the pin USED to be. Some do not: they are points interpolated along the line
  // itself, which is the fabrication class audit:synthetic-waypoints already documents for pins.
  //
  // Measured on the six candidates this script proposed before the check existed, THREE were
  // manufactured — wa_mount_despair_east_route and wa_mount_fury_west_west_ridge carry FOURTEEN
  // decimal places and sit 0.00 m off the straight chord between their own neighbours, at fractions
  // of exactly 3/5 and 2/5. And the confidence ratio did NOT catch them: wa_mount_lyall_south_route
  // scored 18.4x. Distance from a pin says nothing about where a point came from.
  //
  // Two tells, either sufficient. The decimal tail is asked through lib/track.js's own exported
  // rule rather than a copy of it. The chord test is the one a PIN test cannot do: a vertex has
  // neighbours in a sequence, and sitting exactly on the line between them is what interpolation
  // produces and what a real recorded or hand-placed point does not.
  const offChord = (i) => {
    const a = line[i - 1], b = line[i + 1], v = line[i];
    if (!a || !b || !v) return Infinity;               // an endpoint has no chord — says nothing
    const k = Math.cos(a.lat * T), R = 6371000 * T;
    const px = (v.lng - a.lng) * k * R, py = (v.lat - a.lat) * R;
    const bx = (b.lng - a.lng) * k * R, by = (b.lat - a.lat) * R;
    const L2 = bx * bx + by * by;
    if (!L2) return Infinity;
    const t = Math.max(0, Math.min(1, (px * bx + py * by) / L2));
    return Math.hypot(px - t * bx, py - t * by);
  };
  const manufactured = adrift.filter((a) => coordinateIsComputed(gpx[a.i]) || offChord(a.i) < 1);
  const pairable = adrift.filter((a) => manufactured.indexOf(a) < 0);
  if (!pairable.length) {
    refused.push({ id: r.id, why: `every adrift vertex (${manufactured.map((a) => a.i).join(",")}) was COMPUTED rather than left behind by a pin repair — nothing here to carry` });
    continue;
  }
  if (manufactured.length) computedLeft += manufactured.length;
  // PAIRING. Order is not available as a rule — measured, 34% of sketched lines do not follow their
  // own waypoint list (an out-and-back sketch reads 0,1,2,2,2) — so this pairs by distance. But
  // GREEDY-IN-LIST-ORDER and an AGGREGATE tie-break were both wrong, and each was wrong on a real
  // route rather than in principle:
  //
  //   wa_tenpeak_mountain_southeast has a vertex 15 m from the summit pin and 380 m from the other
  //   orphan — overwhelming. Greedy took the OTHER vertex first and handed it the summit; the
  //   aggregate test then saw 872 m against 559 m swapped, refused the route, and the assignment it
  //   was defending was the wrong one.
  //
  //   wa_vasiliki_ridge_standard has a vertex 114 m from the pullout against ~1,900 m to the only
  //   alternative — 17x, unarguable. It was refused because the SUM was dominated by the second,
  //   genuinely uncertain pair. An aggregate hides a certain pairing behind an uncertain one.
  //
  // So: take the most CONFIDENT pair first — the one whose vertex is at least CONFIDENT_X nearer to
  // its orphan than to any other still-unassigned orphan — assign it, and repeat. When one vertex
  // and one orphan are left they pair BY ELIMINATION, which is sound precisely because the pairings
  // that forced it were confident. If two or more remain and none is confident, refuse: that is a
  // coin flip, and the exact post-condition below cannot catch it (any bijection satisfies it).
//
// A PARTIAL REPAIR IS THE RIGHT ANSWER, AND ALL-OR-NOTHING WAS REFUSING UNARGUABLE WORK. Every one
// of the 17 remaining routes was refused because ONE of its two vertices could not be placed —
// including wa_andersons_thumb_standard, whose other vertex sits 30 m from Anderson Pass and 34x
// nearer to it than to anything else. Moving a vertex onto a pin it is 30 m from is correct
// whatever happens to the other vertex, and refusing it because a NEIGHBOURING pair is uncertain is
// the aggregate-gate mistake this comment already records, one level up: a gate that fires
// correctly can still prescribe the wrong repair.
//
// So an unplaceable pair now STOPS the pairing rather than condemning the route, and whatever
// confident pairs were already made stand. The route is refused only if NOTHING could be paired.
// The post-condition below is what makes that safe: it asks for strictly fewer adrift vertices and
// no newly-orphaned pin, neither of which requires the route to end up fully repaired.
  const pairs = [];
  let bad = null;
  {
    const vs = pairable.slice(), os = orphans.slice();
    while (vs.length) {
      // ELIMINATION IS ONLY SOUND WHEN ONE ORPHAN IS LEFT. With a computed vertex excluded from
      // pairing there can be FEWER candidates than orphans, and then "the last vertex" has a
      // choice — taking os[0] is an arbitrary pick wearing elimination's clothes. Observed: it
      // proposed wa_mushroom_tower_standard at 1,520 m to the first orphan when the confidence
      // test had correctly refused that route at 2.3x, and it sent wa_inner_constance_standard's
      // vertex to an orphan 6,879 m away while its own pin sat 85 m off.
      // A repair is PARTIAL when a computed vertex was set aside, or when a later pair will be
      // left unplaced. The first is known here; the second is only known at the end, so the
      // post-condition check below re-tests it and drops a pair that turned out unsupported.
      const bar = manufactured.length ? PARTIAL_MOVE_M : MAX_MOVE_M;
      if (vs.length === 1 && os.length === 1) {    // by elimination
        const d = metres(vs[0].v, os[0]);
        if (d > bar) { if (!pairs.length) bad = `the only vertex is ${Math.round(d)} m from its orphan — not a stale copy`; break; }
        pairs.push({ ...vs[0], pin: os[0], d, why: pairs.length ? "elimination" : "only pair" });
        break;
      }
      // most confident (vertex, orphan) among those left
      let best = null;
      for (const a of vs) {
        const ds = os.map((p) => ({ p, d: metres(a.v, p) })).sort((x, y) => x.d - y.d);
        const ratio = ds[1] ? ds[1].d / Math.max(ds[0].d, 1) : Infinity;
        if (!best || ratio > best.ratio) best = { a, p: ds[0].p, d: ds[0].d, ratio };
      }
      if (!best || best.ratio < CONFIDENT_X) {
        if (!pairs.length) bad = `no confident pairing (best is ${best ? best.ratio.toFixed(1) : "?"}x, needs ${CONFIDENT_X}x) — a coin flip`;
        break;
      }
      if (best.d > bar) {
        if (!pairs.length) bad = `nearest orphan is ${Math.round(best.d)} m away — not a stale copy${bar === PARTIAL_MOVE_M ? " (this repair is partial, so the pair has no elimination behind it)" : ""}`;
        break;
      }
      pairs.push({ ...best.a, pin: best.p, d: best.d, why: `${best.ratio.toFixed(1)}x` });
      vs.splice(vs.indexOf(best.a), 1);
      os.splice(os.indexOf(best.p), 1);
    }
  }
  if (bad) { refused.push({ id: r.id, why: bad }); continue; }

  // THE EXACT GATE: apply in memory, then measure the repair rather than asking about the caption.
  const next = gpx.map((v, i) => {
    const hit = pairs.find((p) => p.i === i);
    return hit ? withCoord(v, hit.pin) : v;
  });
  // The loop may have stopped early, which makes this repair partial after the fact. Any pair that
  // only cleared the loose bar loses its elimination support and is dropped rather than forced.
  const stillAdrift = pairable.length - pairs.length + manufactured.length;
  if (stillAdrift > 0) {
    const weak = pairs.filter((q) => q.d > PARTIAL_MOVE_M);
    for (const w of weak) pairs.splice(pairs.indexOf(w), 1);
    if (weak.length && !pairs.length) {
      refused.push({ id: r.id, why: `the only pair moved ${Math.round(weak[0].d)} m with nothing forcing it — a partial repair must be a refinement, not a replacement` });
      continue;
    }
  }
  if (!pairs.length) { refused.push({ id: r.id, why: "no pair survived" }); continue; }

  const nAdrift = (l) => l.map(pointOf).filter(Boolean).filter((v) => !pins.some((q) => metres(v, q) < NEAR_M)).length;
  const nOnLine = (l) => pins.filter((q) => l.map(pointOf).filter(Boolean).some((v) => metres(v, q) < NEAR_M)).length;
  const beforeAdrift = nAdrift(gpx), afterAdrift = nAdrift(next);
  const beforeOn = nOnLine(gpx), afterOn = nOnLine(next);
  if (afterAdrift >= beforeAdrift) {
    refused.push({ id: r.id, why: `the move did not reduce the adrift count (${beforeAdrift} -> ${afterAdrift}) — refused untouched` });
    continue;
  }
  // A vertex carried onto one pin must not be carried OFF another it was already explaining.
  if (afterOn < beforeOn) {
    refused.push({ id: r.id, why: `the move orphaned a pin that was on the line (${beforeOn} -> ${afterOn}) — refused untouched` });
    continue;
  }
  plan.push({ id: r.id, next, pairs, verts: line.length, left: afterAdrift,
    adrift: `${beforeAdrift} -> ${afterAdrift}`,
    captioned: trackIsJustTheWaypoints(next, r.waypoints) });
}

console.log(`${plan.length} route(s) repairable, ${refused.length} refused (${computedLeft} adrift vertex/vertices left in place because they were COMPUTED, not stranded).\n`);
for (const p of plan) {
  console.log(`  ${p.id}  (${p.verts} vertices, adrift ${p.adrift})${p.captioned ? "" : "  [still uncaptioned]"}`);
  for (const q of p.pairs) console.log(`      vertex ${q.i} -> pin "${q.pin.name}"  (${Math.round(q.d)} m, ${q.why})`);
  if (p.left) console.log(`      ${p.left} vertex/vertices left adrift — no confident pin for them, and moving one on a guess is what this script exists not to do`);
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
  // READ BACK THE SAME PROPERTY THE GATE ASSERTED. Re-checking the caption here would have the
  // identical hole: it is already true of these rows, so it would verify a write that never landed.
  const live = r ? (r.gpx || []).map(pointOf).filter(Boolean) : [];
  const pinsNow = r ? (r.waypoints || []).map(pointOf).filter(Boolean) : [];
  const adriftNow = live.filter((v) => !pinsNow.some((q) => metres(v, q) < NEAR_M)).length;
  const want = Number(p.adrift.split(" -> ")[1]);
  if (r && adriftNow === want) ok++;
  else console.log(`   MISMATCH ${p.id} — ${adriftNow} vertices adrift after the write, expected ${want}`);
}
console.log(`verified ${ok}/${plan.length} carry the repaired line`);
process.exitCode = ok === plan.length ? 0 : 1;
