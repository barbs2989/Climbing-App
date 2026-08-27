// For each route with IMPOSSIBLE waypoint distances, does the route's OTHER trailhead record make
// the arithmetic possible?
//
// audit:waypoint-distances flags a stored trail distance shorter than the straight line between the
// two coordinates — a physical impossibility, certain, with no gpx needed. What it cannot say is
// WHICH half is wrong. Its own header names the signature that decides it: when most pins on a
// route are flagged and the shortfall SHRINKS up the list, one displaced ORIGIN is the cause rather
// than N bad distances.
//
// A route stores its trailhead TWICE — waypoints[] and approach_logistics.trailheadLat/Lng, written
// by different enrichment passes (see audit:trailhead-agreement). So where the origin pin is the
// suspect, the second record is a candidate answer that is already in the row. This measures
// whether substituting it REMOVES the impossibility. That gate is what makes a repair evidence-
// based rather than a guess: no coordinate is invented, and a substitution that does not fix the
// arithmetic is refused.
//
// Read-only. Reports; writes nothing.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const R = 6371.0088;
const toRad = (d) => (d * Math.PI) / 180;
function km(a, b) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const MI = 1.609344;

/* THE ENTRY GATES ARE THE AUDIT'S, COPIED DELIBERATELY, because the first version omitted them
   and was worse than useless — it reported 82 routes and both it called repairable turned out not
   to be findings at all. Mirrored from scripts/audit-waypoint-distances.mjs:
     ABS_MI / REL   both tolerances, not a flat slack: 0.25 mi absolute AND 10% of the stored
                    distance, which is what keeps 0.1 mi rounding from reading as a defect.
     d[0] === 0     distMi is CUMULATIVE from the trailhead, so a row not starting at 0 uses some
                    other convention. Measuring it anyway reports a units mismatch as a coordinate
                    defect — where most of that phantom 82 came from.
     monotonic      a list out of travel order is audit:waypoint-order's subject.
     d[i] === 0     an UNFILLED field, not a zero-mile trail.
     coarse coords  fewer than 4 decimal places is a placeholder, not a position.

   RECONCILED WITH THE AUDIT, after getting the comparison wrong twice — both worth recording,
   because each nearly caused the wrong action.

   FIRST I COMPARED AGAINST ITS PRINTED OUTPUT. The audit ends `findings.slice(0, LIST)` with
   LIST defaulting to 15, so counting the ids it prints measures a DISPLAY CAP. Its real total is
   117 (`--list 200`). I had 44 against "15" and concluded my scan was unsound and nearly
   discarded it. Quote an audit's own total, never the rows it happened to show — the same lesson
   this repo records for the fabricated-pin counts, arrived at from the other direction.

   THEN I BLAMED SCOPE. Matching --state wa moved 43 to 44, so the frame was never the issue.
   The real difference is that the audit makes TWO comparisons and reports whichever contradiction
   is larger: from the trailhead, and per LEG between consecutive pins. This script tests
   from-the-trailhead ONLY, so its 44 is a subset of the audit's 117.

   And that is CORRECT FOR THIS QUESTION rather than a limitation. A displaced ORIGIN can only
   explain a from-the-trailhead contradiction; a leg that is impossible between two upper pins is
   not evidence about waypoint[0] at all, and including it would put routes in front of a repair
   that cannot address them. */
const ABS_MI = 0.25;
const REL = 0.10;
const COORD_DP = 4;
const dp = (n) => { const t = String(n); const i = t.indexOf("."); return i < 0 ? 0 : t.length - i - 1; };
const num = (x) => { const n = Number(x); return Number.isFinite(n) && x !== "" && x !== null ? n : null; };
function coordOf(w) {
  const lat = num(w && w.lat), lng = num(w && w.lng);
  if (lat == null || lng == null) return null;
  if (lat === 0 && lng === 0) return null;
  if (Math.min(dp(lat), dp(lng)) < COORD_DP) return { lat, lng, coarse: true };
  return { lat, lng };
}
const impossible = (straightMi, storedMi) => {
  const short = straightMi - storedMi;
  return short > ABS_MI && short > Math.max(storedMi, 0) * REL;
};

/* SCOPED AND PAGINATED TO MATCH THE AUDIT, so the two counts are comparable. An unscoped
   limit=2000 read gave 43 flagged against the audit's 15, and the whole difference was FRAME:
   audit:waypoint-distances defaults to --state wa, while that read was a catalog-wide sample.
   Two numbers about different populations are not a disagreement, and quoting one as the other
   is how a count in this repo has been wrong nearly every time it was carried across. */
