import { fileURLToPath } from "node:url";
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
import { readCoreSource, readAppFile } from "./lib/guard-sources.mjs";
import { displayGrade, splitProtection, gradeNumFor, gradeSystemForDiscipline } from "../lib/grade.js";

const CORE = readCoreSource();
const DBB = readAppFile(fileURLToPath(new URL("../lib/DbAreaBrowser.jsx", import.meta.url)));

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
// The fixture is GENERATED from MAXN rather than hand-listed, so this holds for any cap.
// Injection case 8 is why: hand-listing three logged disciplines silently assumed the cap was
// 3, so merely raising SUGGEST_DISC_MAX — a legitimate change — turned the build red on
// "spends its slots on logged first". A guard that fails correct work teaches people to
// ignore it, which is worse than the hole it closes.
{
  const R2 = {}, ids = [];
  for (let i = 0; i < MAXN + 1; i++) { const id = "L" + i; R2[id] = { id, disc: "logged" + i, gv: 0.4, gain: 500 }; ids.push(id); }
  const { slots } = run(ids.map(id => ({ routeId: id, done: true })), id => R2[id] || null, [{ id: "V0", disc: "browsedOnly", gv: 0.4, gain: 500 }]);
  check(`slots are capped at SUGGEST_DISC_MAX (${MAXN})`, slots.length === MAXN, `got ${slots.length}`);
  check("the cap spends its slots on logged disciplines first, never a browsed one",
    slots.every(s => s.src === "logged"), slots.map(s => s.src).join(","));
}

// An incomplete log is not a climb.
{
  const { profile } = run([{ routeId: "s1", done: true }, { routeId: "a1", done: false }], byId, []);
  check("an unfinished log does not earn its discipline a slot",
    profile.discs.length === 1 && profile.discs[0].disc === "sport");
}

