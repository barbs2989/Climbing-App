#!/usr/bin/env node
// Waypoint coordinate defects that need NO GPX TRACK.
//
// WHY A FOURTH WAYPOINT AUDIT, when CLAUDE.md's own guard-wiring script cites "THREE waypoint audits
// of which two ask the same question with different thresholds" as a cautionary tale.
//
// Because all three ask ONE question — is this pin on the route's own recorded track? — and that
// question is unanswerable for most of the catalog. Only ~580 of 1,012 WA routes with waypoints
// carry a gpx at all, and `trackIsJustTheWaypoints` established that 201 of those tracks ARE the
// waypoint list joined up, so on those the answer is yes BY CONSTRUCTION and means nothing.
//
// This compares pins against EACH OTHER and against the elevations the row already states. It needs
// no track, so it reaches the ~430 routes the track audits structurally cannot, and it cannot be
// satisfied by a synthetic track.
//
//   1. DUPLICATE       a non-trailhead pin on the trailhead's exact coordinate — the feature drawn
//                      at the car. Type decides severity: a Crag or Base at a ROADSIDE cliff is
//                      honest, a Topout or Summit there is not.
//   2. SELF-CONTRADICTING  two pins sharing one coordinate while stating elevations >100 ft apart.
//                      One point cannot be at two heights. This needs no external reference to
//                      CONFIRM, which makes it the cleanest class here — though repairing it still
//                      needs a real coordinate and is therefore not done by this script.
//   3. ORDER           a Summit pin that is not the highest pin on the route.
//   4. ELEVGAP         a pin above the route's own stated high point.
//
// TWO FALSE-POSITIVE CLASSES WERE MEASURED AND EXCLUDED, and both cost more findings than they
// saved:
//   * `high_point_ft = 0` means UNKNOWN in this catalog, not sea level. Comparing against it made
//     every placed pin on such a route "above the high point" — 149 findings, nearly all of them
//     that. The fail-open-coercion trap: a missing value coerced into a number that compares.
//   * A col, a traverse hazard or a bivy CAN sit higher than the summit being climbed. Burgundy Col
//     at 7,950 ft is crossed to reach Vasiliki Tower at 7,663 ft and that is correct. Only a TOPOUT
//     above its own summit is impossible, and a margin under 60 ft is rounding between two records
//     of one feature.
//
// Read-only. Reports; repairs nothing — fixing a pin means supplying a coordinate, and inventing one
// is the failure this whole audit family exists to catch.
//
// --ground ADJUDICATES CATEGORY 2 AGAINST THE TERRAIN, which is the difference between "these two
// pins disagree" and "THIS pin is the wrong one". Category 2 proves a contradiction and is silent on
// which half caused it; sampling the USGS 3DEP elevation at the shared coordinate answers that with
// no research, because whichever stated elevation the ground actually has is the pin that belongs
// there. Opt-in: it needs the network, and this audit is not a build gate.
//
// It answers about half, and the honest half is the half it REFUSES. On a steep wall the DEM reads
// somewhere ON the wall, so a reading between the two stated elevations means neither pin is placed
// and both inherited a crag-level coordinate. Measured on WA: 6 of 13 pairs attributed, 7 where the
// local relief is larger than the disagreement and the ground cannot separate them. Forcing those
// into a winner would manufacture an answer out of noise.
//
// Usage: npm run audit:waypoint-geometry [-- --state wa|all] [-- --selftest] [-- --ground]

import { selectAll, requireServiceKey } from "./lib/supabase-env.mjs";
import { elevationAt, offset } from "./lib/terrain.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
/* `all` is the CATALOG, not a state, and it is the honest default for this audit — see the note by
   the read below. `--state wa` still narrows. */
const STATE = arg("--state", "all");
const SELFTEST = argv.includes("--selftest");
const GROUND = argv.includes("--ground");

