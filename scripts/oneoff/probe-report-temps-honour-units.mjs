#!/usr/bin/env node
// A CLIMBER'S OWN TEMPERATURE STILL READ FAHRENHEIT.
//
// #1567 converted the FORECAST -- a provider reading. It did not touch the other temperature
// on the route page, which is the one a climber typed: the trip report's `cond.tempF`. Three
// surfaces printed or asked for Fahrenheit unconditionally:
//
//   1. ReportStats            ["Temp", cond.tempF + "degF"]        -- one report's own figure
//   2. the CONDITIONS NOW chip  buildConsensus baked "58degF" into its value
//   3. the log-a-climb form   labelled "TEMP degF (optional)", and STORED WHAT WAS TYPED
//
// The third is the serious one: it is a WRITE. A metric climber typing 10 meaning 10C had 10
// stored into `climb_logs.temp_f`, so their report told everyone else the route was at -12C.
// A display defect misinforms one reader; this one corrupted the record for every reader.
//
// THE COLUMN STAYS CANONICAL FAHRENHEIT and the conversion happens at the two edges -- the
// same rule #1567 arrived at for the forecast. `syncLogToDb` reads `cond.tempF` straight into
// `temp_f`, and both hydrations read it straight back, so canonicalising at the form is what
// leaves all four of those untouched.
//
// WHY THE CONSENSUS CONVERTS AT THE CHIP AND NOT IN buildConsensus. That value is
// `useMemo(() => buildConsensus(activityAll, voteFor), [activityAll, voteFor])` -- memoised on
// the reports alone. A unit baked in there would not be recomputed when the toggle moves, so
// the chip would keep the old unit until somebody filed a new report. The chip re-renders; the
// memo does not.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const problems = [];
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); problems.push(m); };

// =======================================================================================
// SECTION 1 -- the two helpers, and the round trip that a WRITE depends on.
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export { uTempU, uTempIn, uTempN, buildConsensus, __set_UNITS } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-temps-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const M = require_(out);

const both = (fn, v) => {
  M.__set_UNITS("imperial"); const a = M[fn](v);
  M.__set_UNITS("metric"); const b = M[fn](v);
  M.__set_UNITS("imperial"); return [a, b];
};

// The scale letter is KEPT here, unlike the forecast's bare degree sign: this chip is labelled
// only "Temp", so dropping it would take something the imperial reader has today.
for (const [inF, imp, met] of [[58, "58\u00b0F", "14\u00b0C"], [32, "32\u00b0F", "0\u00b0C"], [14, "14\u00b0F", "-10\u00b0C"]]) {
  const [a, b] = both("uTempU", inF);
  if (a === imp && b === met) ok(`uTempU(${inF}) -> ${a} / ${b}`);
  else fail(`uTempU(${inF}): got ${a}/${b}, expected ${imp}/${met}`);
}

// uTempIn is the inverse and the only one that runs on a write.
for (const [typed, impStored, metStored] of [[58, 58, 136], [10, 10, 50], [0, 0, 32], [-10, -10, 14]]) {
  const [a, b] = both("uTempIn", typed);
  if (a === impStored && b === metStored) ok(`uTempIn(${typed}) stores ${a}F / ${b}F`);
  else fail(`uTempIn(${typed}): got ${a}/${b}, expected ${impStored}/${metStored}`);
}
// An imperial user typing a decimal must not be silently rounded -- that is today's behaviour.
if (both("uTempIn", 58.5)[0] === 58.5) ok("an imperial decimal is stored unchanged (58.5)");
else fail("uTempIn rounds an imperial value — that is a behaviour change, not a conversion");

// THE ROUND TRIP IS WHAT MAKES THE WRITE SAFE: type it, store it, reopen it, get it back.
M.__set_UNITS("metric");
const drift = [];
for (let c = -40; c <= 60; c++) { if (M.uTempN(M.uTempIn(c)) !== c) drift.push(c); }
M.__set_UNITS("imperial");
if (drift.length) fail(`${drift.length} Celsius values do not survive the round trip (e.g. ${drift.slice(0, 5).join(", ")})`);
else ok("every whole Celsius value -40..60 round-trips through the Fahrenheit column exactly");

// =======================================================================================
// SECTION 2 -- buildConsensus hands back a NUMBER, so the chip can choose the unit.
const act = (tempF, date) => ({ user: "A", date, tickType: "Summit", stars: 5, condTags: [], cond: { tempF } });
const cons = M.buildConsensus([act(50, "2026-08-01"), act(60, "2026-08-02")]);
const cv = cons && cons.conditions && cons.conditions.tempF && cons.conditions.tempF.value;
if (typeof cv === "number") ok(`buildConsensus stores the tempF consensus as a number (${cv})`);
else fail(`buildConsensus stores tempF as ${typeof cv} (${JSON.stringify(cv)}) — a baked unit cannot follow the toggle, because that value is useMemo'd on the reports alone`);

