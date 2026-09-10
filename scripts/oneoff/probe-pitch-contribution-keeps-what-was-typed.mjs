#!/usr/bin/env node
// THE PITCH EDITOR COLLECTS SEVEN FIELDS AND THE SUBMIT PATH STORES THREE.
//
// `SuggestFix`'s pitch-by-pitch editor asks for grade, length, gear, notes, anchor, bolts and
// crux, renders them back in its own summary line, and then `structuredVal`'s `pitches` branch
// builds the row that is actually submitted:
//
//   {n, grade, lengthM: parseInt(p.len)||null, gear, note, bolts:0, anchor:"", crux:false, …}
//
// Two separate ways that throws work away:
//
//   1. IT READS A KEY NOTHING WRITES. Every editor row is `{pitch, grade, lengthM, gear, notes,
//      anchor, bolts, crux}` — there is no `len`. So `parseInt(undefined)` is NaN, `NaN||null` is
//      null, and the length a climber typed is dropped. The comment above the editor records this
//      exact private-shape bug being fixed for the SUMMARY strings; the submit path kept it.
//   2. THREE FIELDS ARE HARDCODED EMPTY. bolts:0, anchor:"", crux:false, whatever was entered.
//
// And a pitch carrying ONLY a length is dropped ENTIRELY, because the filter tests the OUTPUT
// `lengthM` — which is the null this branch just produced. So contributing lengths alone records
// nothing at all, under a success toast.
//
// WHY NO EXISTING GUARD SEES IT. `check:contrib-fields` asks whether an offered FIELD is applied,
// and `pitchDetail` is — as a field. `check:contrib-shapes` asks whether what is submitted has the
// shape its readers read, and it does: `lengthM` is present, it is merely always null. The shape
// is right and the VALUE is gone, which is the one thing neither asks.
//
// THE MAPPER IS LIFTED FROM SOURCE AND EXECUTED, never re-typed: a copy would agree with itself
// whatever the app did, which is the whole question. ANCHOR LOST if it moves.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const problems = [];
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); problems.push(m); };

// ── Lift the branch. It is identified by the pitches type AND by building a pitch row, so the
//    summary-string function that shares the `f.type==="pitches"` test cannot be picked up instead.
// ANCHOR ON THE BRANCH, NOT ON THE DEFECT. The first version keyed on `lengthM:parseInt(` — the
// broken expression itself — so the moment the fix landed the probe reported ANCHOR LOST about a
// file it had just been made correct in. An anchor written from the defect dies with it.
const start = src.indexOf('if(f.type==="pitches")return (vals.pitchDetail');
if (start < 0) { console.error("ANCHOR LOST: the pitches submit branch is not where this probe reads it — re-read RouteDetail.jsx before trusting this"); process.exit(1); }
const key = start;
const end = src.indexOf('if(f.type==="waypoints")', key);
if (start < 0 || end < 0) { console.error("ANCHOR LOST: could not bound the pitches branch"); process.exit(1); }
const branch = src.slice(start + 'if(f.type==="pitches")return '.length, end).replace(/;\s*$/, "");
if (!/\.map\(/.test(branch) || !/\.filter\(/.test(branch)) { console.error("ANCHOR LOST: the pitches branch is not the map/filter shape this probe reads"); process.exit(1); }
// `vals.pitchDetail` is the editor's rows; bind it and run the app's own expression.
// ── UNITS. The branch now converts what was typed into the canonical metres the column holds, so
//    the probe must supply that converter — LIFTED from source like everything else here, with an
//    injectable uImp so BOTH settings are exercised. A re-typed converter would agree with itself
//    whatever the app did, which is the whole question.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const unum = core.match(/const _uNum=([\s\S]*?);\n/);
if (!unum) { console.error("ANCHOR LOST: _uNum moved — the converters are built on it"); process.exit(1); }
const uliSrc = src.match(/const uLenIn=([\s\S]*?\});\n/);
const ulnSrc = src.match(/const uLenN=([\s\S]*?\});\n/);
if (!uliSrc || !ulnSrc) { console.error("ANCHOR LOST: uLenN/uLenIn are not where this probe reads them — a pitch length is stored in METRES and the box asks in the climber's units, so the conversion is the thing under test"); process.exit(1); }
const mk = (expr, imperial) => new Function("uImp", "_uNum", "return " + expr)(() => imperial, new Function("return " + unum[1])());
const mkRun = (imperial) => {
  const f = new Function("vals", "uLenIn", "uImp", "return " + branch + ";");
  return (vals) => f(vals, mk(uliSrc[1], imperial), () => imperial);
};
// METRIC is the canonical case, so the assertions below read as "what was typed is what is stored".
const run = mkRun(false);

// ── The editor's OWN row shape, lifted too — a hand-written row could invent a key the editor
//    never sets, which is exactly the defect under test.
const bp = src.match(/const blankPitch=function\(n\)\{return (\{[^}]*\});\};/);
if (!bp) { console.error("ANCHOR LOST: blankPitch moved — the editor's row shape is what this compares against"); process.exit(1); }
const blank = new Function("n", "return " + bp[1] + ";")(1);
const editorKeys = Object.keys(blank);
ok(`the editor's row shape is ${editorKeys.join(", ")}`);
if (editorKeys.includes("len")) fail("the editor writes `len` — this probe assumes it does not; re-read both sides");

// ── A climber fills in every box on one pitch.
const typed = Object.assign({}, blank, {
  grade: "5.10a", lengthM: "45", gear: "Yellow C4", notes: "Sustained hands",
  anchor: "2 bolts", bolts: "4", crux: true,
});
const out = run({ pitchDetail: [typed] });

