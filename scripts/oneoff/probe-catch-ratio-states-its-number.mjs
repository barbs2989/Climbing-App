// "High-factor catch ratio" — and then nothing.
//
// The ratio existed only as the WIDTH of a <Bar>, which is two nested divs with a percentage
// width: no role, no text, no aria. So a screen reader read the label and stopped, and a sighted
// reader got a bar with no number — the #654 dangling-label shape, on a safety record.
//
// Measured before fixing: 8 <Bar> uses across the app, and SEVEN state their value in adjacent
// text ("COMPATIBILITY WITH YOU — 74%", "{cur}/5", "{avg.toFixed(1)}"). This was the one that did
// not, so it is a class of ONE and there is no detector.
//
// The label expression is LIFTED from source rather than retyped: a copy would agree with itself
// whatever the app did, which is the question.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

const L = /\{"High-factor catch ratio"\+\(([^}]+)\)\}/.exec(src);
if (!L) dead("the catch-ratio label is not in the expected shape — ANCHOR LOST");
const label = new Function("unavailable", "_hfr", 'return "High-factor catch ratio"+(' + L[1] + ");");

const R = /const _hfr=\(([^;]+)\);/.exec(src);
if (!R) dead("`const _hfr=` is not in ClimbMatchCore.jsx — ANCHOR LOST");
const ratio = new Function("unavailable", "ledger", "return (" + R[1] + ");");

console.log("\n1. the number reaches the sentence\n");

const led = (total, high) => ({ totalCatches: total, highFactorCatches: high });
const r1 = ratio(false, led(6, 0));
if (label(false, r1) === "High-factor catch ratio · 0%") ok("0 of 6 high-factor reads “· 0%”, not a bare label");
else fail(`got "${label(false, r1)}"`);

const r2 = ratio(false, led(8, 2));
if (r2 === 25 && label(false, r2) === "High-factor catch ratio · 25%") ok("2 of 8 reads “· 25%”");
else fail(`got ${r2} / "${label(false, r2)}"`);

console.log("\n2. ...and says nothing it does not know\n");

// A failed belay_catches read must keep the dash the three tiles above already show. Printing
// "0%" there would state a measurement the app does not have -- the defect `unavailable` exists
// for, committed one line lower.
const rU = ratio(true, led(6, 3));
if (rU === null && label(true, rU) === "High-factor catch ratio · —")
  ok("a FAILED read shows “—”, matching the tiles above it — never a fabricated 0%");
else fail(`a failed read renders "${label(true, rU)}"`);

// No catches at all is not a 0% ratio, it is the absence of one.
const rZ = ratio(false, led(0, 0));
if (rZ === null && label(false, rZ) === "High-factor catch ratio")
  ok("an account with NO catches states no ratio rather than “0%”");
else fail(`no catches renders "${label(false, rZ)}"`);

console.log("\n3. the bar and the sentence cannot disagree\n");

// They are one value now. If the Bar goes back to computing its own, this fires.
if (/<Bar val=\{_hfr\|\|0\}/.test(src)) ok("the Bar reads the same _hfr the sentence does");
else fail("the Bar computes its own ratio again — the sentence and the bar can now drift");

if (!/Math\.round\(\(ledger\.highFactorCatches/.test(src.replace(/const _hfr=[^;]+;/, "")))
  ok("...and the ratio is computed in exactly one place");
else fail("a second copy of the ratio arithmetic is back in the render");

console.log(bad ? `\nFAILED — ${bad}` : `\nok — the catch ratio states its number, and withholds it when it has none.\n`);
process.exit(bad ? 1 : 0);
