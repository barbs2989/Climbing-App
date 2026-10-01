#!/usr/bin/env node
// check:approach-overlay — when a climb has more than one way in, the PICKED one drives the page,
// and nothing from the other way in leaks under its name.
//
// Why it exists: Mount Shuksan's Southeast Ridge is a summit-pyramid finish reached by the Sulphide
// Glacier or the Fisher Chimneys, and the row could describe only one: its pins, camps and numbers
// were the Sulphide's while its road prose named Lake Ann. lib/approaches.js lays the picked way in
// over the route; RouteDetail computes that overlaid `route` once and every panel reads it.
//
// Two halves:
//   1. BEHAVIOUR — applyApproach() on fixtures: a picked way in replaces EVERY key it owns (an
//      absent camp list is a fact about that way in, not a gap to fill from the other one), keeps
//      the climb's own fields, drops a sibling route's own summit/total times, and changes nothing
//      while the sibling it names has not loaded.
//   2. WIRING — RouteDetail derives `route` from applyApproach, and SuggestFix is handed the STORED
//      row: an edit seeded from the overlay would write the Fisher Chimneys pins into the Southeast
//      Ridge's own waypoints column.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { approachOptions, applyApproach, defaultApproachKey, APPROACH_OWNED_KEYS } from "../lib/approaches.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

