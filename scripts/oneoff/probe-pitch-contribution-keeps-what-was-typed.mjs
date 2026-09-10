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
// ── The branch converts what was typed into the canonical metres the column holds, so the probe
//    must supply that converter. It is LIFTED from ClimbMatchCore.jsx (where it lives beside
//    uElevN/uElevIn) rather than re-typed: a copy would agree with itself whatever the app did.
//    THIS PROBE'S SUBJECT IS FIELD RETENTION, so it runs METRIC, where the conversion is the
//    identity and the assertions below mean exactly "what was typed is what is stored". The UNIT
//    half lives in check:units' `pitches` section, which unlike scripts/oneoff/ actually runs.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const unum = core.match(/const _uNum=([\s\S]*?);\n/);
const uliSrc = core.match(/const uLenIn=([\s\S]*?\});\n/);
if (!unum || !uliSrc) { console.error("ANCHOR LOST: _uNum/uLenIn are not in ClimbMatchCore.jsx where this probe reads them"); process.exit(1); }
const mkRun = (imperial) => {
  const uLenIn = new Function("uImp", "_uNum", "return " + uliSrc[1])(() => imperial, new Function("return " + unum[1])());
  const f = new Function("vals", "uLenIn", "uImp", "return " + branch + ";");
  return (vals) => f(vals, uLenIn, () => imperial);
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

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — what the pitch editor collects is what the contribution carries.");
