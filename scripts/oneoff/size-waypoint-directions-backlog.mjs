#!/usr/bin/env node
// How many WA routes would `write-waypoint-directions.mjs` ACTUALLY accept? Replicates its
// six gates verbatim, so the answer is the writer's rather than an approximation of it.
//
// Usage: node scripts/oneoff/size-waypoint-directions-backlog.mjs      (read-only)
//
// It exists because three successive estimates of this number were WRONG, each from a
// predicate looser than the writer's — the worst checked only that non-null `distMi` values
// were non-decreasing, so a route with mostly-null distances passed vacuously and the answer
// came out 462 against a true 370.
//
// So it SELF-TESTS against 10 routes whose verdicts come from a real writer run, and refuses
// to print a catalog figure if it disagrees with any of them. That is not ceremony: the
// self-test is what caught `wa_mount_stuart_north_ridge` being counted as writeable when the
// writer refuses it, and it failed rather than producing a plausible number.
//
// TWO THINGS IT CANNOT TELL YOU, both measured:
//   * The gates are GEOMETRIC. A route whose waypoints splice two different approaches but
//     whose coordinates happen to be plausible PASSES — wa_mount_challenger_challenger_glacier
//     sits in the accepted set while its array interleaves the Easy Ridge and Whatcom Pass
//     lines. Treat the figure as the pool to work through, not the number that will succeed.
//   * Prose length is a crude proxy for "is there something to write from".
//
// Reads fail CLOSED: any read that does not succeed after retries aborts the run rather than
// skipping a route, because skipping under-counts, and under-counting reads as "less work
// remains" — the wrong direction to be wrong in.
import { selectAll as _selectAll } from "../lib/supabase-env.mjs";

// The DB is degraded right now (18s on a primary-key lookup) and the documented failure mode
// is that the SAME query passes one run and times out the next depending on cache warmth. So:
// retry with backoff, and PRINT every retry — absorbing a retry silently turns a measurable
// flake into an invisible one. `_selectAll` throws on !res.ok and on a thrown fetch, so a
// read that never succeeds kills the run rather than returning [] — which is the whole point.
// A failed query must never be counted as "this route has no waypoints".
let retries = 0;
async function selectAll(table, sel, filter, opts) {
  let last;
  for (let a = 1; a <= 4; a++) {
    try {
      const r = await _selectAll(table, sel, filter, opts);
      if (a > 1) { retries++; console.log(`    (retry ${a - 1} succeeded for ${filter || table})`); }
      return r;
    } catch (e) {
      last = e;
      if (a < 4) await new Promise((s) => setTimeout(s, 2000 * a));
    }
  }
  throw new Error(`read failed after 4 attempts (${filter || table}): ${last?.message}. ` +
    `REFUSING to report a figure — an incomplete scan under-counts, and under-counting here ` +
    `reads as "less work remains", which is the wrong direction to be wrong in.`);
}

