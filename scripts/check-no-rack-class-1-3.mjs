import { fileHref } from "./lib/file-href.mjs";
import { NPX, NPX_PRE } from "./lib/npx.mjs";
// THE RULE: a Class 1, 2 or 3 route has no RACK card, and neither does a hike.
//
// Owner, 2026-11-13: "Remove rack section for class 1 2 and 3 scrambles. Ie grays peak in Colorado
// has this text and it makes no sense RACK. Make that a rule". Grays Peak North Slopes (scrambling,
// "Class 1", no rack of its own) printed RACK with the generic scrambling default "Light rope + a few
// slings for exposed steps, if the party wants one".
//
// The rule lives in lib/rack.js (isNoRackClass) and reads the HEADLINE grade (displayGrade), so a
// range counts at its top: "Class 2-3" is Class 3 and loses the card, "Class 3-4" is Class 4 and
// keeps it. It holds on every discipline, not only `scrambling`: a Class 2 mountaineering walk-up is
// still a Class 2 route. What the route's OWN record names as rack is not dropped; it moves to
// GEAR & ESSENTIALS.
//
// WHAT IT PINS, IN BOTH DIRECTIONS (rendered, not just the predicate):
//   - Grays Peak's exact record renders no RACK card and no generic scrambling line
//   - Class 2, Class 3, Class 3+, "3rd class", "Class 2-3" and a hike render no RACK card
//   - a Class 2 route that records a picket shows the picket under GEAR & ESSENTIALS
//   - Class 4, "Class 3-4" and a 5.6 alpine route STILL render RACK (the rule must not over-reach)
//
// AND NO ROPE (owner, 2026-11-25: "Rope doesn't need to be in class 1 2 or three grade climbs";
// lib/rack.js isNoRopeClass). The same Class 1-3 routes render no ROPEWORK card and no generic
// Harness / Belay device in GEAR & ESSENTIALS, and the edit sheet (lib/fieldScope.js) asks them no
// rope length, rope type or ropework. A Class 1-3 GLACIER walk keeps its rope: it is crossed as a
// rope team. Pinned both ways, like the rack.
//
// Static: one esbuild bundle, no DB, no browser. Fails CLOSED: a render with no GEAR heading or no
// GEAR & ESSENTIALS card is a broken probe, because every "must NOT contain RACK" assertion passes
// against a component that rendered nothing.
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, `.no-rack-class-${process.pid}.mjs`);
const entry = path.join(ROOT, `.no-rack-class-entry-${process.pid}.mjs`);
const clean = () => { fs.rmSync(out, { force: true }); fs.rmSync(entry, { force: true }); };

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const dead = (what) => {
  console.error(`\ncheck:no-rack-class-1-3 FAILED — ${what}.`);
  console.error("Nothing below was checked: a component that rendered nothing passes every 'no RACK' test.\n");
  clean();
  process.exit(1);
};

console.log("check:no-rack-class-1-3 — Class 1-3 routes and hikes have no RACK card\n");

