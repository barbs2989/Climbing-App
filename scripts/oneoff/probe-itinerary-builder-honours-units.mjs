#!/usr/bin/env node
// THE ITINERARY A CLIMBER TYPES, IN THE UNITS THEY DO NOT USE.
//
// The itinerary READER is already unit-aware — `ItineraryView` renders every day through
// uElev(d.gainFt), uDistMi(d.miles) and uMass(d.packLb), so a metric climber reads "152 m".
// The BUILDER is not. Its four numeric fields are labelled GAIN (FT) / LOSS (FT) /
// DISTANCE (MI) / PACK WEIGHT (LB) whatever the setting, they are SEEDED with the raw stored
// number, and they STORE WHAT WAS TYPED.
//
// So both halves are wrong and they are wrong in opposite directions:
//   - a metric climber reads a day as "152 m", opens it to edit, and the box says 500;
//   - and typing 152 meaning metres writes 152 FEET into a plan other climbers read back.
//
// The second is the same WRITE defect as #1578, where the log form asked "TEMP °F" and stored
// what was typed. A display defect misinforms one reader; a write corrupts the record for
// everyone. It is also the same defect the SAME FUNCTION already fixes one branch earlier:
// `structuredVal` converts a contributed waypoint's elev and distMi on the way in, and then
// hands the itinerary straight to itinDraftToStructured with no conversion at all.
//
// THE STORED UNITS STAY CANONICAL (feet, miles, pounds) and the conversion happens at the two
// boundary functions — itinDaysToDraft on the way in, itinDraftToStructured on the way out.
// That is the only place it can go: there are SEVEN call sites across two files, and every one
// of them passes a stored-unit day in and expects a stored-unit day back.
//
// SECTION 1 IS ABOUT THE FIX'S OWN RISK, not about the defect. Converting on both edges makes an
// UNTOUCHED field lossy — 500 ft shows as 152 m and comes back as 499 ft — so editing one day's
// note would silently move every figure on the plan. The draft carries the original numbers and
// an untouched field is written back unchanged.
//
// SECTION 5 IS THE SAME DEFECT IN THE DOWNLOADED FILE, which is worse than on the screen: a
// climber at the trailhead with no signal cannot go back and re-read the card it disagrees with.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const problems = [];
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); problems.push(m); };

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ItineraryEditor, BailoutForm, uDistMiIn, itinDaysToDraft, itinDraftToStructured, itinToText, __set_UNITS } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
export { itinDaysToDraft, itinDraftToStructured, itinToText, uDistMiIn, __set_UNITS };
export function renderEditor(itin) {
  return renderToStaticMarkup(React.createElement(ItineraryEditor, { itin, onChange: () => {} }));
}
export function renderBailout() {
  return renderToStaticMarkup(React.createElement(BailoutForm, { onSubmit: () => {}, onCancel: () => {}, peakCoord: null }));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-itin-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const M = require_(out);

// One stored day, in the canonical units the column holds.
const STORED = [{ n: 1, title: "Approach to camp", objective: "", gainFt: 500, lossFt: 120, hours: "4", miles: 3, packLb: 30, note: "", schedule: [] }];
const roundTrip = () => M.itinDraftToStructured({ days: M.itinDaysToDraft(STORED) }).days[0];

// ── 1. THE ROUND TRIP IS LOSSLESS IN BOTH SETTINGS. An untouched field must come back byte-equal:
//    a climber editing a title must not move the gain of every day on the plan by a rounding step.
for (const u of ["imperial", "metric"]) {
  M.__set_UNITS(u);
  const back = roundTrip();
  const bad = ["gainFt", "lossFt", "miles", "packLb"].filter((k) => back[k] !== STORED[0][k]);
  if (!bad.length) ok(`${u}: an untouched day round-trips unchanged (gain ${back.gainFt} ft, ${back.miles} mi, ${back.packLb} lb)`);
  else fail(`${u}: an untouched day was rewritten — ${bad.map((k) => `${k} ${STORED[0][k]} -> ${back[k]}`).join(", ")}`);
}

// ── 2. WHAT THE CLIMBER TYPES IS READ IN THEIR OWN UNITS. This is the write half, and the one
//    that corrupts a plan other climbers read: 152 typed by a metric climber means 152 metres.
//    THE VALUES MUST DIFFER FROM WHAT SEEDING PRODUCES, or the assertion is vacuous: 500 ft seeds
//    the box with 152, so "typing" 152 takes the untouched-field branch and returns the original
//    number with no conversion run at all. The first version of this section did exactly that and
//    passed against code that converted nothing.
M.__set_UNITS("metric");
const seeded = M.itinDaysToDraft(STORED)[0];
const typed = [Object.assign({}, seeded, { gainFt: "300", miles: "8", packLb: "20" })];
for (const [k, was] of [["gainFt", seeded.gainFt], ["miles", seeded.miles], ["packLb", seeded.packLb]])
  if (String(typed[0][k]) === String(was)) fail(`the ${k} case types the seeded value — it cannot exercise a conversion`);
const stored = M.itinDraftToStructured({ days: typed }).days[0];
const near = (a, b, tol) => a != null && Math.abs(a - b) <= tol;
if (near(stored.gainFt, 984, 2)) ok(`metric: 300 typed as metres stores ${stored.gainFt} ft`);
else fail(`metric: 300 typed as metres stored ${stored.gainFt} — the column is feet, so the plan claims a third of the climb`);
if (near(stored.miles, 4.97, 0.02)) ok(`metric: 8 typed as km stores ${stored.miles} mi`);
else fail(`metric: 8 typed as km stored ${stored.miles} — the column is miles`);
if (near(stored.packLb, 44, 1)) ok(`metric: 20 typed as kg stores ${stored.packLb} lb`);
else fail(`metric: 20 typed as kg stored ${stored.packLb} — the column is pounds`);

// ── 3. THE IMPERIAL SIDE IS UNTOUCHED. A fix that converted unconditionally would be worse than
//    the defect, so this is asserted rather than assumed.
M.__set_UNITS("imperial");
const impTyped = M.itinDaysToDraft(STORED).map((d) => Object.assign({}, d, { gainFt: "900", miles: "5", packLb: "40" }));
const impStored = M.itinDraftToStructured({ days: impTyped }).days[0];
if (impStored.gainFt === 900 && impStored.miles === 5 && impStored.packLb === 40)
  ok("imperial: what is typed is what is stored, unchanged");
else fail(`imperial: a typed value was converted — ${impStored.gainFt}/${impStored.miles}/${impStored.packLb}`);

// ── 4. THE SCREEN. The box must show the number the card showed, under a label naming that unit.
//    Asserted on the RENDER rather than on the helpers, because the label and the value are two
//    separate expressions and a fix that moved one and not the other reads as finished.
for (const [u, wantVal, wantLab, wrongLab] of [
  ["imperial", "500", "GAIN (FT)", "GAIN (M)"],
  ["metric", "152", "GAIN (M)", "GAIN (FT)"],
]) {
  M.__set_UNITS(u);
  const html = M.renderEditor({ days: M.itinDaysToDraft(STORED) });
  if (html.length < 900) { fail(`${u}: the editor rendered ${html.length} chars — too thin to assert against`); continue; }
  const hasVal = new RegExp(`aria-label="Gain \\(${u === "metric" ? "m" : "ft"}\\)"[^>]*value="${wantVal}"`).test(html)
    || new RegExp(`value="${wantVal}"[^>]*aria-label="Gain \\(${u === "metric" ? "m" : "ft"}\\)"`).test(html);
  if (hasVal) ok(`${u}: the gain box shows ${wantVal}, the same number the plan card shows`);
  else fail(`${u}: the gain box does not show ${wantVal} under a "${u === "metric" ? "m" : "ft"}" label — it seeds the raw stored value`);
  if (html.includes(wantLab) && !html.includes(wrongLab)) ok(`${u}: the field is labelled ${wantLab}`);
  else fail(`${u}: the field is not labelled ${wantLab} — it declares a unit the climber does not use`);
}
// ── 5. THE DOWNLOADED PLAN. `itinToText` writes the .txt a climber carries into the field, and
//    that file is the one place they cannot go back and re-read the screen — the rule
//    check:gpx-caveats already records for the GPX. It emitted feet, miles and pounds whatever the
//    setting, so a metric climber read metres on the card and carried a file in feet. It goes
//    through the SAME formatters the card uses, so the two cannot drift.
for (const [u, want, wrong] of [
  ["imperial", ["Gain 500 ft", "3 mi", "30 lb pack"], ["152 m", "4.8 km", "14 kg"]],
  ["metric", ["Gain 152 m", "4.8 km", "14 kg pack"], ["500 ft", "3 mi", "30 lb"]],
]) {
  M.__set_UNITS(u);
  const txt = M.itinToText({ days: STORED }, "Test Route");
  const missing = want.filter((w) => !txt.includes(w));
  const leaked = wrong.filter((w) => txt.includes(w));
  if (!missing.length && !leaked.length) ok(`${u}: the downloaded plan reads ${want.join(" · ")}`);
  else fail(`${u}: the downloaded plan is in the wrong units — missing [${missing}], still says [${leaked}]`);
}
M.__set_UNITS("imperial");

// ── 6. THE SECOND WRITER OF THE SAME COLUMN. A bail point becomes a Bailout WAYPOINT, and the
//    waypoint editor already converts `distMi` on the way in — so one store had two writers and
//    one ignored the setting, while the reader (`uDistMi(nearBail.distMi)` on the commitment line)
//    converted. A metric climber typed kilometres and read the number back as miles.
for (const [u, lab, wrong] of [["imperial", "DIST. TO SAFETY (MI)", "(KM)"], ["metric", "DIST. TO SAFETY (KM)", "(MI)"]]) {
  M.__set_UNITS(u);
  const html = M.renderBailout();
  if (html.length < 600) { fail(`${u}: the bail form rendered ${html.length} chars — too thin to assert against`); continue; }
  if (html.includes(lab) && !html.includes("DIST. TO SAFETY " + wrong)) ok(`${u}: the bail distance is labelled ${lab}`);
  else fail(`${u}: the bail distance is not labelled ${lab} — it declares a unit the climber does not use`);
}
// THE SUBMIT PATH IS ASSERTED AS SOURCE, and the first version of this got it wrong in a way only
// the injection showed: it exercised uDistMiIn directly, so reverting the FORM to Number(distMi)
// left it green — it was proving the helper works, not that the form calls it. SSR cannot click a
// button, so the wiring is read from the file, exactly as check:topo-outage-copy reads its prop
// chain. Matched on the expression rather than the helper's NAME, so the comment beside the fix
// (which names uDistMiIn while explaining it) cannot satisfy it.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
if (core.includes("distMi:distMi?uDistMiIn(distMi):undefined")) ok("the bail form submits through uDistMiIn, so km typed by a metric climber is stored as miles");
else fail("the bail form stores what was typed — the waypoint column is miles, and its reader converts");
if (!core.includes("distMi:distMi?Number(distMi):undefined")) ok("the raw submit expression is gone");
else fail("the raw submit expression is still there — the waypoint column is miles");
// The helper's own arithmetic, which the expression above depends on.
M.__set_UNITS("metric");
if (Math.abs(M.uDistMiIn("2") - 1.24) <= 0.02) ok("metric: 2 km converts to 1.24 mi");
else fail(`metric: 2 km converted to ${M.uDistMiIn("2")}`);
M.__set_UNITS("imperial");
if (M.uDistMiIn("2") === 2) ok("imperial: 2 miles is stored unchanged");
else fail(`imperial: 2 miles became ${M.uDistMiIn("2")}`);

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — the builder asks and answers in the climber's own units, and the stored plan stays canonical.");
