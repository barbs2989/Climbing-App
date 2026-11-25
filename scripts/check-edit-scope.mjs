#!/usr/bin/env node
/* check:edit-scope — the route EDIT SHEET offers, per discipline, only fields that discipline's PAGE draws.

   Why (owner, 2026-11-18): "I only want to show options for editing that fits the situation or discipline."
   Editing a section of a trad route opened a sheet offering Trip shape, Published times, Camping & bivy and a
   full waypoint editor, none of which a trad page shows. The sheet's rule (an inline DROP map in SuggestFix)
   had been written apart from the page's section gates and drifted. It now lives in ONE module,
   lib/fieldScope.js, read by the sheet AND by the page sections that render those fields.

   What this checks:
   1. Every key in SuggestFix's FIELDS has a rule in FIELD_SCOPE, and FIELD_SCOPE names no key FIELDS lacks.
   2. lib/fieldScope.js's CRAG list is ClimbMatchCore's CRAG_CATS.
   3. The readers still CALL it: the sheet's okField, the page's DESCENT gate (RoutePlanTab), the crag
      "Not on file yet" list and Descent fact (TechStats), the facts-card pencil (RouteDetail), and the sport
      gear box opens `draws`, not the rack editor sport is not offered.
   4. Page facts the scope must agree with — each is a gate in the page's own code:
      - the Plan tab is not mounted on a crag (RouteDetail `cragOnly`), so no planner-only field
        (Trip shape, Published times, Trip plan, Camping & bivy, Gear & essentials, Ways in, distance/gain/loss)
        is offered on any crag discipline;
      - the crag fact rows (Location, Rock quality, Wet, Sun, Anchor) render only on a crag (TechStats);
      - Landing / Crash pads / Start render only on a boulder;
      - DESCENT renders on a multi-pitch sport/trad line and NOT on a single-pitch one or a boulder;
      - a field every discipline's page draws (name, grade, description, hazards, getting there, access,
        approach, emergency) is offered everywhere.
   5. Injection cases: each mutation of the scope must make section 4 fail.

   Notes: docs/guards/contributions-and-logbook.md (check:edit-scope). */
import path from "path";
import { fileURLToPath } from "url";
import { readAppFile, readCoreSource } from "./lib/guard-sources.mjs";
import { FIELD_SCOPE, CRAG, MOUNTAIN, fieldScope, scopeCtx } from "../lib/fieldScope.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const fail = (m) => { failures++; console.log("  FAIL  " + m); };
const ok = (m) => console.log("  ok    " + m);
const anchorLost = (m) => { console.log("  FAIL  anchor lost: " + m + " — this guard can no longer see what it checks"); process.exit(1); };

// ── 1. FIELDS ↔ FIELD_SCOPE ──
const rd = readAppFile(path.join(ROOT, "RouteDetail.jsx")); // stitched: SuggestFix, RoutePlanTab, TechStats are in src/components
const sfLine = rd.split("\n").find((l) => l.includes("const FIELDS=[{k:"));
if (!sfLine) anchorLost("`const FIELDS=[{k:` — the edit sheet's field list");
const sheet = [...new Set([...sfLine.matchAll(/\{k:"([a-zA-Z0-9_]+)"/g)].map((m) => m[1]))];
if (sheet.length < 60) anchorLost(`FIELDS parsed to only ${sheet.length} keys`);
const noRule = sheet.filter((k) => !FIELD_SCOPE[k]);
const stale = Object.keys(FIELD_SCOPE).filter((k) => !sheet.includes(k));
if (noRule.length) fail(`the edit sheet lists ${noRule.join(", ")} with no rule in lib/fieldScope.js — fieldScope() answers false for it, so the field silently vanishes from every discipline. Give it a rule.`);
if (stale.length) fail(`lib/fieldScope.js has rules for ${stale.join(", ")}, which the edit sheet no longer lists — drop them`);
if (!noRule.length && !stale.length) ok(`all ${sheet.length} edit-sheet fields have exactly one scope rule`);

// ── 2. CRAG ↔ CRAG_CATS ──
const core = readCoreSource();
const ccM = /const CRAG_CATS=(\[[^\]]*\])/.exec(core);
if (!ccM) anchorLost("`const CRAG_CATS=[` in ClimbMatchCore.jsx");
const CRAG_CATS = JSON.parse(ccM[1]);
if ([...CRAG_CATS].sort().join() !== [...CRAG].sort().join()) fail(`lib/fieldScope.js CRAG (${CRAG}) is not CRAG_CATS (${CRAG_CATS}): the sheet and the page disagree about which disciplines are crags`);
else ok(`fieldScope's crag list is CRAG_CATS (${CRAG_CATS.join(", ")})`);

