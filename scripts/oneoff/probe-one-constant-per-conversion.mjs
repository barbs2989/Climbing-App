#!/usr/bin/env node
// ONE CONSTANT PER CONVERSION.
//
// The contribute form's "current value" for gain, loss and distance converted metres->feet
// with 3.281 and km->miles with 0.621, while every other surface -- uElev, uDist, uGain,
// uLen, dbRouteToCamel -- uses 3.28084 and 0.621371. Same conversion, two constants, so the
// form showed a climber a DIFFERENT number from the one the page they came from displays.
//
// Measured over the live WA catalog before fixing: 18 of 915 routes disagreed on gain, 18 of
// 639 on loss, 9 of 790 on distance -- 45 in all. The examples are the tell, because the
// low-precision constant turns clean numbers ugly: the form offered "14001 ft" where the page
// says "14,000 ft" (wa_gunsight_peak_standard), and "11001", "13301", "12101", "11501". A
// current value that disagrees with the page invites a climber to "correct" a number that was
// never wrong -- the same class as objStr's "Weather: [object Object]" as a current value.
//
// SECTION 2 is what stops section 1 being pedantry: it PROVES the two constants are not
// interchangeable by finding values where they round apart. A rule forbidding a constant is
// only worth having if the constant actually changes what is on screen.
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { fileURLToPath } from "node:url";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatchCore.jsx", "ClimbMatch.jsx", "RouteDetail.jsx"];
const problems = [];

// =======================================================================================
// SECTION 1 -- no low-precision copy of a conversion constant.
//
// Parsed with Babel and read from NUMERIC LITERALS only, deliberately: this file's own
// header names 3.281 and 0.621 while explaining why they are wrong, and a text scan would
// fail on its own documentation -- check:ci-cancel's trap. A comment is not a NumericLiteral.
//
// Matched on the VALUE, not on the source text, so 0.621371 cannot be mistaken for 0.621 by
// a prefix -- which a regex does, and did, on the first pass.
const BAD = new Map([
  [3.281, "metres->feet: the app's constant is 3.28084 (uElev, uGain, uLen, dbRouteToCamel)"],
  [0.621, "km->miles: the app's constant is 0.621371 (uDist)"],
  [3.28, "metres->feet truncated further still"],
  [0.62, "km->miles truncated further still"],
]);

let numbers = 0;
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    NumericLiteral(p) {
      numbers++;
      const why = BAD.get(p.node.value);
      if (why) problems.push(`${f} @${p.node.start}: ${p.node.value} — ${why}`);
    },
  });
}
console.log(`[static] ${numbers} numeric literals across ${FILES.length} app files`);
// Fails CLOSED: a parse yielding almost nothing clears every rule above vacuously.
if (numbers < 3000) problems.push(`only ${numbers} numeric literals parsed — a broken scan, not a clean app`);

// =======================================================================================
// SECTION 2 -- the constants are NOT interchangeable, so section 1 is not pedantry.
//
// No database and no browser: it sweeps the range of gains and distances this catalog holds
// and asks how often the two constants round to different displayed values. If this ever
// reports ZERO the rule above has stopped protecting anything and should be re-justified,
// not quietly kept.
let gainSplit = 0, gainSeen = 0;
for (let ft = 100; ft <= 15000; ft += 1) {   // the app stores FEET and hands the UI metres
  const m = ft / 3.28084;
  gainSeen++;
  if (Math.round(m * 3.281) !== Math.round(m * 3.28084)) gainSplit++;
}
let distSplit = 0, distSeen = 0;
for (let km10 = 1; km10 <= 800; km10++) {
  const km = km10 / 10;
  distSeen++;
  if ((km * 0.621).toFixed(1) !== (km * 0.621371).toFixed(1)) distSplit++;
}
console.log(`[range]  gain: ${gainSplit} of ${gainSeen} whole-foot values round apart (${(gainSplit / gainSeen * 100).toFixed(1)}%)`);
console.log(`[range]  dist: ${distSplit} of ${distSeen} tenth-km values round apart (${(distSplit / distSeen * 100).toFixed(1)}%)`);
if (!gainSplit || !distSplit) {
  problems.push("the two constants never disagree over the catalog's range — section 1 is protecting nothing and needs re-justifying, not keeping");
}

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — one constant per conversion, and the constants demonstrably matter.");
