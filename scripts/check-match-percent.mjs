#!/usr/bin/env node
// THE MATCH % MUST BLEND WHAT THE SCREEN SAYS IT BLENDS.
//
// compat() ended `Math.min(99, …)` while two of its terms were UNCAPPED — shared disciplines × 16
// and shared objectives × 14. The bounded terms alone summed to 78 of that 99, so a climber with a
// broad profile saturated before grade contributed anything:
//
//     16 of 30 seed pairs sat exactly on 99
//     on a rich profile, partner 5.6 and partner 5.14a BOTH read 99%
//     the 'My Objectives' pane showed 5.10a, 5.11a and 5.12b all at 99%
//
// while three separate surfaces told the climber the number "blends your shared objectives, grade
// range, disciplines, availability overlap and verified trust". The clamp was deciding the score,
// and grade — the signal that matters most for who you tie in with — could not move it at the top
// of the range, which is exactly where a partner search points you.
//
// The invariant this enforces is the executable form of that sentence: EVERY SIGNAL THE SCREEN
// NAMES MUST BE ABLE TO MOVE THE NUMBER. That is stronger than pinning weights, which would argue
// with any future rebalance, and it cannot go stale — reword the copy and the guard follows it.
//
// Static: one esbuild bundle of core, no browser and no database.
//
//   node scripts/check-match-percent.mjs

import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { readCoreSource } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);

let bad = 0, ran = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL  " + m); };
const dead = (m) => { console.log("  FAIL  " + m); console.log("\nthis run proved nothing."); process.exit(1); };

const corePath = path.join(ROOT, "ClimbMatchCore.jsx");
const src = readCoreSource();

// Comments are stripped before any SOURCE test: this guard's own subject is explained in a comment
// beside compat() that names the forbidden `Math.min(99,` shape, and a guard that fails on its own
// documentation is a trap this repo has recorded more than once.
const stripped = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

// ---- 1. THE CEILING MUST NOT BE A LITERAL, AND THE MAXIMUM MUST BE DERIVED.
// This is the half that stops the defect returning by a different route: the old code held the
// weights in one place and the ceiling in another, so adding a term drifted them apart silently.
const DERIVED = /COMPAT_MAX\s*=\s*COMPAT_BASE\s*\+\s*CMAX_DISC\s*\+\s*CMAX_GRADE\s*\+\s*CMAX_OBJ\s*\+\s*CMAX_VERIF\s*\+\s*CMAX_PACE\s*\+\s*CMAX_AVAIL\s*\+\s*CMAX_AREA/;
if (DERIVED.test(stripped)) ok("COMPAT_MAX is derived by summing the term maxima, not written down");
else fail("COMPAT_MAX is not derived from the CMAX_* constants — a new term can drift from the ceiling silently");

// compat() is the rescaled sum of compatParts()'s rows (the profile's "How you match" checklist reads the same rows), so
// the formula is the two bodies together.
const lift = (anchor) => {
  const start = stripped.indexOf(anchor);
  if (start < 0) dead("ANCHOR LOST: `" + anchor + "` — nothing below is meaningful");
  let depth = 0;
  for (let i = stripped.indexOf("{", start); i < stripped.length; i++) {
    if (stripped[i] === "{") depth++;
    else if (stripped[i] === "}") { depth--; if (depth === 0) return stripped.slice(start, i + 1); }
  }
  dead("could not balance " + anchor);
};
const compatBody = lift("function compat(a,b){");
if (!/compatParts\(a,b\)/.test(compatBody)) dead("compat() no longer sums compatParts() — section 7 and the lift below assume it does");
const body = lift("function compatParts(a,b){") + compatBody;
if (body.length < 1000) dead(`compat() lifted short (${body.length} chars) — refusing to judge it`);

