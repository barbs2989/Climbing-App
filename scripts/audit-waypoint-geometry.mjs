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
// Usage: npm run audit:waypoint-geometry [-- --state wa] [-- --selftest]

import { selectAll, requireServiceKey } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const STATE = arg("--state", "wa");
const SELFTEST = argv.includes("--selftest");

const same = (a, b) => Math.abs(+a.lat - +b.lat) < 1e-6 && Math.abs(+a.lng - +b.lng) < 1e-6;
const placed = w => w && w.lat != null && w.lng != null;
const typeOf = w => String(w?.type || "").toLowerCase();
const IMPOSSIBLE_AT_CAR = /topout|summit/;
const ELEV_SAME_POINT_FT = 100;   // two pins on one coordinate may differ by rounding, not by this
const SUMMIT_MARGIN_FT = 60;      // below this, two records of one feature disagree by rounding
const OVER_HIGH_POINT_FT = 200;

/* The analysis, separated from the I/O so --selftest can drive it with constructed rows. */
export function analyse(rows) {
  const out = { duplicate: [], identical: [], order: [], elevgap: [] };
  for (const r of rows) {
    const wps = (r.waypoints || []).filter(placed);
    if (wps.length < 2) continue;

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
        out.elevgap.push({ id: r.id, pin: `${w.type} | ${w.name}`, elev: +w.elev, highPoint: +r.high_point_ft, over: +w.elev - +r.high_point_ft });
      }
    }
  }
  return out;
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
      o => o.elevgap.length === 1],
  ];
  let bad = 0;
  for (const [label, rows, ok] of cases) {
    const pass = ok(analyse(rows));
    if (!pass) bad++;
    console.log(`${pass ? "ok  " : "FAIL"} ${label}`);
  }
  console.log(bad ? `\n${bad} self-test case(s) FAILED` : `\nall ${cases.length} self-test cases pass`);
  process.exit(bad ? 1 : 0);
}

if (SELFTEST) selftest();

const key = requireServiceKey();
const rows = await selectAll("routes", "id,name,area_id,waypoints,high_point_ft",
  `waypoints=not.is.null&id=like.${STATE}_*`, { pageSize: 150, key });
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

console.log(`${STATE}: ${rows.length} routes with waypoints\n`);
console.log(`1 DUPLICATE           non-trailhead pin ON the trailhead   : ${out.duplicate.length}  (${impossible.length} impossible by type — Topout/Summit at the car)`);
console.log(`2 SELF-CONTRADICTING  one coordinate, elevations >${ELEV_SAME_POINT_FT} ft apart: ${selfC.length}  (of ${out.identical.length} sharing a coordinate at all)`);
console.log(`3 ORDER               summit is not the highest pin        : ${out.order.length}  (${out.order.filter(o => o.topoutAboveSummit).length} with a TOPOUT above its own summit)`);
console.log(`4 ELEVGAP             pin above the route's own high point : ${out.elevgap.length}`);

if (selfC.length) {
  console.log(`\n--- SELF-CONTRADICTING: one point cannot be at two heights ---`);
  for (const h of selfC.sort((a, b) => b.elevDelta - a.elevDelta)) {
    console.log(`  ${String(h.elevDelta).padStart(5)} ft apart  ${h.id}\n        ${h.a}\n        ${h.b}`);
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
  for (const h of out.elevgap) console.log(`  ${h.id}  ${h.pin}  ${h.elev} ft vs high point ${h.highPoint} ft  (+${h.over})`);
}

console.log(`\nReported, never repaired: fixing a pin means supplying a coordinate, and inventing one`);
console.log(`is the defect this audit family exists to catch. Category 2 needs no external reference`);
console.log(`to CONFIRM — the row contradicts itself — but still needs a real coordinate to FIX.`);
