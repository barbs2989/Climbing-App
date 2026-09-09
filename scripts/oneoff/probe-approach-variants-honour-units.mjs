#!/usr/bin/env node
// THE LAST WRONG-UNITS WRITE PATH: the approach-variants editor.
//
// `structuredVal`'s `variants` branch is the surviving member of the class #1578 and #1654 closed
// one instance at a time. Its two numeric fields were labelled "distance in miles" / "gain in feet"
// whatever the climber's setting, they were SEEDED with the raw stored number, and they STORED
// WHAT WAS TYPED:
//
//     var d=parseFloat(x.distMi);if(isFinite(d))o.distMi=d;
//     var g=parseInt(x.gainFt,10);if(isFinite(g))o.gainFt=g;
//
// So both halves were wrong, in opposite directions:
//   - the APPROACHES panel renders the same two numbers through uDistMi(v.distMi) and
//     uElev(v.gainFt), so a metric climber read "4.8 km" on the card, tapped the pencil, and the
//     box under it said 3;
//   - and typing 8 meaning kilometres wrote 8 MILES into a column other climbers read back.
//
// THE WRITE HALF IS WORSE THAN A DISPLAY DEFECT, and worse here than in the itinerary. These two
// fields are the ones `sameEditValue` compares NUMERICALLY WITH A TOLERANCE (numsClose, 0.1/0.2 on
// distMi and 0.1/50 on gainFt) so that two climbers who measure 4.8 and 4.9 miles are counted as
// agreeing. A stored kilometre does not merely display wrong: it lands 1.6x away from the same
// measurement taken on the other setting, so the two never cluster and the 3-agree gate the merge
// needs can never be reached — the correction sits pending forever.
//
// THE STORED UNITS STAY CANONICAL and the conversion happens at the two boundaries, which is the
// only place it can go: `avars` is one draft array read by the editor, by setAvar, and by
// structuredVal, and every reader of the STORED shape (the APPROACHES panel, sameEditValue, the
// enrichment) expects miles and feet.
//
// SECTION 1 IS ABOUT THE FIX'S OWN RISK rather than the defect. Converting on both edges makes an
// UNTOUCHED field lossy — 4,401 ft shows as 1,341 m and comes back as 4,400 — so editing one
// variant's notes would silently move every figure on the route. The draft carries `_orig` and an
// untouched box is written back unchanged. See the note on the fixture below for why the two
// numbers are the ones they are: choosing a value the round trip happens not to lose makes that
// section pass whether the guard is there or not.
//
// BOTH EXPRESSIONS ARE LIFTED FROM SOURCE AND EXECUTED, never re-typed: a copy would agree with
// itself whatever the app did, which is the whole question. ANCHOR LOST if either moves.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const problems = [];
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); problems.push(m); };
const lost = (m) => { console.error("ANCHOR LOST: " + m + " — re-read RouteDetail.jsx before trusting this run"); process.exit(1); };