// ── 1. behaviour ─────────────────────────────────────────────────────────────────────────────
const route = {
  id: "r", name: "Ridge", gainFt: 6000, distKm: 20, pitches: 3, grade: "5.3",
  waypoints: [{ type: "Trailhead", name: "A TH", lat: 1, lng: 1 }, { type: "Campsite", name: "A camp", lat: 2, lng: 2 }, { type: "Summit", name: "Top", lat: 3, lng: 3 }],
  bivy: [{ name: "A camp" }], gpxPts: [[1, 1], [2, 2]], elevPts: [10, 20], road: { name: "A road" },
  approachLogistics: { trailhead: "A TH", trailheadLat: 1, trailheadLng: 1 },
  timing: { approachTimeHrs: 5, summitTimeHrs: 9 },
  approachVariants: [
    { name: "From A", primary: true },
    { name: "From B", trip: { approachLogistics: { trailhead: "B TH", trailheadLat: 5, trailheadLng: 5 }, gainFt: 7000, distKm: 25, timing: { approachTimeHrs: 7 } } },
    { name: "Snow variant of A" },
  ],
};
const opts = approachOptions(route);
check(opts.length === 2, `picker should offer the linked way in + the stored main one (got ${opts.length})`);
check(opts[0] && opts[0].stored && defaultApproachKey(opts) === opts[0].key, "the default pick must be the stored main way in");
const a = applyApproach(route, opts[0], null);
check(a.gainFt === 6000 && a.waypoints.length === 3, "picking the stored main way in must change nothing");
const b = applyApproach(route, opts[1], null);
check(b.approachLogistics && b.approachLogistics.trailhead === "B TH", "the trailhead must follow the pick");
check(b.gainFt === 7000 && b.distKm === 25, "the picked way in's numbers must replace the stored ones");
check(b.waypoints.length === 2 && b.waypoints[0].name === "B TH" && /summit/i.test(b.waypoints[1].type), "the map must show B's trailhead + the shared summit, and not A's camp");
check(Array.isArray(b.bivy) && !b.bivy.length && Array.isArray(b.gpxPts) && !b.gpxPts.length, "A's camps and track must not render under B");
check(b.road === null && b.lossFt === null, "a key B leaves empty must be empty, not A's");
const bs = applyApproach({ ...route, dist_km: 7.7, gain_ft: 6000 }, approachOptions(route)[1], null);
check(bs.dist_km === 25 && bs.gain_ft === 7000, "the raw dist_km/gain_ft spellings must follow the pick too — lib/outing.js reads dist_km when distKm is null");
const bn = applyApproach({ ...route, dist_km: 7.7, approachVariants: [route.approachVariants[0], { name: "B", trip: { approachLogistics: { trailhead: "B" } } }] }, { key: "b", index: 1, variant: { name: "B", trip: { approachLogistics: { trailhead: "B" } } } }, null);
check(bn.dist_km === null && bn.distKm === null, "a way in with no distance must not show the stored one through dist_km");
check(b.timing.approachTimeHrs === 7 && b.timing.summitTimeHrs === 9, "approach hours follow B; the climb's own time stays");
check(b.pitches === 3 && b.grade === "5.3", "the climb itself must be untouched");
for (const k of APPROACH_OWNED_KEYS) check(k in b, `owned key ${k} must be set (to a value or empty) by every linked pick`);
const rc = { ...route, bivy: [{ name: "A camp" }, { name: "B camp" }, { name: "Shared camp" }], approachVariants: [{ name: "From A", primary: true, camps: ["A camp", "Shared camp"] }, route.approachVariants[1]] };
const ac = applyApproach(rc, approachOptions(rc)[0], null);
check(ac.bivy.map((c) => c.name).join() === "A camp,Shared camp", "the stored way in must show only the camps it names — not the other way in's");
const so = approachOptions({ approachVariants: [{ name: "Most used", primary: true, trip: { approachLogistics: { trailhead: "P" } } }, { name: "Row's own", storedRow: true }, { name: "Card only" }] });
check(so.length === 2 && so.find((o) => o.stored) && so.find((o) => o.stored).variant.name === "Row's own", "storedRow must name the way in whose data the row holds, even when another is primary");
check(defaultApproachKey(so) === so.find((o) => !o.stored).key, "the page must still open on the most-used way in");
check(approachOptions({ approachVariants: [{ name: "x" }, { name: "y" }] }).length === 0, "prose-only ways in must get no picker — it would change nothing");
const sib = { name: "Sib", gainFt: 5100, waypoints: [{ type: "Trailhead", name: "S TH", lat: 9, lng: 9 }], timing: { approachTimeHrs: 7.5, summitTimeHrs: 14.5, totalHrs: 22 } };
const rv = { ...route, approachVariants: [{ name: "via Sib", viaRouteId: "sib" }] };
const vo = approachOptions(rv)[0];
const c = applyApproach(rv, vo, sib);
const sibMulti = { ...sib, bivy: [{ name: "Sib north camp" }, { name: "Sib south camp" }], approachVariants: [{ name: "North", primary: true, camps: ["Sib north camp"] }, { name: "South", trip: { approachLogistics: { trailhead: "S2" } } }] };
const cv = applyApproach(rv, vo, sibMulti);
check(cv.bivy.map((c) => c.name).join() === "Sib north camp", "a linked route lends only the way in its own page opens on — not its other way in's camps");
check(c.gainFt === 5100 && c.waypoints[0].name === "S TH", "a via route must supply the way in");
check(c.timing.summitTimeHrs === undefined && c.timing.totalHrs === undefined && c.timing.approachTimeHrs === 7.5, "a via route's own summit/total times time ITS finish and must be dropped");
check(applyApproach(rv, vo, null) === rv, "with the via route not loaded nothing may be half-applied");

// ── 2. wiring ────────────────────────────────────────────────────────────────────────────────
const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
check(/function RouteDetail\(\{route:routeRow,/.test(rd), "RouteDetail must receive the stored row as `routeRow`");
check(/const route=useMemo\(function\(\)\{return applyApproach\(routeRow,/.test(rd), "RouteDetail's `route` must be the applyApproach overlay");
const sf = rd.match(/<SuggestFix route=\{(\w+)\}/g) || [];
check(sf.length >= 1 && sf.every((m) => m === "<SuggestFix route={routeRow}"), `SuggestFix must be handed the STORED row (found ${sf.join(", ") || "no mount"})`);
check(/<ApproachPicker /.test(rd), "the approach picker must be mounted");

if (fails.length) {
  console.error(`check:approach-overlay FAILED — ${fails.length}:\n` + fails.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log(`check:approach-overlay: ok — ${APPROACH_OWNED_KEYS.length} owned keys follow the pick, nothing leaks, SuggestFix edits the stored row`);