const same = (a, b) => Math.abs(+a.lat - +b.lat) < 1e-6 && Math.abs(+a.lng - +b.lng) < 1e-6;
const placed = w => w && w.lat != null && w.lng != null;
const typeOf = w => String(w?.type || "").toLowerCase();
const IMPOSSIBLE_AT_CAR = /topout|summit/;
const ELEV_SAME_POINT_FT = 100;   // two pins on one coordinate may differ by rounding, not by this
const SUMMIT_MARGIN_FT = 60;      // below this, two records of one feature disagree by rounding
const OVER_HIGH_POINT_FT = 200;
/* Which pins CANNOT sit above the route's own high point. A summit, a topout or a base belongs to
   the climb, so one of those above the high point is a contradiction. A landmark, a col, a camp or
   a hazard does not: Columbia Crest is a landmark on a route that finishes on Liberty Cap 294 ft
   lower, and Burgundy Col at 7,950 ft is crossed to reach a 7,663 ft summit. Category 3 already
   carries that reasoning for cols; category 4 did not, and reported both of those as defects. Type
   decides severity here exactly as it does for a pin drawn at the car — nothing is dropped. */
const ON_THE_CLIMB = /summit|topout|base/;
/* A `Summit` pin is very often NOT this route's top. On a crag route or a subsidiary spire the
   PARENT massif's summit gets a Summit-typed pin: Junior's Farm is a 10-pitch trad route on
   Mossness Wall carrying `Summit | Tyler Peak (6364)` beside its own `Topout (4800)`, and
   wa_blood_sport is a sport crag at 3,400 ft carrying `Summit | Guye Peak (5168)`. Measured on WA:
   of the routes carrying BOTH pins, 13 have the summit far above the topout against 31 where the
   two agree — so this is a pattern, not a handful. Where a route has its own topout well below, the
   two records describe different points and NEITHER is necessarily wrong. */
const PARENT_GAP_FT = 200;

/* Adjudication thresholds. Stated before any data was looked at, deliberately: a margin fitted to
   the case it is meant to judge proves nothing, which is the trap audit:map-pins records for its own
   chord test. TIGHT_FT is agreement with a 10 m DEM; DOMINATES is how much closer the winner has to
   be before "closer" means anything. */
const TIGHT_FT = 60;
const DOMINATES = 3;
const MIN_TOL_FT = 120;

/* The analysis, separated from the I/O so --selftest can drive it with constructed rows. */
export function analyse(rows) {
  const out = { duplicate: [], identical: [], order: [], elevgap: [], comparable: 0, uncomparable: [] };
  for (const r of rows) {
    const wps = (r.waypoints || []).filter(placed);
    /* A route with fewer than two placed pins has NOTHING TO COMPARE, so it reports clean whatever
       is wrong with it. Counted rather than skipped in silence: "no findings" over an unstated
       denominator reads as a guarantee, and three of the four routes this audit gained when its id
       filter was widened are exactly this shape. */
    if (wps.length < 2) { out.uncomparable.push(r.id); continue; }
    out.comparable++;

    const th = wps.find(w => /trailhead/.test(typeOf(w)));
    if (th) for (const w of wps) {
      if (w === th || /trailhead/.test(typeOf(w)) || !same(w, th)) continue;
      out.duplicate.push({ id: r.id, pin: `${w.type} | ${w.name}`, impossible: IMPOSSIBLE_AT_CAR.test(typeOf(w)), trailhead: th.name });
    }

    for (let i = 0; i < wps.length; i++) for (let j = i + 1; j < wps.length; j++) {
      const a = wps[i], b = wps[j];
      if (/trailhead/.test(typeOf(a)) || /trailhead/.test(typeOf(b))) continue;
      if (typeOf(a) === typeOf(b) || !same(a, b)) continue;
      const ea = +a.elev, eb = +b.elev;
      const delta = (Number.isFinite(ea) && Number.isFinite(eb)) ? Math.abs(ea - eb) : null;
      out.identical.push({ id: r.id, a: `${a.type} | ${a.name} (${a.elev ?? "-"})`, b: `${b.type} | ${b.name} (${b.elev ?? "-"})`,
        lat: +a.lat, lng: +a.lng, aElev: ea, bElev: eb, aName: a.name, bName: b.name,
        elevDelta: delta, selfContradicting: delta != null && delta > ELEV_SAME_POINT_FT });
    }

    const withElev = wps.filter(w => Number.isFinite(+w.elev));
    const summit = withElev.find(w => /summit/.test(typeOf(w)));
    if (summit && withElev.length > 1) {
      const higher = withElev.filter(w => w !== summit && +w.elev > +summit.elev + SUMMIT_MARGIN_FT);
      if (higher.length) out.order.push({ id: r.id, summit: `${summit.name} (${summit.elev})`,
        topoutAboveSummit: higher.some(w => /topout/.test(typeOf(w))),
        higher: higher.map(w => `${w.type} | ${w.name} (${w.elev})`) });
    }

    if (Number.isFinite(+r.high_point_ft) && +r.high_point_ft > 0) {
      for (const w of withElev) if (+w.elev > +r.high_point_ft + OVER_HIGH_POINT_FT) {
        /* Does this route carry its OWN topout, well below the pin? Then the pin is naming a peak
           the route does not finish on, and neither record is necessarily wrong — see PARENT_GAP_FT. */
        const ownTop = wps.find(x => /topout/.test(typeOf(x)) && Number.isFinite(+x.elev));
        const parentSummit = /summit/.test(typeOf(w)) && ownTop && +w.elev - +ownTop.elev > PARENT_GAP_FT;
        out.elevgap.push({ id: r.id, pin: `${w.type} | ${w.name}`, elev: +w.elev, highPoint: +r.high_point_ft,
          lat: +w.lat, lng: +w.lng, over: +w.elev - +r.high_point_ft, impossible: ON_THE_CLIMB.test(typeOf(w)),
          parentSummit: !!parentSummit, ownTopout: ownTop ? `${ownTop.name} (${+ownTop.elev})` : null });
      }
    }
  }
  return out;
}