try {
  fs.writeFileSync(entry, [
    `export { default as RouteGearCheck } from ${JSON.stringify(path.join(ROOT, "src/components/RouteGearCheck.tsx"))};`,
    `export { isNoRackClass, isNoRopeClass, DISC_RACK } from ${JSON.stringify(path.join(ROOT, "lib/rack.js"))};`,
    `export { fieldScope, scopeCtx } from ${JSON.stringify(path.join(ROOT, "lib/fieldScope.js"))};`,
  ].join("\n"));
  // Bundle INSIDE the project: node resolves `react` from the nearest node_modules.
  execFileSync(NPX, [...NPX_PRE, "esbuild", entry,
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch {
  dead("esbuild could not bundle RouteGearCheck.tsx");
}
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
}

const mod = await import(fileHref(out + "?t=" + Date.now()));
clean();
const { RouteGearCheck, isNoRackClass, isNoRopeClass, DISC_RACK, fieldScope, scopeCtx } = mod;
if (typeof RouteGearCheck !== "function") dead("RouteGearCheck.tsx has no default export — ANCHOR LOST");
if (typeof isNoRackClass !== "function") dead("lib/rack.js does not export isNoRackClass — ANCHOR LOST");
if (typeof isNoRopeClass !== "function") dead("lib/rack.js does not export isNoRopeClass — ANCHOR LOST");
if (typeof fieldScope !== "function" || typeof scopeCtx !== "function") dead("lib/fieldScope.js lost fieldScope/scopeCtx — ANCHOR LOST");

// Render as RoutePlanTab does: no own rack -> the discipline's generic rack, flagged generic.
const render = (route, own) => {
  const generic = !own;
  const rack = own || DISC_RACK[route.discipline] || [];
  let html;
  try {
    html = renderToStaticMarkup(React.createElement(RouteGearCheck, {
      route, activity: [], rack, rackGeneric: generic, essentials: route.whatToBring || [],
      onEditRack: () => {}, onEditEssentials: () => {}, onEditRopeNote: () => {},
    }));
  } catch (e) { dead(`RouteGearCheck threw on ${route.name}: ${e.message}`); }
  if (!/>GEAR</.test(html) || !/GEAR &amp; ESSENTIALS|GEAR & ESSENTIALS/.test(html)) dead(`${route.name} rendered no GEAR section — ANCHOR LOST`);
  return html;
};
// A word-bounded card heading: "RACK" must not match inside "ROUTE TRACK".
const hasRackCard = (html) => />RACK</.test(html);

const GRAYS = { name: "Grays Peak North Slopes", discipline: "scrambling", grade: "Class 1", grade_system: "class", rack: null, detailedRack: null, proNeeds: null };
const html = render(GRAYS);
if (!hasRackCard(html)) ok("Grays Peak North Slopes (Class 1 scramble) has no RACK card");
else fail("Grays Peak North Slopes (Class 1 scramble) still renders RACK");
if (!html.includes("Light rope + a few slings")) ok("…and not the generic scrambling rack line");
else fail("Grays Peak still prints the generic scrambling rack line");

const NONE = [
  { name: "Class 2 scramble", discipline: "scrambling", grade: "Class 2" },
  { name: "Class 3 scramble", discipline: "scrambling", grade: "Class 3" },
  { name: "Class 3+ scramble", discipline: "scrambling", grade: "Class 3+" },
  { name: "3rd class scramble", discipline: "scrambling", grade: "3rd class" },
  { name: "Class 2-3 scramble (top 3)", discipline: "scrambling", grade: "Class 2-3" },
  { name: "Class 2 mountaineering walk-up", discipline: "mountaineering", grade: "Class 2", grade_system: "class" },
  { name: "Ungraded hike", discipline: "hiking", grade: "" },
];
for (const r of NONE) {
  if (!hasRackCard(render(r))) ok(`${r.name}: no RACK card`);
  else fail(`${r.name}: still renders RACK`);
}

const picket = { name: "Class 2 snow route with a picket", discipline: "mountaineering", grade: "Class 2", grade_system: "class", rack: ["Picket ×1"] };
const ph = render(picket, ["Picket ×1"]);
if (!hasRackCard(ph) && ph.includes("Picket")) ok("a Class 2 route's own picket moves to GEAR & ESSENTIALS, not RACK");
else fail("a Class 2 route's own rack item was dropped or still printed under RACK");

const KEEP = [
  { name: "Class 4 scramble", discipline: "scrambling", grade: "Class 4" },
  { name: "Class 3-4 scramble (top 4)", discipline: "scrambling", grade: "Class 3-4" },
  { name: "5.6 alpine rock", discipline: "alpine", grade: "5.6", rock_grade: "5.6" },
];
for (const r of KEEP) {
  if (hasRackCard(render(r))) ok(`${r.name}: keeps its RACK card`);
  else fail(`${r.name}: lost its RACK card — the rule over-reaches`);
}

// ── NO ROPE ON CLASS 1-3 (unless a glacier) ──
const hasRopework = (html) => />ROPEWORK</.test(html);
const hasHarness = (html) => />Harness</.test(html) || /Harness/.test(html);
const NOROPE = [
  GRAYS,
  { name: "Class 2 mountaineering walk-up", discipline: "mountaineering", grade: "Class 2", grade_system: "class", overview: "A long trail and talus walk to the summit." },
  { name: "Class 3 scramble", discipline: "scrambling", grade: "Class 3" },
  { name: "Class 2-3 mountaineering (top 3)", discipline: "mountaineering", grade: "Class 2-3", overview: "Snow slopes to a rocky summit ridge." },
  { name: "Class 2 walk-up reviewed glacier-free", discipline: "mountaineering", grade: "Class 2", glacierTravel: "no", overview: "Views of the glacier from the summit." },
];
for (const r of NOROPE) {
  const h = render(r);
  if (isNoRopeClass(r) && !hasRopework(h)) ok(`${r.name}: no ROPEWORK card`);
  else fail(`${r.name}: still renders ROPEWORK (or isNoRopeClass says it is roped)`);
  if (!hasHarness(h)) ok(`${r.name}: no generic Harness in the packing list`);
  else fail(`${r.name}: still assumes a Harness`);
  const ctx = scopeCtx(r, r.discipline);
  const asked = ["ropeNote", "ropeLen", "ropeType"].filter((k) => fieldScope(k, ctx));
  if (!asked.length) ok(`${r.name}: the edit sheet asks no rope field`);
  else fail(`${r.name}: the edit sheet still asks ${asked.join(", ")}`);
}
const ROPED = [
  { name: "Class 2 glacier walk (reviewed)", discipline: "mountaineering", grade: "Class 2", glacierTravel: "yes", overview: "Up the Easton Glacier to the summit." },
  { name: "Class 2 glacier walk (text only)", discipline: "mountaineering", grade: "Class 2", overview: "Rope up at the toe of the glacier and weave through the crevasses." },
  { name: "Class 4 mountaineering", discipline: "mountaineering", grade: "Class 4" },
  { name: "Class 3-4 mountaineering (top 4)", discipline: "mountaineering", grade: "Class 3-4" },
  { name: "5.6 alpine rock", discipline: "alpine", grade: "5.6", rock_grade: "5.6" },
];
for (const r of ROPED) {
  const h = render(r);
  if (!isNoRopeClass(r) && hasRopework(h)) ok(`${r.name}: keeps its ROPEWORK card`);
  else fail(`${r.name}: lost its ROPEWORK card — the no-rope rule over-reaches`);
  if (hasHarness(h)) ok(`${r.name}: keeps the Harness`);
  else fail(`${r.name}: lost the Harness`);
  if (fieldScope("ropeNote", scopeCtx(r, r.discipline))) ok(`${r.name}: the edit sheet still asks ropework`);
  else fail(`${r.name}: the edit sheet stopped asking ropework`);
}
// A Class 1-3 route that STORES a rope note is not asked for it either: its page draws no ROPEWORK, so the
// editor would correct a value nobody sees (106 live routes, nearly all "no rope needed", 2026-11-25).
const storedNote = { name: "Class 2 walk-up with a stored rope note", discipline: "mountaineering", grade: "Class 2", ropeNote: "No rope needed." };
if (!fieldScope("ropeNote", scopeCtx(storedNote, "mountaineering")) && !hasRopework(render(storedNote))) ok("a Class 2 route that stores a rope note shows no ROPEWORK and offers no editor for it");
else fail("a Class 2 route's stored rope note still renders ROPEWORK or still offers its editor");

if (failures) { console.log(`\ncheck:no-rack-class-1-3: ${failures} FAILED`); process.exit(1); }
console.log("\ncheck:no-rack-class-1-3: ok");
