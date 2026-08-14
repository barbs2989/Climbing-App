#!/usr/bin/env node
// WHY does move-trailhead-to-front.mjs refuse a route, and what would it actually take to fix it?
//
// That script proposes the minimal move (Trailhead to index 0) and then runs the waypoint
// writer's own six gates over the RESULT, keeping only what the writer would accept. It took
// the population from 120 -> 42 -> 33. The remainder is not noise and not a backlog of
// identical work: it is several DIFFERENT defects wearing one refusal message, and this script
// separates them so nobody tries to "finish the job" with a bulk transform.
//
// THE FINDING THAT MATTERS, and the reason a bulk fix would make the data worse:
//
//   On 24 of the 25 "coordinate impossible" routes, `distMi` is anchored to the ORIGINAL first
//   waypoint, NOT to the trailhead -- and every one of those trailhead pins carries no distMi
//   at all. Measured from the old origin those arrays are self-consistent (worst 0.00-0.88x of
//   the allowed bound); measured from the trailhead they are geometrically impossible (up to
//   29x). So the array was built with the approach's END as waypoint 0, and the trailhead was
//   appended afterwards.
//
//   Reordering alone therefore REPLACES A FALSE ORDER WITH A FALSE NUMBER. Move the Lake
//   Constance trailhead to the front and the app then states that Lake Constance -- 3,300 ft
//   above the road up an unmaintained boot path -- is 0 miles from the trailhead. The gate
//   refusing these is correct, and "still refused" is the right outcome until an offset exists.
//
// A correct repair needs BOTH the move and a rebase: distMi[i] += (trail distance from the
// trailhead to the old first waypoint). That offset must be RE-HOMED from the route's own
// recorded fields, never composed from memory -- the same rule enrich:apply enforces for prose.
// `--evidence` prints each route's own candidates for it.
//
// THE DISCRIMINATOR THAT DECIDES THE REPAIR, found by fixing one cluster and refusing another.
// "Coordinate impossible" says a distance and two pins disagree. It does NOT say which is wrong,
// and the two cases need opposite repairs:
//
//   PINS RIGHT, DISTANCE WRONG -> null the distance. Half Moon Crag (5 routes): both pins carry
//   their own verification notes, the crag's "Confirmed via Mountain Project (exact GPS match)",
//   and the approach gives TIME AND GAIN BUT NO DISTANCE -- so the stored distMi=1 against a
//   1.47 mi separation had nothing behind it. Nulled, order fixed. The 45-60min/1,000ft
//   description already lives in the waypoint note, so nothing useful was lost.
//
//   DISTANCE RIGHT, PIN WRONG -> change nothing, and say so. Mount Constance (4 routes): the
//   elevations corroborate BOTH pins (1,400 ft trailhead, 4,750 ft lake = the 3,300-3,400 ft
//   gain the route's own text states) and the prose corroborates the distance ("under 2.2
//   miles" vs distMi=2). The inconsistency is ~0.25 mi of horizontal error in one coordinate.
//   Nulling a correct distance to accommodate a wrong pin would destroy the good half.
//
// So: check the ELEVATIONS and the PROSE against each other before touching either. Where they
// agree with the distance, the pin is the suspect and this script is the wrong tool.
//
// IT IS OFTEN NOT RECOVERABLE, AND THAT IS THE SECOND FINDING. Several of these routes record
// more than one approach corridor and disagree with themselves about which one the waypoints
// describe -- Phantom Peak pins Hannegan Pass, names Nooksack Cirque in approach_logistics, and
// describes a Ross Lake water-taxi approach in its prose. Others have a misplaced pin rather
// than a missing number: Mount Constance's own text gives the climbers' trail as "under 2.2
// miles to Lake Constance" while the two pins sit 2.45 mi apart as the crow flies -- further
// apart than the walk between them, so the trailhead pin is at the Dosewallips washout five
// road-miles below the trail it is named for. That is the population already measured as
// "trailhead stored twice, 155 of 630 disagree"; this script does not re-derive it.
//
// Read-only. Anon key. Fails closed on an empty read -- zero routes would make every array look
// perfect, which is this checker's realistic failure mode.
//
// POPULATION: identical to move-trailhead-to-front.mjs, deliberately and by construction --
// area subtree (NOT `id like 'wa_%'`, which misses legacy ids), >=3 waypoints, exactly one
// Trailhead, and no route that already carries `directions`. A first draft of this script used
// its own looser predicate and reported 55 routes against the mover's 33; two numbers about two
// different sets, neither reconcilable with the other. If the two ever diverge again, this
// script is wrong until proven otherwise -- it exists to explain the mover, not to second-guess it.
import { selectAll } from "../lib/supabase-env.mjs";