/* Which of two pins sharing a coordinate is the one actually placed there, given the ground?
   Pure, so --selftest drives it with constructed elevations and no network.

   `relief` is the spread across a small neighbourhood of DEM samples. It is the tolerance, floored
   at MIN_TOL_FT: tighter than that and a 10 m DEM on steep terrain condemns correct pins, which is
   the direction that turns findings into arguments.

   Two ways to a verdict, and the second exists because the first alone is too blunt. Absolute: one
   pin inside tolerance and the other outside. Comparative: one pin agreeing TIGHTLY while the other
   is DOMINATES times further — on a route where the local relief is large, an off-by-2 against an
   off-by-154 is a real answer that the tolerance test alone swallows whole. */
export function adjudicate(aElev, bElev, ground) {
  if (!ground || !Number.isFinite(ground.at)) return { verdict: "unavailable" };
  const dA = Math.abs(ground.at - aElev), dB = Math.abs(ground.at - bElev);
  const tol = Math.max(MIN_TOL_FT, ground.relief || 0);
  const near = dA <= dB ? "a" : "b", dNear = Math.min(dA, dB), dFar = Math.max(dA, dB);
  const absolute = (dA <= tol) !== (dB <= tol);
  const comparative = dNear <= TIGHT_FT && dFar > DOMINATES * Math.max(dNear, 1);
  if (absolute || comparative) return { verdict: near === "a" ? "a-placed" : "b-placed", dA, dB, tol, by: absolute ? "tolerance" : "dominance" };
  if (dA > tol && dB > tol) return { verdict: "neither", dA, dB, tol };
  return { verdict: "inseparable", dA, dB, tol };
}

/* Constructed rows, no database. The negative cases matter as much as the positives: a detector
   tightened until it fires on correct data turns findings into arguments. */
