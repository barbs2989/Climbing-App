#!/usr/bin/env node
// check:area-page-honest — the area page prints only what is stored, and its counts add up.
//
// The area page gained ABOUT, AREA FACTS, CLIMBS HERE, GRADE SPREAD and GETTING THERE on
// 2026-10-15 (lib/AreaPageSections.jsx, lib/DbAreaBrowser.jsx). Three ways those can start lying
// without any test noticing, each the shape of a defect this repo has shipped before:
//
//   1. A FACT WITH NO VALUE. The facts grid is a list of `facts.push([label, value])`; a push
//      that is not gated on its own column prints "Rock — undefined" or "Walk-in — about 0 min"
//      at a climber (check:untracked-factors: a factor nobody measured must not read as zero).
//      Rule: every push sits on a line that begins `if (area.<col>`.
//   2. A HEADLINE THAT IS NOT THE SUM OF ITS BARS. The chart's title count must be computed
//      from the rows it draws, and a remainder the bars cannot show must be said in words
//      (check:count-matches-its-list: a count and the list under it agree, on ONE screen).
//   3. TWO WAYS TO DRIVE THERE. The bare "Directions" button in the action row was replaced by
//      the GETTING THERE card; if both exist again the page offers one destination twice, and
//      one of them will be the un-captioned one (check:trailhead-directions' rule, on the area).
//
// Static, so it sits in `npm run build`. Injection suite: scripts/oneoff/inject-area-edit-fields-cases.mjs.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
let fails = 0;
const fail = (m) => { console.log("  FAIL  " + m); fails++; };
const ok = (m) => console.log("  ok    " + m);

const sections = read("lib/AreaPageSections.jsx");
const browser = read("lib/DbAreaBrowser.jsx");

// ── 1. every fact is gated on its own column ──
const factsBody = (sections.match(/export function AreaFactsCard[\s\S]*?\n\}/) || [""])[0];
const pushes = factsBody.split("\n").filter((l) => /facts\.push\(/.test(l));
if (!pushes.length) fail("AreaFactsCard has no `facts.push(` — ANCHOR LOST");
for (const l of pushes) {
  if (!/^\s*if \(area\.[a-z_]+/.test(l)) fail(`a fact is pushed without a gate on its own column: ${l.trim().slice(0, 90)}`);
}
if (pushes.length && !fails) ok(`${pushes.length} facts, each gated on the column it prints`);
if (!/if \(!facts\.length && !season\)/.test(factsBody)) fail("AreaFactsCard no longer has an empty state — a card with nothing stored would render an empty grid");

// ── 2. the chart's headline is the sum of its bars ──
const chartBody = (sections.match(/export function ClimbsChart[\s\S]*?\n\}/) || [""])[0];
if (!/const sum = rows\.reduce\(/.test(chartBody)) fail("ClimbsChart's `sum` is no longer reduced from the rows it draws — ANCHOR LOST");
if (!/sum\.toLocaleString\(\) \+ " climb"/.test(chartBody)) fail("ClimbsChart's headline count is not `sum` — the title could disagree with the bars under it");
if (!/total > sum/.test(chartBody)) fail("ClimbsChart does not say when `total` exceeds the bars' sum — a remainder would be hidden");
if (/stats\.total\.toLocaleString\(\) \+ " climb"|total\.toLocaleString\(\) \+ " climb"/.test(chartBody)) fail("ClimbsChart prints `total` as its headline — that is the RPC's count, not the bars'");
const gradeBody = (sections.match(/export function GradeSpread[\s\S]*?\n\}/) || [""])[0];
if (!/total > shown/.test(gradeBody)) fail("GradeSpread no longer says how many climbs it left out (`total > shown`)");
if (!fails) ok("the chart's headline is the sum of its bars, and both charts say what they left out");

// ── 3. one way to drive there ──
const dir = (browser.match(/maps\/dir/g) || []).length;
if (dir !== 1) fail(`lib/DbAreaBrowser.jsx offers maps/dir ${dir} times — the area page must carry ONE drive control (the GETTING THERE card)`);
else ok("one drive control on the area page");
if (/>Directions<\/a>/.test(browser)) fail("the bare `Directions` link is back in the action row — the GETTING THERE card already drives there");
if (!/function AreaGettingThere\(/.test(browser)) fail("AreaGettingThere is gone from lib/DbAreaBrowser.jsx — ANCHOR LOST");
if (!/No directions on file yet/.test(browser)) fail("GettingThere has no empty state — a crag with nothing stored would render a bare card");
if (!/<PendingAreaEdits /.test(browser)) fail("the pending-edits banner is not mounted on the area page — a suggestion would be invisible until it landed");

if (fails) { console.log(`\ncheck:area-page-honest FAILED — ${fails} finding(s).`); process.exit(1); }
console.log("\ncheck:area-page-honest: ok — facts are gated on their columns, the chart's headline is its bars' sum, and the page drives there once.");