// ── 1b. WHICH CLIMBS a slot is handed, run for real (2026-11-19) ──────────────
// Section 1 stubs the grade scale, so it could not see any of this: the ranking sorted by grade
// distance and took the first five WHATEVER the distance (a 5.7 climber at a crag of 5.10s was
// handed 5.10s under "Because you've been climbing Sport"), a grade the scale does not list
// ("5.10b/c", 1 climb in 12 of a live pool) scored as unknown, and a new account's own stated
// grades ranked nothing. Here the WHOLE suggestion block is lifted, with the real grade parser.
{
  const lines = CORE.split(/\r?\n/);
  const a = lines.findIndex(x => x.startsWith("function gradeLabel(")), b = lines.findIndex(x => x.startsWith("const TRIP={"));
  const need = [/^function catOf\(/, /^const ADDR_YDS=/, /^const ADDR_VS=/, /^const ADDR_WIS=/, /^const ADDR_MS=/, /^const ADDR_AIDS=/, /^const ADDR_CLS=/, /const ADDR_ALPINE=/].map(re => lines.find(x => re.test(x)));
  if (a < 0 || b < a || need.some(x => !x)) {
    console.error("check:suggestion-discs FAILED — ANCHOR LOST: the suggestion block (function gradeLabel( … const TRIP={) or a grade scale it reads is gone from ClimbMatchCore.jsx.");
    process.exit(1);
  }
  let F;
  try {
    F = new Function("displayGrade", "splitProtection", "gradeNumFor", "gradeSystemForDiscipline", "routeCompleted",
      need.join("\n") + "\n" + lines.slice(a, b).join("\n") + "\nreturn {routeGradeVal,suggestDiscSlots,rankSimilarRoutes,suggestSlotQuery,suggestWindow,ADDR_GRADES};")(
      displayGrade, splitProtection, gradeNumFor, gradeSystemForDiscipline, (id, logs) => (logs || []).some(l => l.routeId === id));
  } catch (e) {
    console.error("check:suggestion-discs FAILED — the suggestion block no longer runs on its own: " + e.message);
    console.error("  It now reads something outside (function gradeLabel( … const TRIP={). Pass it in above; do not delete the check.");
    process.exit(1);
  }
  const rt = (id, discipline, grade, extra) => ({ id, name: id, discipline, grade, ...(extra || {}) });
  const names = rows => rows.map(r => r.id).join(",");
  const slot = (disc, grade) => ({ disc, src: "logged", n: 3, gradeVal: F.routeGradeVal(rt("c", disc, grade)), avgGainFt: null });

  check("a slash grade the scale does not list still scores (5.10b/c)", F.routeGradeVal(rt("x", "sport", "5.10b/c")) >= 0);
  check("...and lands on the grade nearest its number", F.routeGradeVal(rt("x", "sport", "5.10b/c")) === F.routeGradeVal(rt("y", "sport", "5.10b")));
  check("a grade from ANOTHER system is not forced onto the scale (AI3 on an alpine rock scale)", F.routeGradeVal(rt("x", "alpine", "AI3")) < 0);

  const s58 = slot("sport", "5.8");
  check("a 5.8 climber is not handed 5.12s when that is all the crag has",
    F.rankSimilarRoutes([rt("h1", "sport", "5.12a"), rt("h2", "sport", "5.12c"), rt("h3", "sport", "5.13a")], s58, { limit: 5 }).length === 0,
    "the band must be empty so the honest fallback row shows instead");
  const s10 = slot("sport", "5.10a");
  const got = names(F.rankSimilarRoutes([rt("e57", "sport", "5.7"), rt("e58", "sport", "5.8"), rt("m", "sport", "5.10a"), rt("t", "sport", "5.10+"), rt("h", "sport", "5.11b")], s10, { limit: 5 }));
  check("the window around 5.10a keeps 5.8 through 5.10+ and drops 5.7 and 5.11b", got === "m,t,e58" || got === "m,e58,t", "got " + got);
  check("a climb with no grade on the scale is left out once there is a centre to measure from",
    names(F.rankSimilarRoutes([rt("m", "sport", "5.10a"), rt("u", "sport", "")], s10, { limit: 5 })) === "m");
  check("an area classic one step off outranks a no-name at the exact grade",
    names(F.rankSimilarRoutes([rt("plain", "sport", "5.10a"), rt("cl", "sport", "5.10b", { classic: true })], s10, { limit: 5 })) === "cl,plain");
  check("...but quality never pulls in a climb the window left out",
    names(F.rankSimilarRoutes([rt("plain", "sport", "5.10a"), rt("far", "sport", "5.12a", { classic: true, stars: 5 })], s10, { limit: 5 })) === "plain");
  check("the other discipline is still never ranked into a slot",
    names(F.rankSimilarRoutes([rt("b", "bouldering", "V4"), rt("m", "sport", "5.10a")], s10, { limit: 5 })) === "m");

  // The pool query must COVER the window the ranking keeps, or in-window climbs are never fetched.
  const q = F.suggestSlotQuery(s10), gl = F.ADDR_GRADES.sport, w = F.suggestWindow("sport");
  check("a sport slot asks for sport, on the YDS scale, with a grade range", q.disc === "sport" && q.gradeSys === "yds" && q.minGrade != null && q.maxGrade != null && q.minGrade <= q.maxGrade, JSON.stringify(q));
  const missed = gl.filter((g, i) => { const d = i / gl.length - s10.gradeVal; if (d > w.up + 1e-9 || d < -w.down - 1e-9) return false; const n = gradeNumFor(g, "sport"); return n < q.minGrade || n > q.maxGrade; });
  check("every grade the ranking would keep is inside the range the pool asks for", missed.length === 0, "outside the query: " + missed.join(" "));
  check("the pool comes back best-rated first, not by name", q.sortBy === "stars_desc");
  const qa = F.suggestSlotQuery(slot("alpine", "5.6"));
  check("an alpine slot takes no grade range (its climbs are graded on three systems)", /\balpine\b/.test(qa.disc) && qa.gradeSys == null && qa.minGrade == null, JSON.stringify(qa));
  check("a slot with no grade centre asks for the discipline alone", (() => { const x = F.suggestSlotQuery({ disc: "sport", src: "viewed", gradeVal: null }); return x.disc === "sport" && x.minGrade == null; })());

  // EXPERIENCE: the grades on the climber's own profile.
  const st = F.suggestDiscSlots(null, [], undefined, { sport: "5.11a", trad: "N/A", bouldering: "" });
  check("a new account's stated grade earns a slot", st.length === 1 && st[0].disc === "sport" && st[0].src === "stated" && st[0].gradeVal >= 0, JSON.stringify(st));
  check("N/A and blank are not grades", !st.some(x => x.disc === "trad" || x.disc === "bouldering"));
  const both = F.suggestDiscSlots({ discs: [{ disc: "sport", src: "logged", n: 2, gradeVal: 0.3, avgGainFt: null }] }, [], undefined, { sport: "5.13a", trad: "5.9" });
  check("a logged discipline is never restated: what you climbed outranks what you said",
    both.filter(x => x.disc === "sport").length === 1 && both[0].src === "logged" && both[0].gradeVal === 0.3);
  check("...and a stated discipline you have not logged still gets its slot", both.some(x => x.disc === "trad" && x.src === "stated"));
  const sv = F.suggestDiscSlots(null, [rt("v", "ice", "WI4"), rt("v2", "sport", "5.9")], undefined, { sport: "5.11a" });
  check("stated sits ahead of browsed, and a discipline that is both is the stated slot",
    sv[0].disc === "sport" && sv[0].src === "stated" && sv.filter(x => x.disc === "sport").length === 1 && sv.some(x => x.disc === "ice" && x.src === "viewed"), JSON.stringify(sv.map(x => x.disc + ":" + x.src)));
}

// ── 2. the structural half: EVERY slot must get its OWN pool ──────────────────
// This is what actually broke, and it is invisible to everything above. First (2026-09) the one
// pool was filtered to the single most-logged discipline. Then it was made discipline-blind, and
// became the area's first 120 climbs BY NAME for every slot: in a region of 8,238 climbs the
// "personal" rows were the grade-nearest of the names sorting before "Ai" (2026-11-19). The rule
// both failures break is the same: each slot the climber has must be FETCHED for.
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

const slotCalls = [...sugCode.matchAll(/useSubtreeRoutes\s*\([^;]*?slotOpts\(\s*(\d+)\s*\)\s*\)/g)].map(m => Number(m[1]));
check(`one pool read per slot the cap allows (SUGGEST_DISC_MAX = ${MAXN})`,
  slotCalls.length === MAXN && slotCalls.every((n, i) => n === i),
  `found slot reads for [${slotCalls.join(",")}]; a slot with no read of its own is never fetched for — raise or lower the hooks with the cap`);
check("each slot's read is built from THAT slot (slotQuery(slots[i]))", /slotQuery\(\s*slots\[\s*i\s*\]\s*\)/.test(sugCode));
check("no read is keyed on the single top discipline", !/profile\.disc\b/.test(sugCode), "profile.disc is the busiest discipline only — the 2026-09 bug");
const fallbackCall = sugCode.match(/useSubtreeRoutes\s*\([^;]*?\{\s*sortBy[^}]*\}\s*\)/);
check("the fallback pool is discipline-blind and not sorted by name",
  !!fallbackCall && !/\bdisc\s*:/.test(fallbackCall[0]) && !/sortBy:\s*"name"/.test(fallbackCall[0]),
  fallbackCall ? fallbackCall[0].slice(0, 140) : "no fallback useSubtreeRoutes({ sortBy … }) call found");