function selftest() {
  const TH = { type: "Trailhead", name: "TH", lat: 47, lng: -121, elev: 1000 };
  const cases = [
    ["a Topout on the trailhead is impossible", [{ id: "x", waypoints: [TH, { type: "Topout", name: "T", lat: 47, lng: -121, elev: 4000 }] }],
      o => o.duplicate.length === 1 && o.duplicate[0].impossible],
    ["a Crag on the trailhead is a roadside cliff, flagged but NOT impossible", [{ id: "x", waypoints: [TH, { type: "Crag", name: "C", lat: 47, lng: -121, elev: 1000 }] }],
      o => o.duplicate.length === 1 && !o.duplicate[0].impossible],
    ["one coordinate at two heights is self-contradicting", [{ id: "x", waypoints: [{ type: "Base", name: "B", lat: 48, lng: -120, elev: 3000 }, { type: "Summit", name: "S", lat: 48, lng: -120, elev: 4000 }] }],
      o => o.identical.length === 1 && o.identical[0].selfContradicting],
    ["the same point within rounding is NOT flagged as contradicting", [{ id: "x", waypoints: [{ type: "Base", name: "B", lat: 48, lng: -120, elev: 3000 }, { type: "Summit", name: "S", lat: 48, lng: -120, elev: 3050 }] }],
      o => o.identical.length === 1 && !o.identical[0].selfContradicting],
    ["a col higher than the summit is CORRECT and must stay quiet", [{ id: "x", waypoints: [{ type: "Summit", name: "S", lat: 48, lng: -120, elev: 7663 }, { type: "Junction", name: "Col", lat: 48.1, lng: -120.1, elev: 7950 }] }],
      o => o.order.length === 1 && !o.order[0].topoutAboveSummit],
    ["a TOPOUT above its own summit is impossible", [{ id: "x", waypoints: [{ type: "Summit", name: "S", lat: 48, lng: -120, elev: 5406 }, { type: "Topout", name: "T", lat: 48.1, lng: -120.1, elev: 5500 }] }],
      o => o.order.length === 1 && o.order[0].topoutAboveSummit],
    ["high_point_ft = 0 means UNKNOWN and must not compare", [{ id: "x", high_point_ft: 0, waypoints: [{ type: "Summit", name: "S", lat: 48, lng: -120, elev: 7000 }, { type: "Base", name: "B", lat: 48.1, lng: -120.1, elev: 5000 }] }],
      o => o.elevgap.length === 0],
    ["a pin genuinely above a known high point IS flagged", [{ id: "x", high_point_ft: 6785, waypoints: [{ type: "Summit", name: "S", lat: 48, lng: -120, elev: 7330 }, { type: "Base", name: "B", lat: 48.1, lng: -120.1, elev: 5000 }] }],
      o => o.elevgap.length === 1 && o.elevgap[0].impossible],
    ["a LANDMARK above the high point is correct data — flagged, NOT impossible", [{ id: "x", high_point_ft: 14112, waypoints: [{ type: "landmark", name: "Columbia Crest", lat: 46.85, lng: -121.76, elev: 14389 }, { type: "Summit", name: "Liberty Cap", lat: 46.86, lng: -121.77, elev: 14112 }] }],
      o => o.elevgap.length === 1 && !o.elevgap[0].impossible],
    ["a COL above the high point is correct data too", [{ id: "x", high_point_ft: 7663, waypoints: [{ type: "Junction", name: "Burgundy Col", lat: 48.5, lng: -120.6, elev: 7950 }, { type: "Summit", name: "Vasiliki Tower", lat: 48.51, lng: -120.61, elev: 7663 }] }],
      o => o.elevgap.length === 1 && !o.elevgap[0].impossible],
    ["a Summit pin far above the route's OWN topout names the parent peak", [{ id: "x", high_point_ft: 4916, waypoints: [{ type: "Topout", name: "The Full Montey", lat: 47.89, lng: -123.13, elev: 4800 }, { type: "Summit", name: "Tyler Peak", lat: 47.9, lng: -123.14, elev: 6364 }] }],
      o => o.elevgap.length === 1 && o.elevgap[0].parentSummit && o.elevgap[0].ownTopout === "The Full Montey (4800)"],
    ["a route with one placed pin is counted as NOT examined, never as clean", [{ id: "one", waypoints: [{ type: "Summit", name: "S", lat: 48, lng: -120, elev: 7000 }, { type: "Base", name: "B", elev: 5000 }] }],
      o => o.comparable === 0 && o.uncomparable.length === 1 && o.uncomparable[0] === "one"],
    ["a route that really DOES top out on its summit is not called a parent-peak pin", [{ id: "x", high_point_ft: 5000, waypoints: [{ type: "Topout", name: "T", lat: 48, lng: -120, elev: 7300 }, { type: "Summit", name: "S", lat: 48.01, lng: -120.01, elev: 7330 }] }],
      o => o.elevgap.every(e => !e.parentSummit)],
  ];

  /* The ground adjudication, driven with constructed elevations so it needs no network. The two
     REFUSALS are the point: a detector that always names a winner is not measuring anything. */
  const ground = [
    ["the ground names the placed pin when only one agrees", () => adjudicate(5500, 3765, { at: 3914, relief: 547 }).verdict === "b-placed"],
    ["a tight agreement beats a distant one even inside a large relief", () => adjudicate(6200, 6356, { at: 6202, relief: 236 }).verdict === "a-placed"],
    ["...and that verdict is reached by DOMINANCE, not by tolerance", () => adjudicate(6200, 6356, { at: 6202, relief: 236 }).by === "dominance"],
    ["two pins the relief cannot separate REFUSE a verdict", () => adjudicate(4800, 4916, { at: 4885, relief: 135 }).verdict === "inseparable"],
    ["a reading between both pins says NEITHER is placed", () => adjudicate(7900, 8420, { at: 8167, relief: 60 }).verdict === "neither"],
    ["no DEM reading is reported as unavailable, never as a verdict", () => adjudicate(100, 900, null).verdict === "unavailable"],
  ];
  let bad = 0;
  for (const [label, rows, ok] of cases) {
    const pass = ok(analyse(rows));
    if (!pass) bad++;
    console.log(`${pass ? "ok  " : "FAIL"} ${label}`);
  }
  for (const [label, ok] of ground) {
    const pass = ok();
    if (!pass) bad++;
    console.log(`${pass ? "ok  " : "FAIL"} [ground] ${label}`);
  }
  const total = cases.length + ground.length;
  console.log(bad ? `\n${bad} self-test case(s) FAILED` : `\nall ${total} self-test cases pass`);
  process.exit(bad ? 1 : 0);
}