if (!/Math\.min\(\s*99\s*,/.test(body)) ok("compat() no longer clamps at a literal 99");
else fail("compat() still clamps at a literal 99 — the ceiling decides the score instead of the blend");

// ---- Bundle core and use the REAL compat(), never a copy: a retyped formula would agree with
// itself whatever the app does.
const outdir = fs.mkdtempSync(path.join(ROOT, ".cm-match-pct-"));
process.on("exit", () => { try { fs.rmSync(outdir, { recursive: true, force: true }); } catch {} });
const out = path.join(outdir, "b.cjs");
const CORE = JSON.stringify(corePath);
await build({
  stdin: {
    contents: `export { compat, compatParts, compatWhy, compatUnknown, CLIMBERS, ME, CMAX_DISC, CMAX_GRADE, CMAX_OBJ, CMAX_VERIF, CMAX_PACE, CMAX_AVAIL, CMAX_AREA, COMPAT_BASE, COMPAT_TOP, COMPAT_MAX } from ${CORE};`,
    resolveDir: ROOT, loader: "js",
  },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const M = require_(out);
for (const k of ["compat", "compatParts", "compatWhy", "compatUnknown", "CMAX_DISC", "CMAX_GRADE", "CMAX_OBJ", "CMAX_VERIF", "CMAX_PACE", "CMAX_AVAIL", "CMAX_AREA", "COMPAT_BASE", "COMPAT_TOP", "COMPAT_MAX"]) {
  if (M[k] === undefined) dead(`core does not export ${k} — this guard cannot judge the formula`);
}
const { compat, CLIMBERS, ME, COMPAT_BASE, COMPAT_TOP, COMPAT_MAX } = M;
if (!Array.isArray(CLIMBERS) || CLIMBERS.length < 4) dead(`only ${CLIMBERS && CLIMBERS.length} seed climbers — the population is too thin to judge saturation`);

// ---- 2. THE ARITHMETIC REACHES BOTH ENDS OF THE DISPLAYED RANGE.
const summed = COMPAT_BASE + M.CMAX_DISC + M.CMAX_GRADE + M.CMAX_OBJ + M.CMAX_VERIF + M.CMAX_PACE + M.CMAX_AVAIL + M.CMAX_AREA;
if (COMPAT_MAX === summed) ok(`COMPAT_MAX (${COMPAT_MAX}) equals the sum of the term maxima`);
else fail(`COMPAT_MAX is ${COMPAT_MAX} but the term maxima sum to ${summed} — a term is unaccounted for`);

// A pair that maxes every signal. If a future term is added and left OUT of COMPAT_MAX, this
// overshoots and the result clamps below its own maximum, which this catches.
const DISCS = ["sport", "trad", "alpine"];
// LISTED AREAS (0300): dotted ltree paths; a shared one, or one inside the other, is the yes of a yes/no term.
const maxA = { name: "maxA", disciplines: DISCS, sportGrade: "5.11a", objectiveIds: ["o1", "o2", "o3"], verified: true, hikingSpeedFtHr: 1000, availability: ["sat", "sun"], partnerAreaPaths: ["usa.utah.ut_wasatch_range.ut_little_cottonwood_canyon"] };
const maxB = { ...maxA, name: "maxB" };
const topScore = compat(maxA, maxB);
if (topScore === COMPAT_TOP) ok(`a pair that maxes every signal scores exactly ${COMPAT_TOP}`);
else fail(`a maximal pair scores ${topScore}, not ${COMPAT_TOP} — the top of the range is unreachable or overshoots`);

// A pair that shares nothing. Every term at its floor must land on the base, or the displayed
// range is narrower than it claims.
const minA = { name: "minA", disciplines: ["sport"], sportGrade: "5.6", objectiveIds: ["a"], verified: false, hikingSpeedFtHr: 400, availability: ["mon"], partnerAreaPaths: ["usa.utah.ut_wasatch_range"] };
const minB = { name: "minB", disciplines: ["ice"], sportGrade: "5.14a", objectiveIds: ["z"], verified: false, hikingSpeedFtHr: 2000, availability: ["tue"], partnerAreaPaths: ["usa.washington.wa_north_cascades"] };
const botScore = compat(minA, minB);
if (botScore === COMPAT_BASE) ok(`a pair that shares nothing scores exactly ${COMPAT_BASE}`);
else fail(`a pair sharing nothing scores ${botScore}, not ${COMPAT_BASE}`);

// ---- 3. NO SATURATION. Each of these was measured on the defect and is quoted in the failure so
// a future reader can see how far it has moved rather than only that it moved.
const people = [ME, ...CLIMBERS];
const pairs = [];
for (const a of people) for (const b of people) if (a !== b) pairs.push([a, b]);
const ceiling = pairs.filter(([a, b]) => compat(a, b) === COMPAT_TOP).length;
if (ceiling <= 2) ok(`${ceiling} of ${pairs.length} seed pairs sit on the ceiling (was 16 of 30)`);
else fail(`${ceiling} of ${pairs.length} seed pairs sit on the ceiling — the clamp is deciding the score again`);

// The pane a climber actually reads must not show one number for climbers grades apart.
const paneVals = CLIMBERS.map((c) => compat(ME, c));
const distinct = new Set(paneVals).size;
if (distinct >= CLIMBERS.length - 1) ok(`the My Objectives pane shows ${distinct} distinct values across ${CLIMBERS.length} climbers (was 3 of 5)`);
else fail(`the pane shows only ${distinct} distinct values across ${CLIMBERS.length} climbers — it is not discriminating`);

// ---- 4. EVERY SIGNAL THE SCREEN NAMES MUST MOVE THE NUMBER.
// This is the invariant. It is deliberately NOT a check on any weight: a rebalance is allowed, a
// signal that stops mattering is not.
const base = { name: "base", disciplines: ["sport", "trad"], sportGrade: "5.11a", objectiveIds: ["o1", "o2"], verified: true, hikingSpeedFtHr: 1000, availability: ["sat", "sun"], partnerAreaPaths: ["usa.utah.ut_wasatch_range.ut_little_cottonwood_canyon.ut_hellgate_cliffs"] };
const withoutSignal = {
  disciplines: { ...base, disciplines: ["ice"] },
  "grade range": { ...base, sportGrade: "5.6" },
  "shared objectives": { ...base, objectiveIds: ["zz"] },
  // Listed at a DIFFERENT state: no path is the other or inside it. (Listed at the canyon ABOVE the
  // crag would still overlap — that is the two-way reach partners_in_area promises.)
  "listed areas": { ...base, partnerAreaPaths: ["usa.washington.wa_north_cascades"] },
  "verified": { ...base, verified: false },
  "availability overlap": { ...base, availability: ["wed"] },
  pace: { ...base, hikingSpeedFtHr: 300 },
};
const moves = {};
for (const [signal, variant] of Object.entries(withoutSignal)) {
  const a = compat(base, base), b = compat(base, variant);
  moves[signal] = a !== b;
  if (a !== b) ok(`${signal} moves the number (${a} -> ${b})`);
  else fail(`${signal} CANNOT move the number — it is ${a} either way, so the screen promises a signal that does nothing`);
}

// ---- 5. THE COPY IS TIED TO THE BEHAVIOUR ABOVE.
// A surface may not name a signal section 4 could not move. Reword the sentence and this follows
// it; add a signal to the sentence without wiring it and this fails.
// Keyed on "blends your …", NOT on the words "Match %" adjacent to it. A fourth surface — the
// compatibility panel's own tooltip — describes the same score in different words, and a
// pattern anchored on the label missed it entirely while it was claiming the score included
// DISTANCE, which compat() does not use.
const COPY_SITES = [...src.matchAll(/[Bb]lends your ([^"<]{20,240})/g)].map((m) => m[1]);
if (COPY_SITES.length >= 2) ok(`found ${COPY_SITES.length} surfaces describing what Match % blends`);
else dead(`found ${COPY_SITES.length} Match % descriptions — expected the glossary, the explainer and the tooltip. Cannot tie copy to behaviour.`);

// The rule is ONE-DIRECTIONAL: everything the copy names must be a real signal that moves the
// number. The reverse is not required — the sentence is a summary and may leave a signal out
// (it does: pace is unnamed), and demanding equality would forbid that.
const VOCAB = Object.keys(withoutSignal);
for (const [i, sentence] of COPY_SITES.entries()) {
  const items = sentence
    .replace(/\.$/, "")
    .split(/,| and /)
    .map((x) => x.trim())
    .filter(Boolean);
  if (items.length < 3) { fail(`copy site ${i + 1} lists only ${items.length} things: "${sentence.trim().slice(0, 90)}"`); continue; }
  const unknown = items.filter((it) => !VOCAB.some((v) => it.toLowerCase().includes(v.toLowerCase())));
  const dead_ = items.filter((it) => VOCAB.some((v) => it.toLowerCase().includes(v.toLowerCase()) && !moves[v]));
  if (unknown.length) fail(`copy site ${i + 1} promises ${unknown.map((u) => JSON.stringify(u)).join(", ")}, which this guard cannot tie to any signal in compat() — either wire it or stop naming it`);
  else if (dead_.length) fail(`copy site ${i + 1} promises ${dead_.join(", ")}, which cannot move the number`);
  else ok(`copy site ${i + 1} lists ${items.length} signals and every one of them moves the number`);
}

// ---- 6. THE BROWSE ROW MUST NOT BLAME THE CLIMBER FOR WHAT ITS OWN PROJECTION DROPS.
//
// Sections 1-5 are about the number. This is about the sentence shown when there is no number,
// and it is a separate question because, until 0209, the row that renders it could never reach
// section 4's signals: `_cand` hardcoded `objectiveIds:[]` and `profiles` had no availability or
// pace column, so compatUnknown was >= 3 for a complete profile and a bare one alike and every
// real climber read the refusal. 0209 added the columns and the list now passes each row its
// objectives, so 6a asserts BOTH halves: a complete row scores, a bare one still refuses. The
// refusal used to say
//
//     "New profile — not enough shared info to score a match yet"
//
// which is false twice over: "New profile" is said about established accounts with every field
// filled in, and "yet" promises a resolution nothing the climber does can bring about. Meanwhile
// the SEED partner card beside it renders a big {score}%, so the contrast is on screen.
//
// This changes strings and no identifier, which audit:silent-reverts says in its own closing
// caveat it cannot see — hence a gate rather than a probe.
const rowStart = stripped.indexOf("function RealClimberRow");
if (rowStart < 0) dead("ANCHOR LOST: `function RealClimberRow` — the browse row could not be found");
const rowEnd = stripped.indexOf("\nfunction ", rowStart + 10);
const row = stripped.slice(rowStart, rowEnd < 0 ? stripped.length : rowEnd);
if (row.length < 400) dead(`RealClimberRow lifted only ${row.length} chars — every assertion below would be vacuous`);

// 6a. THE STRUCTURAL FACT, executed rather than read. A hand-typed copy of `_cand` would agree
// with itself whatever the row does, which is the whole question.
const candSrc = (row.match(/var _cand=\{([\s\S]*?)\};/) || [])[1];
if (!candSrc) dead("ANCHOR LOST: _cand's object literal could not be lifted from RealClimberRow");
// eslint-disable-next-line no-new-func
// `listing` is the row's listed areas (0300); undefined here means "not read", exactly as the row sees it.
const buildCand = new Function("p", "objIds", "verified", "listing", "return {" + candSrc + "};");
const richRow = {
  id: "3f2a91cc-0000-4000-8000-000000000001", name: "Robin Belay", username: "robinb",
  show_name: true, resume_public: true, avatar: null, bio: "b", location: "Salt Lake City, UT",
  disciplines: ["sport", "trad", "alpine"], sport_grade: "5.11a", trad_grade: "5.10a",
  boulder_grade: "V4",
  // The COLUMN names (0209), not camelCase: the projection must read what PostgREST returns.
  availability: ["weekends", "weekday_am"], avail_week: ["sat_am", "sun_am"], hiking_speed_ft_hr: 1000,
};
const RICH_OBJ = (ME.objectiveIds && ME.objectiveIds.length) ? ME.objectiveIds.slice(0, 1).concat(["o2"]) : ["o1", "o2"];
const unkRich = M.compatUnknown(ME, buildCand(richRow, RICH_OBJ));
if (unkRich < 3) ok(`a complete real row can be scored (compatUnknown = ${unkRich}) — the projection reads the 0209 columns and the objectives it is handed`);
else fail(`_cand leaves ${unkRich} signals unknown for a COMPLETE profile, so every real climber reads the refusal again — the projection is dropping availability, pace or objectives (0209). Re-derive with scripts/oneoff/measure-browse-row-match-percent.mjs.`);
const bareRow = { id: "3f2a91cc-0000-4000-8000-000000000002", name: "Bare", disciplines: [] };
const unkBare = M.compatUnknown(ME, buildCand(bareRow, []));
if (unkBare >= 3) ok(`...and a bare row still refuses (compatUnknown = ${unkBare}) rather than scoring absences as a low match`);
else fail(`a row that shares nothing leaves only ${unkBare} signals unknown, so it renders a % built from absences — #612's defect`);
// Objectives not yet read (or failed) must not score as "has none": the row gates on them first.
const gateAt = row.indexOf("!_objReady?"), refuseAt = row.indexOf("_unk>=3?");
if (gateAt >= 0 && refuseAt > gateAt) ok("...and no score renders before the row's objectives have been read");
else fail("RealClimberRow can render a match % before its objectives are read — an unread list would score as ZERO shared objectives");

// 6b. THE REFUSAL'S OWN TEXT, lifted rather than matched in place, so the assertions below are
// about the sentence a climber reads and not about anything else in the row.
// `=== null` rather than a falsiness test, and the injection suite is what forced that: an EMPTY
// refusal matches, and reading it as a lost anchor reported a DELETED sentence as a broken guard.
// The two want opposite repairs — re-point the guard, versus put the sentence back.
const refusalM = row.match(/_unk>=3\?<div[^>]*>([^<]{0,200})</);
if (refusalM === null) dead("ANCHOR LOST: the refusal branch's text could not be lifted from RealClimberRow");
const refusal = refusalM[1];

// The two false claims. Keyed on what may not be SAID, never on today's exact wording — a guard
// pinned to one phrasing forbids improving it, which this file already records for
// check:offline-claims' `disclaimer-reworded`.
if (!/new profile/i.test(refusal)) ok("the refusal does not call an established profile NEW");
else fail(`the browse row calls every real climber a "New profile" — the gap is \`_cand\`'s projection, not the climber's account: ${JSON.stringify(refusal)}`);

if (!/\byet\b/i.test(refusal)) ok("...and does not promise the score arrives once they fill something in");
else fail(`the refusal says the score is unavailable "yet" — three of the four signals have no column on \`profiles\`, so nothing the climber does resolves it: ${JSON.stringify(refusal)}`);

// 6c. ...AND IT MUST STILL SAY SOMETHING. A rule that only forbids is satisfied by deleting the
// line, which would leave the seed card's big {score}% unexplained beside a row that has none.
// Length, not wording, for the same reason as above.
if (refusal.trim().length >= 15) ok(`...and still explains why there is no percentage (${refusal.trim().length} chars)`);
else fail(`the browse row no longer explains the missing match % (${JSON.stringify(refusal)}) — the seed card beside it renders one, so the absence needs a sentence`);

// ---- 7. "HOW YOU MATCH" EXPLAINS THE NUMBER IT SITS UNDER.
// The profile's checklist is built from compatParts(), the rows compat() sums, so an explanation cannot argue with
// the score. Asserted: the rows ARE the score, there is one sentence per scored term, a signal that moves the number
// changes its sentence, and nobody's missing field is described as a mismatch.
{
  const parts = M.compatParts(base, base);
  const sum = COMPAT_BASE + parts.reduce((t, x) => t + x.max, 0);
  if (sum === COMPAT_MAX && parts.length === 7) ok(`compatParts() has ${parts.length} rows whose maxima sum to COMPAT_MAX (${COMPAT_MAX})`);
  else fail(`compatParts() has ${parts.length} rows summing to ${sum}, not COMPAT_MAX ${COMPAT_MAX} — the checklist and the score disagree about the terms`);
  const why = (a, b) => Object.fromEntries(M.compatWhy(a, b).map((r) => [r.k, r]));
  const w0 = why(base, base);
  if (Object.keys(w0).length === parts.length && Object.values(w0).every((r) => r.text && r.text.length >= 6)) ok("compatWhy() writes a sentence for every scored term");
  else fail("compatWhy() leaves a scored term without a sentence");
  const KEY = { disciplines: "disc", "grade range": "grade", "shared objectives": "obj", "listed areas": "area", verified: "verif", "availability overlap": "avail", pace: "pace" };
  for (const [signal, variant] of Object.entries(withoutSignal)) {
    const k = KEY[signal], before = w0[k], after = why(base, variant)[k];
    if (before && after && before.text !== after.text && before.tone !== after.tone) ok(`losing ${signal} changes its "How you match" line ("${before.text}" -> "${after.text}")`);
    else fail(`losing ${signal} moves the score but not its "How you match" line — the checklist would explain a number it does not describe`);
  }
  // A side that never said is "unk", never "bad": the score is neutral there (#612), and so must the sentence be.
  const blank = { name: "blank" };
  const wb = M.compatWhy(base, blank).filter((r) => r.k !== "verif");
  const bad_ = wb.filter((r) => r.tone !== "unk");
  if (!bad_.length) ok("an unfilled profile reads as NOT SAID on every line, never as a mismatch");
  else fail(`an unfilled profile reads as ${bad_.map((r) => r.k + "=" + r.tone).join(", ")} — absence is being described as a mismatch`);
  // The panel renders compatWhy() with the SAME viewer object it scores with: the partner row scores ME's MOUNTAIN
  // objectives (matchObjectiveIds), and the profile once scored ME.objectiveIds, so one climber read two numbers.
  const fpStart = stripped.indexOf("function FullProfile(");
  const fp = fpStart < 0 ? "" : stripped.slice(fpStart, stripped.indexOf("\nfunction ", fpStart + 10));
  if (fp.length < 2000) dead("ANCHOR LOST: FullProfile could not be lifted");
  const meVar = (fp.match(/score=climber\._real\?\(\(realObjQ\.data&&_unkN<3\)\?compat\((\w+),climber\)/) || [])[1];
  if (!meVar) dead("ANCHOR LOST: FullProfile's score expression");
  if (meVar !== "ME" && new RegExp(meVar + "=Object\\.assign\\(\\{\\},ME,\\{objectiveIds:Array\\.isArray\\(ME\\.matchObjectiveIds\\)").test(fp)) ok("the profile scores with ME's mountain objectives, as the partner row does");
  else fail("the profile scores with ME.objectiveIds while the partner row scores ME.matchObjectiveIds — the same climber reads two different match %s");
  if (fp.includes("compatWhy(" + meVar + ",climber)")) ok("the profile's \"How you match\" checklist explains that same score");
  else fail("the profile does not render compatWhy() for the viewer it scores — the match % has no explanation, or explains a different pair");
}

// ---- Fail closed on a run that quietly stopped asking.
const FLOOR = 20;
if (ran < FLOOR) dead(`only ${ran} assertions ran, expected at least ${FLOOR} — this run proved less than it claims`);

console.log(bad ? `\n${bad} problem(s).` : `\nok — the match % blends what the screen says it blends (${ran} assertions)`);
process.exit(bad ? 1 : 0);
