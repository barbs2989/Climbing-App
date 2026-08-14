// check:suggestion-discs — a climber's suggestions must cover every discipline they climb,
// and a climb they merely LOOKED AT must never be described as one they have climbed.
//
// The bug this exists for shipped and sat there: `suggestionProfile` ended
// `Object.keys(byDisc).sort(by count)[0]` — it kept the single most-logged discipline and
// threw the rest away. Log 6 sport and 5 alpine and the alpine half of your logbook was
// invisible, and a couple of new logs could flip the entire feed. Nothing caught it: every
// identifier was bound, the section rendered, and the rows it showed were correct FOR the one
// discipline it had picked. A feed that is right about a third of your climbing looks exactly
// like a feed that is right.
//
// THE STRUCTURAL HALF IS THE IMPORTANT HALF, and no unit test can reach it. The DB reader
// filtered at the QUERY — `useSubtreeRoutes(area.id, {disc: profile.disc})` — so the other
// disciplines were never fetched and no client-side ranking could have recovered them. A
// perfectly correct `suggestDiscSlots` returning three slots is worth nothing if the pool it
// ranks only ever contains one discipline. Section 2 is what stops that coming back.
//
// Static: the pure functions are lifted out of the real source and run with stubbed
// dependencies, so this cannot drift from the app. No browser, no DB — it sits in the build.
import { readFileSync } from "node:fs";

const CORE = readFileSync(new URL("../ClimbMatchCore.jsx", import.meta.url), "utf8");
const DBB = readFileSync(new URL("../lib/DbAreaBrowser.jsx", import.meta.url), "utf8");

// Fail closed: an empty read makes every assertion below pass vacuously.
if (CORE.length < 100000 || DBB.length < 10000) {
  console.error("check:suggestion-discs FAILED — sources look truncated; nothing was verified.");
  console.error(`  ClimbMatchCore.jsx ${CORE.length} bytes, lib/DbAreaBrowser.jsx ${DBB.length} bytes`);
  process.exit(1);
}

function extractFn(src, marker, what) {
  const i = src.indexOf(marker);
  if (i < 0) {
    console.error(`check:suggestion-discs FAILED — ANCHOR LOST: could not find ${what} (${marker}).`);
    console.error("  If it was renamed deliberately, update this script's marker — do not delete the check.");
    process.exit(1);
  }
  let depth = 0, start = src.indexOf("{", i);
  for (let k = start; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}" && --depth === 0) return src.slice(i, k + 1);
  }
  console.error(`check:suggestion-discs FAILED — unbalanced braces after ${marker}`);
  process.exit(1);
}

// ── 1. the slot logic, run for real ───────────────────────────────────────────
// Dependencies are stubbed rather than extracted: `catOf`/`routeGradeVal`/`suggGainFt` are
// unchanged by this work and drag in shortGrade + the whole grade-scale table. What is under
// test is which DISCIPLINES survive, so a fixture route carries its discipline directly.
const fns = [
  extractFn(CORE, "function _suggAccum(", "_suggAccum"),
  extractFn(CORE, "function _suggShape(", "_suggShape"),
  extractFn(CORE, "function suggestionProfile(", "suggestionProfile"),
  extractFn(CORE, "function suggestDiscSlots(", "suggestDiscSlots"),
].join("\n");

if (!/var SUGGEST_DISC_MAX\s*=\s*(\d+)/.test(CORE)) {
  console.error("check:suggestion-discs FAILED — SUGGEST_DISC_MAX is gone; the slot cap is unpinned.");
  process.exit(1);
}
const MAXN = Number(RegExp.$1);

const run = new Function("logs", "routeById", "viewed", `
  var SUGGEST_DISC_MAX = ${MAXN};
  function catOf(r){ return r && r.disc; }
  function routeGradeVal(r){ return r && r.gv != null ? r.gv : -1; }
  function suggGainFt(r){ return r && r.gain != null ? r.gain : null; }
  function routeCompleted(id, logs){ return (logs||[]).some(function(l){ return l.routeId===id && l.done; }); }
  ${fns}
  var p = suggestionProfile(logs, routeById);
  return { profile: p, slots: suggestDiscSlots(p, viewed) };
`);

const R = {
  s1: { id: "s1", disc: "sport", gv: 0.4, gain: 400 },
  s2: { id: "s2", disc: "sport", gv: 0.5, gain: 500 },
  s3: { id: "s3", disc: "sport", gv: 0.6, gain: 600 },
  a1: { id: "a1", disc: "alpine", gv: 0.3, gain: 4000 },
  a2: { id: "a2", disc: "alpine", gv: 0.35, gain: 4200 },
  i1: { id: "i1", disc: "ice", gv: 0.5, gain: 900 },
  b1: { id: "b1", disc: "bouldering", gv: 0.7, gain: 40 },
  m1: { id: "m1", disc: "mixed", gv: 0.5, gain: 800 },
};
const byId = (id) => R[id] || null;
const done = (...ids) => ids.map(id => ({ routeId: id, done: true }));

const failures = [];
const check = (name, cond, detail) => {
  if (!cond) failures.push(name + (detail ? " — " + detail : ""));
  console.log(`  ${cond ? "ok  " : "FAIL"}  ${name}`);
};