// ── 3. the readers still call it ──
const READERS = [
  [/const okField=function\(k: string\)\{return fieldScope\(k,_scope\);\}/, "the edit sheet's okField (SuggestFix) — the sheet itself"],
  [/!fieldScope\("descentText",scopeCtx\(route,catOf\(route\)\)\)\?null:/, "the DESCENT section's gate (RoutePlanTab)"],
  [/\.filter\(function\(k\)\{const fk=\(FACT_FIELD as Record<string,string>\)\[k\];return !fk\|\|fieldScope\(fk,scopeCtx\(route,disc\)\);\}\)/, "the crag \"Not on file yet\" list (TechStats _want)"],
  [/_dsc\.length<=140&&!fieldScope\("descentText",scopeCtx\(route,disc\)\)/, "the crag Descent fact, skipped where DESCENT renders (TechStats)"],
  [/\.filter\(function\(k\)\{return fieldScope\(k,_sc\);\}\)\)\|\|"grade"/, "the facts-card pencil (RouteDetail factsPencilKey)"],
  [/const sec=disc==="bouldering"\?"pads":disc==="sport"\?"draws":"rack";/, "the crag RACK pencil opening draws on sport (CragRack sec)"],
  [/<CragLocationCard route=\{route\} mtn=\{mtn\} onEditParking=\{onEditArea\?\(\)=>\{onEditArea\("parking_pin"\);\}:\(\)=>\{openFix\("waypoints"\);\}\} onEditRoutePin=\{\(\)=>\{openFix\("waypoints"\);\}\}\/>/, "the crag parking card editing the CRAG's pin, the route pin only as fallback (RoutePlanTab)"],
  [/park&&onEditParking\?<EditIconButton onClick=\{!parkIsCrag&&onEditRoutePin\?onEditRoutePin:onEditParking\}/, "the parking pencil editing the pin it SHOWS — the route's own when trailheadPoint() picked it (CragLocationCard)"],
  [/const areaFactEdit=onSuggestAreaEdit&&cragAreaEditable\(route\)\?/, "the crag-area editor offered exactly where fieldScope's cragPin says (RouteDetail areaFactEdit)"],
  [/<RoutePlanTab onEditArea=\{areaFactEdit\} /, "the Plan tab handed the crag-area editor (RouteDetail)"],
  [/<RouteOverviewTab onEditArea=\{areaFactEdit\} /, "the Overview tab handed the crag-area editor (RouteDetail)"],
  [/<RoutePlanTab onEditArea=\{onEditArea\} atTabTop=\{undefined\} /, "Overview passing it to the crag's Plan body (RouteOverviewTab)"],
];
const lost = READERS.filter(([re]) => !re.test(rd)).map(([, n]) => n);
if (lost.length) fail(`no longer reads lib/fieldScope.js: ${lost.join("; ")} — a page section and the edit sheet can drift apart again`);
else ok(`all ${READERS.length} page readers and the sheet gate on lib/fieldScope.js`);
// The crag RACK pencil on sport is only right while sport edits draws and not rack.
if (!fieldScope("draws", scopeCtx({}, "sport")) || fieldScope("rack", scopeCtx({}, "sport"))) fail("sport's RACK pencil opens `draws`, so sport must be offered draws and not rack");