if (SELFTEST) selftest();

/* Ground sampling goes through lib/terrain.mjs's `elevationAt`, NOT a second copy of the EPQS
   client. This repo already pays for what a duplicated numeric helper costs — check:grade-parser
   exists because the same grade arithmetic lived in four scripts and had drifted into three
   behaviours. terrain.mjs is also the one that documents the fail-closed contract: a reading that
   cannot be obtained is null, never 0, because "no evidence" and "sea level" must never be
   confused.

   The sampling PATTERN is this audit's own: the pin plus four neighbours ~30 m out, whose spread is
   the local relief. Without it a single reading cannot be told from a DEM artefact on steep ground,
   and the relief is what the verdict's tolerance is made of. */
async function sampleGround(lat, lng) {
  const vals = [];
  const v0 = await elevationAt(lat, lng);
  if (v0 != null) vals.push(v0);
  for (const b of [0, 90, 180, 270]) {
    const [y, x] = offset(lat, lng, 30, b);
    const v = await elevationAt(y, x);
    if (v != null) vals.push(v);
  }
  if (!vals.length) return null;
  return { at: vals[0], relief: Math.round(Math.max(...vals) - Math.min(...vals)), n: vals.length };
}

const key = requireServiceKey();
/* SCOPED TO THE CATALOG BY DEFAULT, and the reason is a measurement rather than caution: of the
   1,016 routes in the whole catalog that carry waypoints, 1,012 are `wa_` and the other FOUR are the
   legacy ids CLAUDE.md warns about — adams_avalanche_glacier, adams_northwest_ridge,
   rainier_central_mowich_face, rainier_north_mowich_headwall. Outside Washington no route has a
   waypoint at all.
   So `id=like.wa_*` was not a state filter, it was a 4-route blind spot, and the four it dropped are
   Rainier and Adams. Widening costs nothing because the cost is set by the routes that carry pins,
   not by the 205k-row table. */