const R = 6371, t = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const dLat = t(b.lat - a.lat), dLng = t(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const RETREAT_KM = 2.0;

// Returns null if the writer would accept, else the gate name that refuses.
function gate(wps) {
  if (!Array.isArray(wps) || wps.length < 2) return "too few waypoints";

  for (let i = 1; i < wps.length; i++) {
    const d = hav(wps[0], wps[i]);
    if (d == null || wps[i].distMi == null) continue;
    const trailKm = Number(wps[i].distMi) * 1.60934;
    if (trailKm > 0 && d > trailKm * 1.10) return "coordinate impossible";
  }

  const marks = wps.map((w) => (w && w.distMi != null ? Number(w.distMi) : null));
  if (marks.filter((m) => m != null).length >= 3) {
    let prev = null;
    for (const m of marks) { if (m == null) continue; if (prev != null && m < prev - 0.001) return "not in travel order"; prev = m; }
  }

  { let prev = null;
    for (let i = 0; i < wps.length; i++) {
      const d = hav(wps[0], wps[i]);
      if (d == null) continue;
      if (prev != null && prev - d > RETREAT_KM) return "backtracks toward the start";
      prev = d;
    } }

  const sumIdx = wps.findIndex((w) => /^(summit|topout)$/i.test(String((w && w.type) || "")));
  if (sumIdx > 0 && wps[0]) {
    const dSum = hav(wps[0], wps[sumIdx]);
    if (dSum != null) for (let i = 1; i < sumIdx; i++) {
      const d = hav(wps[0], wps[i]);
      if (d != null && d > dSum * 1.15) return "point before the summit is beyond it";
    }
  }

  if (wps.findIndex((w) => /^trailhead$/i.test(String((w && w.type) || ""))) > 0) return "trailhead is not first";
  return null;
}

// ── self-test against a real run's verdicts ────────────────────────────────────────────
const TRUTH = {
  wa_mount_bigelow_tribute_to_richard: "accept", wa_mount_baker_coleman_headwall: "accept",
  // Stuart is a REFUSAL. A per-route gate loop reported PASS for it and a re-run of the same
  // writer on the same row reports REFUSE, so one of those runs was wrong and I cannot show
  // which — the two legs written on the strength of that PASS have been backed out. Its
  // waypoint 1 is Stuart Lake Trailhead (north side) while 2-3 are Lake Ingalls and Goat Pass
  // (south side): two approaches in one array, which is why the gate sees 12.1 km of straight
  // line on a leg recorded as 3.5 trail miles.
  wa_mount_stuart_north_ridge: "refuse", wa_mount_walkinshaw_scramble: "accept",
  wa_mix_up_peak_east_face: "accept", wa_mount_spickard_southwest: "accept",
  wa_sherman_peak_baker_route: "refuse", wa_mount_tom_scramble: "refuse",
  wa_mount_fury_east_southeast_glaciers: "refuse", wa_southeast_mox_peak_se_rib: "refuse",
};
let wrong = 0;
console.log("self-test against a real run's verdicts:");
for (const [id, want] of Object.entries(TRUTH)) {
  const [row] = await selectAll("routes", "id,waypoints", `id=eq.${id}`, { pageSize: 5 });
  const g = gate(row?.waypoints);
  const got = g ? "refuse" : "accept";
  if (got !== want) { wrong++; console.log(`  MISMATCH ${id}: want ${want}, got ${got}${g ? ` (${g})` : ""}`); }
}
if (wrong) { console.error(`\nFAILED self-test on ${wrong} route(s) — this probe does not replicate the writer. No catalog figure reported.`); process.exit(1); }
console.log(`  ok — all ${Object.keys(TRUTH).length} verdicts match\n`);

// ── size the catalog ───────────────────────────────────────────────────────────────────
const areas = await selectAll("areas", "id,path", null, { pageSize: 1000 });
const waIds = areas.filter((a) => (a.path || "").includes("washington")).map((a) => a.id);
const rows = [];
for (let i = 0; i < waIds.length; i += 40)
  rows.push(...await selectAll("routes", "id,name,waypoints,approach,approach_logistics,itinerary,pitch_detail",
    `area_id=in.(${waIds.slice(i, i + 40).join(",")})`, { pageSize: 200 }));

const reasons = new Map();
let accept = 0, legs = 0, doneAlready = 0, thinProse = 0;
const ready = [];
for (const r of rows) {
  const wps = r.waypoints;
  if (!Array.isArray(wps) || wps.length < 3) continue;
  const empty = wps.filter((w) => !(w.directions && String(w.directions).trim())).length;
  if (!empty) { doneAlready++; continue; }
  const g = gate(wps);
  if (g) { reasons.set(g, (reasons.get(g) || 0) + 1); continue; }
  const prose = [r.approach, r.approach_logistics && JSON.stringify(r.approach_logistics), r.itinerary,
    Array.isArray(r.pitch_detail) ? r.pitch_detail.map((p) => p?.notes || "").join(" ") : ""].filter(Boolean).join(" ");
  if (prose.length < 400) { thinProse++; continue; }
  accept++; legs += empty;
  ready.push({ id: r.id, wp: wps.length, empty, prose: prose.length });
}

console.log(`WA routes with >=3 waypoints and something still to write:`);
console.log(`  fully written already        : ${doneAlready}`);
for (const [k, v] of [...reasons].sort((a, b) => b[1] - a[1]))
  console.log(`  REFUSED — ${k.padEnd(34)}: ${v}`);
console.log(`  accepted but too little prose: ${thinProse}`);
console.log(`  WRITEABLE NOW                : ${accept}   (${legs} legs)\n`);
ready.sort((a, b) => b.prose - a.prose);
console.log("next 24 by available prose:");
for (const e of ready.slice(0, 24)) console.log(`  ${e.id.padEnd(46)} legs=${String(e.empty).padStart(2)} prose=${e.prose}`);