const STATE = (process.argv.find((a) => a.startsWith("--state=")) || "--state=wa").split("=")[1];
const rows = [];
for (let after = "";;) {
  const qs = [
    "select=id,waypoints,approach_logistics",
    "waypoints=not.is.null",
    "order=id.asc",
    "limit=1000",
  ];
  if (after) qs.push(`id=gt.${encodeURIComponent(after)}`);
  if (STATE && STATE !== "all") qs.push(`id=like.${STATE}_*`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?${qs.join("&")}`, { headers: headers(anonKey()) });
  if (!res.ok) { console.error(`FAIL — routes read ${res.status}; a broken read, not a clean catalog.`); process.exit(1); }
  const page = await res.json();
  rows.push(...page);
  if (page.length < 1000) break;
  after = page[page.length - 1].id;
}
if (!rows.length) { console.error("FAIL — zero routes with waypoints; a broken read."); process.exit(1); }

let examined = 0, flagged = 0, fixable = 0, notFixable = 0, noSecond = 0, skipped = 0;
const report = [];

for (const r of rows) {
  const w = Array.isArray(r.waypoints) ? r.waypoints : [];
  if (w.length < 2) continue;
  const pts = w.map(coordOf);
  const d = w.map((x) => (x && x.distMi != null ? num(x.distMi) : null));

  if (!pts[0] || pts[0].coarse) { skipped++; continue; }
  if (d[0] == null || d[0] !== 0) { skipped++; continue; }        // another convention entirely
  let mono = true;
  for (let i = 1; i < d.length; i++) {
    if (d[i] == null) continue;
    const prev = d.slice(0, i).filter((x) => x != null).pop();
    if (prev != null && d[i] < prev) { mono = false; break; }
  }
  if (!mono) { skipped++; continue; }                              // audit:waypoint-order's subject
  examined++;

  const legs = [];
  for (let i = 1; i < w.length; i++) {
    if (d[i] == null || d[i] === 0) continue;                      // unfilled, not zero-mile
    if (!pts[i] || pts[i].coarse) continue;
    legs.push({ i, name: w[i].name || w[i].type || ("#" + i), mi: d[i], p: pts[i] });
  }
  const bad = legs.filter((l) => impossible(km(pts[0], l.p) / MI, l.mi));
  if (!bad.length) continue;
  flagged++;

  const al = r.approach_logistics || {};
  const second = coordOf({ lat: al.trailheadLat, lng: al.trailheadLng });
  if (!second || second.coarse) { noSecond++; report.push({ id: r.id, verdict: "NO SECOND RECORD", bad: bad.length, legs: legs.length }); continue; }

  const moved = km(pts[0], second);
  const stillBad = legs.filter((l) => impossible(km(second, l.p) / MI, l.mi));
  const shrink = bad.length >= 2
    && (km(pts[0], bad[0].p) / MI - bad[0].mi) > (km(pts[0], bad[bad.length - 1].p) / MI - bad[bad.length - 1].mi);

  if (!stillBad.length) { fixable++; report.push({ id: r.id, verdict: "FIXABLE by the second record", bad: bad.length, legs: legs.length, moved, shrinking: shrink }); }
  else { notFixable++; report.push({ id: r.id, verdict: "still impossible (" + stillBad.length + "/" + legs.length + ")", bad: bad.length, legs: legs.length, moved, shrinking: shrink }); }
}

report.sort((a, b) => (a.verdict.startsWith("FIXABLE") ? -1 : 1) - (b.verdict.startsWith("FIXABLE") ? -1 : 1));
for (const x of report) {
  console.log(`${x.verdict.padEnd(30)} ${x.id}`);
  console.log(`    ${x.bad} of ${x.legs} legs impossible${x.moved != null ? `; the two trailhead records are ${x.moved.toFixed(2)} km apart` : ""}${x.shrinking ? "; shortfall SHRINKS up the list (displaced-origin signature)" : ""}`);
}

console.log(`\n${examined} route(s) measurable (${skipped} skipped by the audit's own gates), ${flagged} with an impossible leg.`);
console.log(`  ${fixable} would become possible by using the route's OWN second trailhead record`);
console.log(`  ${notFixable} stay impossible even with it — the distances or the upper pins are the wrong half`);
console.log(`  ${noSecond} carry no second record, so the row cannot answer itself`);
if (!examined) { console.error("FAIL — no route passed the entry gates; a broken scan, not a clean catalog."); process.exit(1); }
console.log(`\nA substitution is only justified where it REMOVES the impossibility. Nothing here is`);
console.log(`written: the gate is the point, and a route in the second bucket needs research, not a copy.`);