const filter = STATE === "all" ? "waypoints=not.is.null" : `waypoints=not.is.null&id=like.${STATE}_*`;
const rows = await selectAll("routes", "id,name,area_id,waypoints,high_point_ft", filter, { pageSize: 150, key });
/* Fails closed: an empty or short read makes every route look clean, which is the false-pass
   direction this whole audit family exists to prevent. */
if (rows.length < 100) {
  console.error(`REFUSING — only ${rows.length} routes with waypoints read for state="${STATE}". ` +
    `A short read makes every route look clean; that is a broken scan, not a clean catalog.`);
  process.exit(1);
}

const out = analyse(rows);
const selfC = out.identical.filter(h => h.selfContradicting);
const impossible = out.duplicate.filter(d => d.impossible);

console.log(`${STATE}: ${rows.length} routes with waypoints — ${out.comparable} comparable, ` +
  `${out.uncomparable.length} carrying fewer than 2 placed pins and therefore NOT examined\n`);
console.log(`1 DUPLICATE           non-trailhead pin ON the trailhead   : ${out.duplicate.length}  (${impossible.length} impossible by type — Topout/Summit at the car)`);
console.log(`2 SELF-CONTRADICTING  one coordinate, elevations >${ELEV_SAME_POINT_FT} ft apart: ${selfC.length}  (of ${out.identical.length} sharing a coordinate at all)`);
console.log(`3 ORDER               summit is not the highest pin        : ${out.order.length}  (${out.order.filter(o => o.topoutAboveSummit).length} with a TOPOUT above its own summit)`);
console.log(`4 ELEVGAP             pin above the route's own high point : ${out.elevgap.length}  (${out.elevgap.filter(e => e.impossible).length} impossible by type — a summit/topout/base of the climb itself)`);