// ── 3b. the page side: what the sheet offers, the page names and can open (2026-11-18, third PR) ──
const PAGE_SIDE = [
  [/fieldScope\("outingShape",scopeCtx\(route,catOf\(route\)\)\)\?\(\(\)=>\{const _shp=recShapeOf\(route\)/, "the Plan tab's TRIP SHAPE row, shown exactly where the sheet offers Trip shape (RoutePlanTab)"],
  [/<Calculator route=\{route\}[^>]*onEditTiming=\{\(\)=>\{openFix\("timing"\);\}\}/, "the PUBLISHED TIMES pencil (RoutePlanTab → Calculator)"],
  [/<ClimateSeasonCard route=\{route\} onEdit=\{\(\)=>\{openFix\("climate"\);\}\}\/>/, "the CLIMATE & SEASON pencil (RouteDetail)"],
  [/<PartnerRequirementsPanel [^>]*onEdit=\{\(\)=>setAutoFix\(selRoute\.id\+"#partnerRequirements"\)\}\/>/, "the PARTNER REQUIREMENTS pencil (ClimbMatch)"],
  [/_hd\?\["Approach",effDistKm\(route\)/, "the boulder header's Approach cell, drawn only with a value (RouteDetail)"],
  [/protOf\(route\)\|\|\(cragOnly&&routeAscentFt\(route\)==null\)\?null:\["Gain"/, "the crag header's Gain cell, drawn only with a value (RouteDetail)"],
];
const app = readAppFile(path.join(ROOT, "ClimbMatch.jsx")); // the Partners tab body is App's
const pageLost = PAGE_SIDE.filter(([re]) => !re.test(rd) && !re.test(app)).map(([, n]) => n);
if (pageLost.length) fail(`the page no longer matches the sheet: ${pageLost.join("; ")}`);
else ok(`all ${PAGE_SIDE.length} page-side surfaces name, open or hide what the sheet offers`);
// ADD-A-CLIMB asks a field only where the sheet offers it for that TYPE (owner, 2026-11-18): its rock list is shared by
// trad, sport and top-rope, so without the scope a sport climb was asked its first free and first winter ascent.
{
  const ar = readAppFile(path.join(ROOT, "lib", "AddRoute.jsx"));
  if (!/const sf=k=>\{[^}]*return !FIELD_SCOPE\[sk\]\|\|fieldScope\(sk,_sfScope\);\}/.test(ar) || !/const _sfScope=scopeCtx\(\{pitches:[^}]*\},disc==="rock"\?sub:disc\)/.test(ar))
    fail("add-a-climb's sf() no longer gates on lib/fieldScope.js per climb TYPE — a sport climb is asked its first winter ascent again");
  else ok("add-a-climb asks only what the edit sheet offers for the climb's type (sf() gates on fieldScope)");
  for (const [k, cat] of [["ffa", "sport"], ["fwa", "trad"], ["ropeNote", "toprope"], ["protRating", "toprope"]])
    if (fieldScope(k, scopeCtx({ pitches: 2 }, cat))) fail(`${k} is in scope for ${cat}, so add-a-climb asks it again`);
}
// The header cells and the trip-shape row lean on these rules.
for (const cat of CRAG) for (const k of ["dist", "gain", "outingShape"]) if (fieldScope(k, scopeCtx({ pitches: 3 }, cat))) fail(`${k} is offered on ${cat}: its header cell / trip-shape row is hidden there as uneditable`);
for (const cat of MOUNTAIN) if (!fieldScope("outingShape", scopeCtx({ pitches: 3 }, cat))) fail(`outingShape is not offered on ${cat}, but its Plan tab draws a TRIP SHAPE row with an Add button`);

// ── 4. page facts ──
const PLANNER_ONLY = ["outingShape", "timing", "itinerary", "bivy", "whatToBring", "approachVariants", "dist", "gain", "loss", "seasonalHazards", "climbingRoute"];
const CRAG_FACTS = ["location", "rockQuality", "wet", "sun", "anchor"];
const BOULDER_ONLY = ["landing", "pads", "startType"];
const EVERYWHERE = ["name", "grade", "overview", "haz", "road", "access", "approach", "emergency", "comms", "aspect", "season"];
const CTX = [];
for (const cat of [...CRAG, ...MOUNTAIN]) for (const pitches of [1, 3, null]) CTX.push([cat, pitches]);

function pageFacts(scope) {
  const out = [];
  const on = (k, cat, pitches, route = {}) => { const r = scope[k]; return !!(r && r(scopeCtx({ pitches, ...route }, cat), k)); };
  for (const [cat, p] of CTX) {
    const crag = CRAG.includes(cat);
    for (const k of PLANNER_ONLY) if (crag && on(k, cat, p)) out.push(`${k} is offered on ${cat} (pitches ${p}) — it renders only on the Plan tab, which a crag page does not have`);
    for (const k of CRAG_FACTS) if (!crag && on(k, cat, p)) out.push(`${k} is offered on ${cat} — that fact row renders only on a crag page`);
    for (const k of BOULDER_ONLY) if (on(k, cat, p) !== (cat === "bouldering")) out.push(`${k} is ${on(k, cat, p) ? "offered" : "not offered"} on ${cat} — it renders on a boulder page only`);
    for (const k of EVERYWHERE) if (!on(k, cat, p)) out.push(`${k} is not offered on ${cat} — every page draws that section`);
  }
  for (const cat of ["sport", "trad"]) {
    if (!on("descentText", cat, 3)) out.push(`descentText is not offered on multi-pitch ${cat} — DESCENT renders there (owner, 2026-11-18)`);
    if (on("descentText", cat, 1)) out.push(`descentText is offered on single-pitch ${cat} with no descent stored — no DESCENT renders there`);
    if (!on("descentText", cat, 1, { descent: "Walk off left" })) out.push(`descentText is not offered on single-pitch ${cat} that STORES a descent — the page shows it, so it must stay editable`);
  }
  if (on("descentText", "bouldering", 1)) out.push("descentText is offered on a boulder — no DESCENT renders there");
  // Crag parking is the CRAG's pin (owner, 2026-11-18): the parking card opens the area editor wherever it can.
  const CRAG_AREA = { _dbArea: { id: "x", areaType: "crag" } };
  for (const cat of CRAG) {
    if (on("waypoints", cat, 1, CRAG_AREA)) out.push(`waypoints is offered on ${cat} whose crag can be edited — its parking card edits the crag's pin, and a crag page draws no waypoint list`);
    if (!on("waypoints", cat, 1)) out.push(`waypoints is not offered on ${cat} with no editable crag — the route pin is then the only way to set parking`);
    if (!on("waypoints", cat, 1, { ...CRAG_AREA, waypoints: [{ type: "Trailhead", lat: 1, lng: 1 }] })) out.push(`waypoints is not offered on ${cat} that STORES its own pin — the card shows that pin ahead of the crag's, so it must stay editable`);
    if (on("approachLogistics", cat, 1, CRAG_AREA)) out.push(`approachLogistics is offered on ${cat} whose crag can be edited, with no directions stored`);
    if (!on("approachLogistics", cat, 1, { ...CRAG_AREA, approachLogistics: { trailheadDirection: "Left at the fork" } })) out.push(`approachLogistics is not offered on ${cat} that STORES directions — the parking card shows them`);
  }
  for (const cat of MOUNTAIN) if (!on("waypoints", cat, 3, CRAG_AREA)) out.push(`waypoints is not offered on ${cat} — the Plan tab's WAYPOINTS list renders there`);
  if (on("ropeNote", "bouldering", 1)) out.push("ropeNote is offered on a boulder — there is no rope");
  // OVERLAPPING FIELDS merged into one editor (owner, 2026-11-18): the old field only where a value is stored.
  const MERGED = [["proTips", "beta", "trad", { proTips: ["Bring a 70m"] }], ["bestSeason", "seasonalGuidance", "alpine", { bestSeason: "July to September" }],
    ["rappelCountNote", "rappelDetail", "alpine", { rappelCountNote: "3 single-rope raps" }], ["condWindow", "seasonalGuidance", "alpine", { condWindow: "Late June" }]];
  for (const [k, into, cat, has] of MERGED) {
    if (on(k, cat, 3)) out.push(`${k} is offered on a ${cat} route that stores none — it was merged into ${into}, its one editor`);
    if (!on(k, cat, 3, has)) out.push(`${k} is not offered on a ${cat} route that STORES one — the page still shows it, so it must stay correctable`);
    if (!on(into, cat, 3)) out.push(`${into} is not offered on ${cat} — it is where ${k} was merged`);
  }
  return out;
}
const facts = pageFacts(FIELD_SCOPE);
if (facts.length) facts.forEach(fail);
else ok(`the scope agrees with every page gate checked, on ${CTX.length} discipline × pitch-count cases`);

// ── 5. injection cases ──
const INJECT = [
  ["Published times offered on sport", { timing: () => true }],
  ["Camping & bivy offered on trad", { bivy: (c) => c.cat === "trad" || MOUNTAIN.includes(c.cat) }],
  ["Location offered on alpine", { location: () => true }],
  ["DESCENT offered on every single-pitch crag", { descentText: () => true }],
  ["Descent dropped from multi-pitch trad", { descentText: (c) => MOUNTAIN.includes(c.cat) || c.cat === "aid" }],
  ["Hazards dropped from bouldering", { haz: (c) => c.cat !== "bouldering" }],
  ["Crash pads offered on sport", { pads: (c) => c.cat === "bouldering" || c.cat === "sport" }],
  ["Route waypoints offered on every crag again", { waypoints: () => true }],
  ["Pro tips offered beside Beta again", { proTips: () => true }],
  ["A stored when-to-go note left uneditable", { bestSeason: () => false }],
  ["Route waypoints dropped from crags with no editable crag", { waypoints: (c) => MOUNTAIN.includes(c.cat) }],
];
const missed = INJECT.filter(([, patch]) => pageFacts({ ...FIELD_SCOPE, ...patch }).length === 0).map(([n]) => n);
if (missed.length) fail(`injection not caught: ${missed.join("; ")} — section 4 has gone blind`);
else ok(`all ${INJECT.length} injection cases are caught`);

console.log("");
if (failures) { console.log(`check:edit-scope FAILED — ${failures} problem(s).`); process.exit(1); }
console.log(`check:edit-scope: ok — ${sheet.length} edit fields, one scope rule each, shared with the page.`);