// =======================================================================================
// SECTION 3 -- ON SCREEN. The chip is on the Conditions sub-tab, over a route carrying reports.
const route = {
  id: "probe_temp", name: "Probe", grade: "5.9", gradeSystem: "yds", discipline: "trad",
  pitches: 4, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Colorado" },
  activity: [act(50, "2026-08-01"), act(60, "2026-08-02")],
};
const strip = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const shot = (u) => { M.__set_UNITS(u); const h = render_(route); M.__set_UNITS("imperial"); return h; };
const render_ = (r) => M.render(r, "conditions");
const impHtml = shot("imperial"), metHtml = shot("metric");
const impT = strip(impHtml), metT = strip(metHtml);

// Fails CLOSED: with no chip on screen every assertion below passes vacuously.
if (!impT.includes("CONDITIONS NOW") || !/\ud83c\udf21 Temp/.test(impT)) fail("ANCHOR LOST: no CONDITIONS NOW thermometer chip on the Conditions tab — this run proved nothing");
else if (impT.length < 400 || metT.length < 400) fail(`thin render (${impT.length}/${metT.length} chars) — NOT MEASURED`);
else {
  const grab = (t) => (t.match(/\ud83c\udf21 Temp (-?\d+)\u00b0([FC])/) || []).slice(1);
  const gi = grab(impT), gm = grab(metT);
  if (!gi.length || !gm.length) fail(`could not read the Temp chip (imperial ${JSON.stringify(gi)}, metric ${JSON.stringify(gm)})`);
  else {
    const wantC = Math.round((Number(gi[0]) - 32) * 5 / 9);
    if (gi[1] !== "F") fail(`the imperial chip reads ${gi[0]}\u00b0${gi[1]}, expected F`);
    else if (gm[1] !== "C") fail(`the metric chip reads ${gm[0]}\u00b0${gm[1]}, expected C — the consensus chip ignores the setting`);
    else if (Number(gm[0]) !== wantC) fail(`the chip says ${gi[0]}\u00b0F imperial but ${gm[0]}\u00b0C metric, expected ${wantC}\u00b0C`);
    else ok(`CONDITIONS NOW chip: ${gi[0]}\u00b0F -> ${gm[0]}\u00b0C on screen`);
  }
  // ReportStats is a SECOND surface, one report's own figure rather than the consensus, and
  // it is fed by different code. Assert it apart from the chip or one can hide the other.
  const rs = (t) => (t.match(/Summit Temp (-?\d+)\u00b0([FC])/g) || []);
  const rsI = rs(impT), rsM = rs(metT);
  if (rsI.length !== 2 || rsM.length !== 2) fail(`expected 2 ReportStats temperatures per run, saw ${rsI.length}/${rsM.length} — NOT MEASURED`);
  else if (!rsI.every((x) => x.endsWith("F")) || !rsM.every((x) => x.endsWith("C"))) fail(`ReportStats reads ${rsI.join(",")} imperial and ${rsM.join(",")} metric`);
  else ok(`ReportStats rows: ${rsI.join(", ")} -> ${rsM.join(", ")}`);

  if (/\d\u00b0F/.test(metT)) fail("a Fahrenheit figure survives on the metric Conditions tab: " + (metT.match(/.{0,40}\d\u00b0F.{0,20}/) || [""])[0]);
  else ok("no Fahrenheit figure survives anywhere on the metric Conditions tab");
}

// =======================================================================================
// SECTION 4 -- the FORM. It cannot be rendered here (LogAscent needs App state), so its three
// links are asserted as source. This is the half a stale-base squash takes: the helpers would
// still convert perfectly while the form went back to storing whatever was typed.
const CORE = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const ast = parse(CORE, { sourceType: "module", plugins: ["jsx"] });
let sawIn = false, sawSeed = false;
traverse(ast, {
  CallExpression(p) {
    if (p.node.callee.name === "uTempIn") sawIn = true;
    if (p.node.callee.name === "uTempN" && String(CORE.slice(p.node.start - 60, p.node.start)).includes("x.cond.tempF")) sawSeed = true;
  },
});
if (sawIn) ok("the form canonicalises on save (uTempIn)");
else fail("nothing calls uTempIn — the form stores the typed number, so a metric climber writes Celsius into a Fahrenheit column");
if (sawSeed) ok("the form seeds an existing report in the climber's own unit");
else fail("the editor seeds from raw tempF — a metric climber reopening their report sees Fahrenheit in the box");
if (/TEMP "\+\(uImp\(\)\?/.test(CORE)) ok("the field LABEL names the unit being asked for");
else fail('the label is fixed text — it must say which scale it wants, or a metric climber types Celsius under a "degF" heading');
// ...and no display site may hard-code the scale again.
const baked = (CORE.match(/tempF\s*\+\s*"\\u00b0F"|tempF\+"\u00b0F"/g) || []).length;
if (baked) fail(`${baked} site(s) still append a fixed degF to a reported temperature`);

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — a climber's own temperature reads, and is stored, in the units they chose.");
