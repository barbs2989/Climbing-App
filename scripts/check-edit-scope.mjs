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
  [/openFix\(catOf\(route\)==="sport"\?"draws":"rack"\)/, "the \"Brought different gear?\" box opening draws on sport (RouteDetail gearUpdateBox)"],
];
const lost = READERS.filter(([re]) => !re.test(rd)).map(([, n]) => n);
if (lost.length) fail(`no longer reads lib/fieldScope.js: ${lost.join("; ")} — a page section and the edit sheet can drift apart again`);
else ok(`all ${READERS.length} page readers and the sheet gate on lib/fieldScope.js`);
// The sport gear box is only right while sport edits draws and not rack.
if (!fieldScope("draws", scopeCtx({}, "sport")) || fieldScope("rack", scopeCtx({}, "sport"))) fail("sport's gear box opens `draws`, so sport must be offered draws and not rack");

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
  if (on("ropeNote", "bouldering", 1)) out.push("ropeNote is offered on a boulder — there is no rope");
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
];
const missed = INJECT.filter(([, patch]) => pageFacts({ ...FIELD_SCOPE, ...patch }).length === 0).map(([n]) => n);
if (missed.length) fail(`injection not caught: ${missed.join("; ")} — section 4 has gone blind`);
else ok(`all ${INJECT.length} injection cases are caught`);

console.log("");
if (failures) { console.log(`check:edit-scope FAILED — ${failures} problem(s).`); process.exit(1); }
console.log(`check:edit-scope: ok — ${sheet.length} edit fields, one scope rule each, shared with the page.`);