// The regression itself.
{
  const { profile } = run(done("s1", "s2", "s3", "a1", "a2"), byId, []);
  check("every logged discipline survives, not just the busiest",
    profile.discs.length === 2 && profile.discs.map(d => d.disc).join(",") === "sport,alpine",
    `got ${profile.discs.map(d => d.disc).join(",") || "(none)"}`);
  check("the busiest is still first", profile.discs[0].disc === "sport");
  check("back-compat: profile.disc still names the top discipline", profile.disc === "sport");
  check("back-compat: gradeVal/avgGainFt still describe that top discipline",
    profile.gradeVal === profile.discs[0].gradeVal && profile.avgGainFt === profile.discs[0].avgGainFt);
  check("each slot carries its own grade centre (not the top one's)",
    profile.discs[1].gradeVal !== profile.discs[0].gradeVal,
    "alpine and sport would rank identically if they shared a target");
  check("logged slots are labelled logged", profile.discs.every(d => d.src === "logged"));
}

// Browsing earns a discipline a row — the half the user asked for.
{
  const { slots } = run(done("s1", "s2"), byId, [R.i1, R.i1]);
  check("a browsed-only discipline gets a slot", slots.some(s => s.disc === "ice" && s.src === "viewed"));
  check("logged outranks browsed", slots[0].src === "logged" && slots[0].disc === "sport");
}

// The honesty rule: a page view must never be reported as a climb.
{
  const { slots } = run(done("s1", "s2"), byId, [R.s3, R.s3, R.s3]);
  const sport = slots.filter(s => s.disc === "sport");
  check("a discipline both logged and browsed appears ONCE", sport.length === 1, `got ${sport.length}`);
  check("...and keeps the logged label, never 'viewed'", sport[0] && sport[0].src === "logged");
}

// A climber with no logbook at all still gets suggestions.
{
  const { profile, slots } = run([], byId, [R.a1, R.a2]);
  check("no logs is still a null profile (unchanged contract)", profile === null);
  check("but browsing alone still produces a slot", slots.length === 1 && slots[0].disc === "alpine" && slots[0].src === "viewed");
}

// Nothing at all.
{
  const { profile, slots } = run([], byId, []);
  check("no logs and no views produces nothing", profile === null && slots.length === 0);
}

// The cap is real, and counted across BOTH sources.
{
  const { slots } = run(done("s1", "a1", "i1"), byId, [R.b1, R.m1]);
  check(`slots are capped at SUGGEST_DISC_MAX (${MAXN})`, slots.length === MAXN, `got ${slots.length}`);
  check("the cap spends its slots on logged disciplines first", slots.every(s => s.src === "logged"));
}

// An incomplete log is not a climb.
{
  const { profile } = run([{ routeId: "s1", done: true }, { routeId: "a1", done: false }], byId, []);
  check("an unfinished log does not earn its discipline a slot",
    profile.discs.length === 1 && profile.discs[0].disc === "sport");
}

// ── 2. the structural half: the DB pool must stay discipline-BLIND ────────────
// This is what actually broke, and it is invisible to everything above.
const sugStart = DBB.indexOf("function DbSuggestedClimbs(");
if (sugStart < 0) {
  console.error("check:suggestion-discs FAILED — ANCHOR LOST: DbSuggestedClimbs is gone from lib/DbAreaBrowser.jsx.");
  process.exit(1);
}
// Bound the slice at the next top-level function so a `disc:` belonging to some other
// component cannot be read as this one's.
const sugEnd = DBB.indexOf("\nfunction ", sugStart + 1);
const sug = DBB.slice(sugStart, sugEnd < 0 ? DBB.length : sugEnd);
// Comments are stripped first: this component EXPLAINS the rule in prose that names
// `{disc: profile.disc}`, so a scan that read comments would fail on the explanation of the
// fix. Same trap check:ci-cancel and check:correction-readers both record.
const sugCode = sug.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const poolCall = sugCode.match(/useSubtreeRoutes\s*\([^)]*\)/);
check("DbSuggestedClimbs still fetches a pool", !!poolCall);
check("the pool query does NOT filter by discipline",
  !!poolCall && !/\bdisc\s*:/.test(poolCall[0]),
  poolCall ? poolCall[0].slice(0, 120) : "no useSubtreeRoutes call found");
check("the pool is ranked per slot, not once for the whole profile",
  /discSlots\s*\(/.test(sugCode) && /\.map\s*\(\s*s\s*=>/.test(sugCode));

// ── 3. both readers must keep the two headings distinct ──────────────────────
for (const [label, src] of [["ClimbMatchCore.jsx", CORE], ["lib/DbAreaBrowser.jsx", DBB]]) {
  check(`${label}: says "been climbing" for a logged discipline`, /been climbing/.test(src));
  check(`${label}: says "been looking at" for a browsed one`, /been looking at/.test(src));
  check(`${label}: the two headings are chosen by src, never merged`, /src\s*===?\s*"viewed"/.test(src));
}

if (failures.length) {
  console.error(`\ncheck:suggestion-discs FAILED — ${failures.length} problem(s):`);
  failures.forEach(f => console.error("  - " + f));
  process.exit(1);
}
console.log(`\ncheck:suggestion-discs: ok — every logged discipline reaches the feed, browsing earns its own row, and the DB pool stays discipline-blind.`);