const EVIDENCE = process.argv.includes("--evidence");

const R = 6371, tr = (d) => (d * Math.PI) / 180;
const hav = (a, b) => {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const dLat = tr(b.lat - a.lat), dLng = tr(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(tr(a.lat)) * Math.cos(tr(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const isTH = (w) => /^trailhead$/i.test(String((w && w.type) || ""));

// The writer's coordinate gate, expressed as a RATIO so the severity is visible rather than
// collapsed to a boolean. >1 means the gate rejects.
function worstRatio(wps, origin) {
  let w = 0, at = null;
  for (const p of wps) {
    if (p === origin || !p || p.distMi == null) continue;
    const d = hav(origin, p); if (d == null) continue;
    const km = Number(p.distMi) * 1.60934; if (!(km > 0)) continue;
    const ratio = d / (km * 1.10);
    if (ratio > w) { w = ratio; at = p.name; }
  }
  return { w, at };
}

const areas = await selectAll("areas", "id,path", null, { pageSize: 1000 });
const waIds = areas.filter((a) => (a.path || "").includes("washington")).map((a) => a.id);
if (!waIds.length) { console.error("NO WASHINGTON AREAS — refusing to report"); process.exit(1); }
const rows = [];
for (let i = 0; i < waIds.length; i += 40)
  rows.push(...await selectAll("routes", "id,name,waypoints,approach,approach_logistics,itinerary",
    `area_id=in.(${waIds.slice(i, i + 40).join(",")})`, { pageSize: 200 }));
if (!rows.length) { console.error("EMPTY READ — refusing to report a clean result"); process.exit(1); }

const anchored = [], both = [], ok = [];
let skippedSplice = 0, skippedDirections = 0;
for (const r of rows) {
  const wps = Array.isArray(r.waypoints) ? r.waypoints : null;
  if (!wps || wps.length < 3) continue;                   // the mover's minimum
  const ti = wps.findIndex(isTH);
  if (ti <= 0) continue;                                  // already first, or no trailhead
  if (wps.filter(isTH).length > 1) { skippedSplice++; continue; }
  if (wps.some((w) => w && w.directions && String(w.directions).trim())) { skippedDirections++; continue; }
  const moved = [wps[ti], ...wps.slice(0, ti), ...wps.slice(ti + 1)];
  const fromTH = worstRatio(moved, moved[0]);
  if (fromTH.w <= 1) { ok.push(r.id); continue; }          // the move is clean; the mover handles it
  const fromOrig = worstRatio(wps, wps[0]);
  const rec = { r, ti, n: wps.length, th: wps[ti], first: wps[0], fromTH, fromOrig,
                crowMi: hav(wps[ti], wps[0]) / 1.60934 };
  (fromOrig.w <= 1 ? anchored : both).push(rec);
}

console.log(`WA routes whose Trailhead is not first and whose move the writer REFUSES on coordinates\n`);
console.log(`  ${String(anchored.length).padStart(3)}  distMi ANCHORED to the old first waypoint — needs a REBASE, not a reorder`);
console.log(`  ${String(both.length).padStart(3)}  impossible from BOTH origins — a misplaced pin or a wrong distMi, needs reading`);
console.log(`  ${String(ok.length).padStart(3)}  coordinate gate CLEAN — refused (if at all) by one of the mover's five other gates\n`);
console.log(`  excluded from the population, same as the mover: ${skippedSplice} multi-Trailhead splice(s), ${skippedDirections} already carrying directions\n`);

const legs = new Map();
for (const a of anchored) {
  const k = `${a.th.name} >>> ${a.first.name}`;
  if (!legs.has(k)) legs.set(k, { crowMi: a.crowMi, routes: [] });
  legs.get(k).routes.push(a);
}
console.log(`The ${anchored.length} rebase cases collapse onto ${legs.size} DISTINCT trailhead->first-waypoint legs,`);
console.log(`so the offsets needed are ${legs.size}, not ${anchored.length}. Longest legs first — a long one is the`);
console.log(`likeliest to be a corridor disagreement rather than a missing number.\n`);

for (const [k, g] of [...legs.entries()].sort((x, y) => y[1].crowMi - x[1].crowMi)) {
  console.log(`${g.crowMi.toFixed(2).padStart(6)} mi crow  ${k}`);
  console.log(`${" ".repeat(13)}offset must be >= that; ${g.routes.length} route(s): ${g.routes.map(x => x.r.id).join(", ")}`);
  if (EVIDENCE) {
    const r0 = g.routes[0].r, al = r0.approach_logistics || {};
    if (al.trailhead) console.log(`${" ".repeat(13)}approach_logistics.trailhead: ${al.trailhead}`);
    const days = r0.itinerary && r0.itinerary.days;
    if (Array.isArray(days) && days[0]) console.log(`${" ".repeat(13)}itinerary day 1: ${days[0].miles} mi, ${days[0].gainFt} ft — "${days[0].title || ""}"`);
    const m = String(r0.approach || "").match(/[^.]*\b\d+(?:\.\d+)?\s*(?:mi\b|miles?\b)[^.]*\./);
    if (m) console.log(`${" ".repeat(13)}approach: ...${m[0].trim().replace(/\s+/g, " ").slice(0, 150)}`);
  }
}

// The single both-origins case as of 2026-08-13, read rather than left as a bare id, because
// "needs reading" is only useful if somebody eventually does it:
//
//   wa_smears_jugs_and_rock_roll -- its distMi chain (Snow Lakes 6.0, Lake Viviane 9.3) describes
//   the SNOW LAKES TRAIL #1553 approach, while the stored Trailhead pin is the STUART LAKE
//   TRAILHEAD, a different trailhead on the far side of the Enchantments. The waypoint's own note
//   contains both, in one sentence: titled "Stuart Lake Trailhead (Trail #1599) ... Confirmed
//   correct via USFS official page" and then "From Snow Lakes TH, hike Snow Lakes Trail #1553".
//   Its `approach` prose describes a THIRD line again (Stuart Lake TH -> Colchuck Lake -> Aasgard
//   Pass). Four further defects sit on the same row: distMi runs 6 -> 9.3 -> 0.2 (the last is a
//   LEG distance among cumulative ones), waypoint 2 is typed Topout while its own note calls it
//   the BASE of the face, and two pairs of pins share a coordinate exactly.
//
//   NOT repaired here: which corridor is canonical is a judgement, both are real ways in, and the
//   route is a single-pitch 5.10a on a crag beside a campsite -- low value, real chance of picking
//   wrong. Fixing it means choosing the corridor FIRST, then rebuilding the array to match it.
if (both.length) {
  console.log(`\nImpossible from both origins — read these individually:`);
  for (const b of both) {
    console.log(`  ${b.r.id}  TH@${b.ti + 1}/${b.n}  fromTH=${b.fromTH.w.toFixed(2)}x  fromOrig=${b.fromOrig.w.toFixed(2)}x`);
    console.log(`     TH="${b.th.name}"  first="${b.first.name}"  worst at "${b.fromTH.at}"`);
  }
}

console.log(`\nNothing was written. A bulk rebase is the wrong instrument here — see the header.`);