check("the pools are ranked per slot, each against its own read",
  /discSlots\s*\(/.test(sugCode) && /slots\.map\s*\(\s*\(\s*s\s*,\s*i\s*\)\s*=>/.test(sugCode) && /slotQs\[\s*i\s*\]/.test(sugCode));
check("the stated grades reach the slots", /discSlots\s*\([^)]*\bstated\s*\)/.test(sugCode));

// ── 2b. the panel is COLLAPSED until the climber opens it — and can be opened ────
// History: both components once shipped `useState(false)`; a later pass made them auto-open on
// objectives/recents, reasoning that rows nobody opens are worth nothing. The user reversed that
// on 2026-09-30: the suggested climbs should NOT be spread across the area page by default — you
// tap "Suggested climbs · N" to see them. So this section now pins the opposite rule: starts
// closed, no content-driven auto-open, and the header is a real toggle that says its state.
for (const [label, src, sug] of [
  ["ClimbMatchCore.jsx", CORE, CORE.slice(CORE.indexOf("function SuggestedClimbs("), CORE.indexOf("\nfunction ", CORE.indexOf("function SuggestedClimbs(") + 1))],
  ["lib/DbAreaBrowser.jsx", DBB, DBB.slice(DBB.indexOf("function DbSuggestedClimbs("), DBB.indexOf("\nfunction ", DBB.indexOf("function DbSuggestedClimbs(") + 1))],
]) {
  const code = sug.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  check(`${label}: the panel starts collapsed`,
    /\[\s*open\s*,\s*setOpen\s*\]\s*=\s*useState\(\s*false\s*\)/.test(code),
    "the user decided (2026-09-30) suggestions stay behind the dropdown until tapped");
  check(`${label}: nothing opens it on the climber's behalf`, !/autoOpen|openManual/.test(code),
    "a content-driven auto-open is exactly what was removed");
  check(`${label}: the header toggles it`, /onClick=\{\s*\(\)\s*=>\s*setOpen\(\s*o\s*=>\s*!o\s*\)\s*\}/.test(code),
    "collapsed with no toggle would make the ranking unreachable");
  check(`${label}: the toggle announces its state`, /aria-expanded=\{\s*open\s*\}/.test(code));
}

// ── 3. both readers must keep the two headings distinct ──────────────────────
for (const [label, src] of [["ClimbMatchCore.jsx", CORE], ["lib/DbAreaBrowser.jsx", DBB]]) {
  check(`${label}: says "been climbing" for a logged discipline`, /been climbing/.test(src));
  check(`${label}: says "been looking at" for a browsed one`, /been looking at/.test(src));
  check(`${label}: the two headings are chosen by src, never merged`, /src\s*===?\s*"viewed"/.test(src));
}
check('lib/DbAreaBrowser.jsx: a stated grade has its OWN heading, never "been climbing"',
  /src\s*===?\s*"stated"/.test(sugCode) && /near the grade on your profile/.test(sugCode));

if (failures.length) {
  console.error(`\ncheck:suggestion-discs FAILED — ${failures.length} problem(s):`);
  failures.forEach(f => console.error("  - " + f));
  process.exit(1);
}
console.log(`\ncheck:suggestion-discs: ok — every logged discipline reaches the feed, a stated grade and browsing each earn their own row, every slot reads its own pool, and nothing outside the climber's grade window is suggested.`);