if (out.length === 1) ok("the filled pitch survives the filter");
else fail(`the filled pitch was dropped entirely (${out.length} rows out)`);
const row = out[0] || {};

for (const [label, got, want] of [
  ["length", row.lengthM, 45],
  ["anchor", row.anchor, "2 bolts"],
  ["bolts", row.bolts, 4],
  ["crux", row.crux, true],
]) {
  if (got === want) ok(`${label} reaches the submitted row as ${JSON.stringify(got)}`);
  else fail(`${label} was typed and the submitted row carries ${JSON.stringify(got)} — the climber's entry is discarded`);
}
// The three that always worked, asserted so a fix cannot trade one field for another.
for (const [label, got, want] of [["grade", row.grade, "5.10a"], ["gear", row.gear, "Yellow C4"], ["note", row.note, "Sustained hands"]]) {
  if (got === want) ok(`${label} still reaches the submitted row`);
  else fail(`${label} stopped reaching the submitted row — ${JSON.stringify(got)}`);
}

// ── A LENGTH ON ITS OWN. This is the sharpest form: the filter tests the OUTPUT lengthM, so while
//    that is null the whole row vanishes and the contribution records nothing.
const lenOnly = run({ pitchDetail: [Object.assign({}, blank, { lengthM: "50" })] });
if (lenOnly.length === 1 && lenOnly[0].lengthM === 50) ok("a pitch carrying only a length is kept, with its length");
else fail(`a pitch carrying only a length is discarded (${lenOnly.length} rows, lengthM ${JSON.stringify((lenOnly[0] || {}).lengthM)}) — nothing is recorded, under a success toast`);

// ── An EMPTY row must still be dropped, or every untouched blank pitch is submitted as a row.
const empties = run({ pitchDetail: [blank, blank] });
if (empties.length === 0) ok("untouched blank pitches are still dropped");
else fail(`${empties.length} blank pitch row(s) would be submitted`);

// ── AN IMPERIAL CLIMBER TYPES FEET AND THE COLUMN MUST STILL HOLD METRES. Before this, the box
//    was labelled "Length (m)" whatever the setting while PitchTable rendered the stored metres
//    back through uLen as FEET — so a climber read "148 ft", opened the editor, and was asked for
//    metres. Typing the feet they had just read stored 148 m and the route claimed 486 ft.
const impRun = mkRun(true);
const impOut = impRun({ pitchDetail: [Object.assign({}, blank, { lengthM: "148" })] });
const impLen = (impOut[0] || {}).lengthM;
if (impLen === 45) ok("148 typed by an imperial climber is stored as 45 m (canonical)");
else fail(`an imperial climber typing 148 ft stored ${JSON.stringify(impLen)} — the column holds metres`);

// NON-VACUITY: the two settings must DISAGREE on the same keystrokes, or nothing is converting.
const metOut = run({ pitchDetail: [Object.assign({}, blank, { lengthM: "148" })] });
if ((metOut[0] || {}).lengthM === 148 && impLen !== 148) ok("the same keystrokes store different values on the two settings — the conversion is real");
else fail(`metric stored ${JSON.stringify((metOut[0] || {}).lengthM)} and imperial ${JSON.stringify(impLen)} — one of them is not converting`);

// ── ROUND TRIP: what the box SHOWS for a stored length must store back unchanged, or simply
//    opening the editor and saving would re-round every untouched pitch.
const showImp = mk(ulnSrc[1], true), showMet = mk(ulnSrc[1], false);
let drift = [];
for (let m = 5; m <= 120; m++) {
  if ((impRun({ pitchDetail: [Object.assign({}, blank, { lengthM: String(showImp(m)) })] })[0] || {}).lengthM !== m) drift.push(m);
  if ((run({ pitchDetail: [Object.assign({}, blank, { lengthM: String(showMet(m)) })] })[0] || {}).lengthM !== m) drift.push(-m);
}
if (!drift.length) ok("every pitch length 5-120 m survives show->store unchanged on both settings");
else fail(`${drift.length} length(s) drift when shown and stored back untouched: ${drift.slice(0, 8).join(", ")}`);

// ── THE OTHER THREE EDGES ARE ASSERTED AS SOURCE, because a render/execute probe cannot see them
//    and each is exactly what a stale-base squash drops: the value still flows, in the wrong unit.
//    PREFILL is the dangerous one — without it an imperial climber opens a 45 m pitch, sees "45"
//    in a box labelled ft, changes nothing, saves, and the pitch becomes 14 m.
for (const [label, re, why] of [
  ["the prefill converts a stored length into the climber's units",
   /lengthM:p\.lengthM!=null\?uLenN\(p\.lengthM\):""/,
   "without it the box shows metres under a feet label, and saving an untouched pitch shrinks it 3.28x"],
  ["the box asks in the climber's own units",
   /length in "\+\(uImp\(\)\?"feet":"metres"\)/,
   "the label is what tells the climber which unit to type"],
  ["the box's placeholder follows the setting too",
   /placeholder=\{"Length \("\+uLenUnit\(\)\+"\)"\}/,
   "a placeholder reading (m) over a feet box is the same lie in smaller type"],
  ["the editor summary labels the unit it is showing",
   /pp\.lengthM\+uLenUnit\(\)/,
   "hardcoded \"m\" over a converted draft prints feet labelled metres"],
  ["the current-value summary is fed the SAME convention as the draft",
   /pitchStr\(routePitches\)/,
   "fed route.pitchDetail it would compare canonical metres against a display-unit draft"],
]) {
  if (re.test(src)) ok(label);
  else fail(`${label} — NOT FOUND. ${why}`);
}

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — what the pitch editor collects is what the contribution carries.");