// ── The two boundary expressions, lifted.
const seedKey = "const routeVars=(Array.isArray(route.approachVariants)";
const seedAt = src.indexOf(seedKey);
if (seedAt < 0) lost("the routeVars seed is not where this probe reads it");
const seedEnd = src.indexOf(":[blankVar()];", seedAt);
if (seedEnd < 0) lost("could not bound the routeVars seed");
const seedExpr = src.slice(seedAt + "const routeVars=".length, seedEnd + ":[blankVar()]".length);
// A SHAPE TEST, NOT A CONTENT ONE. The first version demanded the slice mention `itinDraftVal`
// — i.e. it was written from the FIX — so any other seeding, including a deliberately WRONG
// one, reported ANCHOR LOST rather than being measured. That is the mirror of the anchor that
// dies with the defect it names: an anchor written from the fix refuses every change instead.
if (!/\.map\(/.test(seedExpr) || !/distMi:/.test(seedExpr) || !/gainFt:/.test(seedExpr))
  lost("the seed is not the map-over-approachVariants shape this probe reads");
const seed = new Function("route", "itinDraftVal", "blankVar", "return " + seedExpr + ";");

const storeKey = 'if(f.type==="variants")return (vals.approachVariants||[])';
const storeAt = src.indexOf(storeKey);
if (storeAt < 0) lost("the variants submit branch is not where this probe reads it");
const storeEnd = src.indexOf('if(f.type==="sections")', storeAt);
if (storeEnd < 0) lost("could not bound the variants submit branch");
const storeExpr = src.slice(storeAt + 'if(f.type==="variants")return '.length, storeEnd).replace(/;\s*$/, "");
if (!/\.map\(/.test(storeExpr) || !/\.filter\(/.test(storeExpr)) lost("the variants branch is not the map/filter shape this probe reads");
const store = new Function("vals", "itinStoreVal", "return " + storeExpr + ";");

// ── The helpers the two expressions call, from the real module rather than re-implemented.
const ENTRY = `
export { itinDraftVal, itinStoreVal, uDistMi, uElev, __set_UNITS } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-avar-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const M = require_(out);
const blankVar = () => ({ name: "", season: "", distMi: "", gainFt: "", hours: "", notes: "", hazards: "" });

// One stored variant, in the canonical units the column holds.
//
// THE TWO NUMBERS ARE CHOSEN TO BE LOSSY, and the first version of this probe chose two that
// were not — which made section 1 pass with the `_orig` guard deleted, i.e. vacuous on the one
// assertion that is about the fix's own risk rather than about the defect. Measured: a bare
// convert-out/convert-in loses 5,493 of the 7,901 integer foot values between 100 and 8,000
// (70%) and 17,910 of the 19,901 three-decimal mile values under 20 (90%). 3 mi and 4,400 ft are
// two of the survivors. 3.456 mi and 4,401 ft are not: without _orig they come back 3.45 and
// 4,400, so editing one variant's notes would move both.
const STORED = { name: "Snow Creek trail", season: "Jul-Sep", distMi: 3.456, gainFt: 4401, hours: "4-5", notes: "Long but easy", hazards: ["Log crossing"] };
const draft = () => seed({ approachVariants: [STORED] }, M.itinDraftVal, blankVar);
const roundTrip = () => store({ approachVariants: draft() }, M.itinStoreVal)[0];

// ── 1. THE ROUND TRIP IS LOSSLESS IN BOTH SETTINGS. Editing a note must not move the distance.
for (const u of ["imperial", "metric"]) {
  M.__set_UNITS(u);
  const back = roundTrip();
  const bad = ["distMi", "gainFt"].filter((k) => back[k] !== STORED[k]);
  if (!bad.length) ok(`${u}: an untouched variant round-trips unchanged (${back.distMi} mi, ${back.gainFt} ft)`);
  else fail(`${u}: an untouched variant was rewritten — ${bad.map((k) => `${k} ${STORED[k]} -> ${back[k]}`).join(", ")}`);
}

// ── 2. THE BOX HOLDS THE MEASUREMENT THE CARD SHOWS. The APPROACHES panel renders
//    uDistMi(v.distMi) and uElev(v.gainFt), so a box seeded with the raw stored number puts two
//    different figures for one walk on one screen — which is exactly what a metric climber met:
//    "4.8 km" on the card, 3 in the box under it.
//
//    ASSERTED TO WITHIN THE CARD'S OWN ROUNDING STEP, not for equality, and the difference matters.
//    The card rounds for reading (uDistMi gives one decimal) while the box is a value about to be
//    EDITED, so it carries the conversion's own precision: 3 mi is 4.83 km in the box and "4.8 km"
//    on the card. Demanding equality would push the box down to the card's precision, and a climber
//    who then saved an untouched form would write 4.8 km back as 2.98 mi. The first version of this
//    section did demand it and reported a correct app as broken.
//
//    Both figures come from the app's OWN formatters rather than from a hand-typed number, so a
//    change to either conversion cannot make the panel and the editor drift apart while this stays
//    green.
const cardNum = (s) => parseFloat(String(s).replace(/,/g, ""));
for (const u of ["imperial", "metric"]) {
  M.__set_UNITS(u);
  const d = draft()[0];
  for (const [what, box, shown, step] of [
    ["distance", d.distMi, M.uDistMi(STORED.distMi), 0.05],
    ["gain", d.gainFt, M.uElev(STORED.gainFt), 0.5],
  ]) {
    const c = cardNum(shown);
    if (box !== "" && isFinite(c) && Math.abs(parseFloat(box) - c) <= step + 1e-9)
      ok(`${u}: the ${what} box holds ${box}, the measurement the card reads "${shown}"`);
    else
      fail(`${u}: the ${what} box holds ${JSON.stringify(box)} while the card beside it reads "${shown}" — one walk, two numbers, one screen`);
  }
}

// ── 3. WHAT THE CLIMBER TYPES IS READ IN THEIR OWN UNITS — the write half, and the one that
//    corrupts the record for everyone else.
//    THE TYPED VALUES MUST DIFFER FROM WHAT SEEDING PRODUCES, or the assertion is vacuous: 3 mi
//    seeds the box with 4.83, so "typing" 4.83 takes the untouched-field branch and hands back the
//    original with no conversion run at all. That is exactly how the itinerary probe passed against
//    code that converted nothing.
M.__set_UNITS("metric");
const seeded = draft()[0];
const typed = [Object.assign({}, seeded, { distMi: "8", gainFt: "1500" })];
for (const [k, was] of [["distMi", seeded.distMi], ["gainFt", seeded.gainFt]])
  if (String(typed[0][k]) === String(was)) fail(`the ${k} case types the seeded value — it cannot exercise a conversion`);
const stored = store({ approachVariants: typed }, M.itinStoreVal)[0];
const near = (a, b, tol) => a != null && Math.abs(a - b) <= tol;
if (near(stored.distMi, 4.97, 0.02)) ok(`metric: 8 typed as km stores ${stored.distMi} mi`);
else fail(`metric: 8 typed as km stored ${stored.distMi} — the column is miles, so the walk is recorded 1.6x too long`);
if (near(stored.gainFt, 4921, 3)) ok(`metric: 1500 typed as metres stores ${stored.gainFt} ft`);
else fail(`metric: 1500 typed as metres stored ${stored.gainFt} — the column is feet, so the approach claims a third of the gain`);

// ── 4. THE IMPERIAL SIDE IS UNTOUCHED. A fix that converted unconditionally would be worse than
//    the defect it replaces, so this is asserted rather than assumed.
M.__set_UNITS("imperial");
const impTyped = draft().map((d) => Object.assign({}, d, { distMi: "5.5", gainFt: "2200" }));
const impStored = store({ approachVariants: impTyped }, M.itinStoreVal)[0];
if (impStored.distMi === 5.5 && impStored.gainFt === 2200) ok("imperial: what is typed is what is stored, unchanged");
else fail(`imperial: a typed value was converted — ${impStored.distMi}/${impStored.gainFt}`);

// ── 5. A BLANK BOX STORES NOTHING. `distMi` and `gainFt` are optional on the stored shape, and a
//    variant with an empty box must not gain a 0 that reads as a measured flat walk-in.
M.__set_UNITS("metric");
const blanked = store({ approachVariants: [Object.assign({}, blankVar(), { name: "Unmeasured way in" })] }, M.itinStoreVal)[0];
if (!("distMi" in blanked) && !("gainFt" in blanked)) ok("an empty box stores no key at all, rather than a measured zero");
else fail(`an empty box stored ${JSON.stringify({ distMi: blanked.distMi, gainFt: blanked.gainFt })} — a blank is not a measurement of zero`);

// ── 6. THE LABELS, AS SOURCE. The boxes live inside SuggestFix, which no SSR harness stands up, so
//    these are asserted textually — and they are separate expressions from the values above, so a
//    fix that converted the numbers under a label still naming the other unit reads as finished.
//
//    ASSERTED AS A PROPERTY, NEVER AS A WORDING: each attribute must be an EXPRESSION that consults
//    a unit helper, rather than a fixed string. Pinning the exact phrasing would make the probe
//    argue with ordinary editorial work — "e.g. 4 km" is a better placeholder than "km" and must
//    stay silent — while still failing every revert, because a revert is precisely the change from
//    an expression to a literal.
const braced = (tag, attr) => {
  const at = tag.indexOf(attr + "={");
  if (at < 0) return null;
  let d = 0;
  for (let k = at + attr.length + 1; k < tag.length; k++) {
    if (tag[k] === "{") d++;
    else if (tag[k] === "}" && --d === 0) return tag.slice(at + attr.length + 2, k);
  }
  return null;
};
const UNIT_FN = /\buImp\(\)|\buDistMiUnit\(\)|\buElevUnit\(\)/;
for (const [what, marker] of [["distance", " distance in"], ["gain", " gain in"]]) {
  const at = src.indexOf('aria-label={"Approach "+(idx+1)+"' + marker);
  if (at < 0) { fail(`the ${what} box's aria-label is not where this probe reads it — it may have been reverted to a fixed string, or moved`); continue; }
  const close = src.indexOf("/>", at);
  const tag = src.slice(at, close < 0 ? at + 600 : close);
  for (const attr of ["aria-label", "placeholder"]) {
    const expr = braced(tag, attr);
    if (expr == null) fail(`the ${what} box's ${attr} is a fixed string — it names the wrong unit on one of the two settings`);
    else if (UNIT_FN.test(expr)) ok(`the ${what} box's ${attr} names the climber's own unit`);
    else fail(`the ${what} box's ${attr} is an expression that consults no unit helper: ${expr}`);
  }
}
if (/parseFloat\(x\.distMi\)|parseInt\(x\.gainFt,10\)/.test(src))
  fail("the raw submit expression is still in the file — the branch stores what was typed");
else ok("no raw parse of the typed variant numbers survives in the submit branch");

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — the approach-variants editor reads and writes in the climber's own units.");