if (selfC.length) {
  console.log(`\n--- SELF-CONTRADICTING: one point cannot be at two heights ---`);
  for (const h of selfC.sort((a, b) => b.elevDelta - a.elevDelta)) {
    console.log(`  ${String(h.elevDelta).padStart(5)} ft apart  ${h.id}\n        ${h.a}\n        ${h.b}`);
  }
}
if (GROUND && (selfC.length || out.elevgap.some(e => e.impossible))) {
  console.log(`\n--- GROUND ADJUDICATION (USGS 3DEP): which of the two pins is actually placed there ---`);
  const cache = new Map();
  const tally = {};
  for (const h of selfC) {
    const k = `${h.lat},${h.lng}`;
    if (!cache.has(k)) cache.set(k, await sampleGround(h.lat, h.lng));
    const g = cache.get(k);
    const v = adjudicate(h.aElev, h.bElev, g);
    tally[v.verdict] = (tally[v.verdict] || 0) + 1;
    const say = v.verdict === "a-placed" ? `"${h.aName}" is placed — "${h.bName}" was copied onto it`
      : v.verdict === "b-placed" ? `"${h.bName}" is placed — "${h.aName}" was copied onto it`
      : v.verdict === "neither" ? `NEITHER pin is placed — the coordinate is elsewhere on the feature and both inherited it`
      : v.verdict === "inseparable" ? `the ground CANNOT separate them — both pins sit within the ${v.tol} ft the terrain moves here, so it agrees with either`
      : `no DEM reading`;
    console.log(`  ${h.id}  @ ${h.lat},${h.lng}`);
    const off = d => d == null ? "?" : Math.round(d);
    console.log(`      ground ${g ? `${Math.round(g.at)} ft (relief ${g.relief} ft)` : "unavailable"}   ${h.a} off ${off(v.dA)} | ${h.b} off ${off(v.dB)}`);
    console.log(`      -> ${say}${v.by ? `   [by ${v.by}]` : ""}`);
  }
  console.log(`\n  ${JSON.stringify(tally)}`);
  console.log(`  A refusal is a result: forcing an inseparable pair into a winner manufactures an`);
  console.log(`  answer out of DEM noise, and this audit's whole subject is invented coordinates.`);

  /* Category 4 asks the same question of a different pair: the pin's own elevation against the
     route's stored high point. The pin has a coordinate, so the ground can say which of the two
     records is the wrong one — and those are OPPOSITE repairs. A pin the ground corroborates means
     `high_point_ft` is wrong, which is a scalar somebody can fix; a pin the ground contradicts means
     the pin is, which needs a coordinate nobody has. Only the pins that are impossible by type are
     asked, because a landmark or a col above the high point is correct data and has nothing to
     adjudicate. */
  const climbPins = out.elevgap.filter(e => e.impossible);
  if (climbPins.length) {
    console.log(`\n--- GROUND ADJUDICATION: which record is wrong, the pin or the stored high point? ---`);
    const t2 = {};
    for (const e of climbPins) {
      const k = `${e.lat},${e.lng}`;
      if (!cache.has(k)) cache.set(k, await sampleGround(e.lat, e.lng));
      const g = cache.get(k);
      const v = adjudicate(e.elev, e.highPoint, g);
      /* THE VERDICT IS ABOUT AN ELEVATION, NOT ABOUT MEMBERSHIP. The ground corroborating a pin's
         height does not establish that the pin is on THIS route, and the first version of this
         message said it did — it told the reader `high_point_ft` was the wrong record on rows where
         both records are right and describe different points. Acting on that would corrupt correct
         data, which is the shape check:field-renders already records for its own stale advice. */
      const say = v.verdict === "a-placed"
        ? (e.parentSummit
            ? `the pin's ELEVATION is corroborated, but the route has its own topout at ${e.ownTopout} — so this Summit pin names a peak the route does not finish on, and neither record need be wrong`
            : `the pin's elevation is corroborated by the ground, so the stored high point (${e.highPoint}) is the record to check first`)
        : v.verdict === "b-placed" ? `the ground matches the stored high point instead — the PIN is the record to check first`
        : v.verdict === "neither" ? `NEITHER figure matches the ground here`
        : v.verdict === "inseparable" ? `the ground CANNOT separate them — both sit within the ${v.tol} ft the terrain moves here`
        : `no DEM reading`;
      t2[v.verdict] = (t2[v.verdict] || 0) + 1;
      console.log(`  ${e.id}  ${e.pin}`);
      console.log(`      pin ${e.elev} ft | high_point ${e.highPoint} ft | ground ${g ? Math.round(g.at) + " ft (relief " + g.relief + ")" : "unavailable"}`);
      console.log(`      -> ${say}`);
    }
    console.log(`\n  ${JSON.stringify(t2)}`);
  }
}
if (impossible.length) {
  console.log(`\n--- DRAWN AT THE CAR: a Topout or Summit on the trailhead coordinate ---`);
  for (const h of impossible) console.log(`  ${h.id}  ${h.pin}   (trailhead: ${h.trailhead})`);
}
if (out.order.length) {
  console.log(`\n--- SUMMIT IS NOT THE HIGHEST PIN ---`);
  for (const h of out.order) console.log(`  ${h.id}  ${h.summit}${h.topoutAboveSummit ? "   [TOPOUT ABOVE ITS OWN SUMMIT]" : ""}\n        higher: ${h.higher.join("; ")}`);
}
if (out.elevgap.length) {
  console.log(`\n--- PIN ABOVE THE ROUTE'S OWN HIGH POINT ---`);
  for (const h of out.elevgap) console.log(`  ${h.id}  ${h.pin}  ${h.elev} ft vs high point ${h.highPoint} ft  (+${h.over})` +
    (h.parentSummit ? `   (names the PARENT peak — this route tops out at ${h.ownTopout})`
      : h.impossible ? "   [ON THE CLIMB — cannot be above its own high point]"
      : "   (landmark/col/camp — legitimately can be)"));
}

console.log(`\nReported, never repaired: fixing a pin means supplying a coordinate, and inventing one`);
console.log(`is the defect this audit family exists to catch. Category 2 needs no external reference`);
console.log(`to CONFIRM — the row contradicts itself — but still needs a real coordinate to FIX.`);
