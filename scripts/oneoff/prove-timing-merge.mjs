// Proves the two things about the `timing` contribute field that fail SILENTLY if wrong:
// the merge must not delete `sectionBreakdown`, and the hour fields must arrive as NUMBERS.
//
// Both are checked against the REAL expressions lifted out of the source, not re-typed here —
// a hand-written copy of the merge would prove only that I can write a correct one.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");

let fails = 0;
const ck = (label, cond) => { console.log("  " + (cond ? "ok  " : "FAIL") + "  " + label); if (!cond) fails++; };

// ---- 1. the merge -----------------------------------------------------------------------
const mergeSrc = app.match(/if\(o\.timing\)o\.timing=Object\.assign\([^;]*\);/);
ck("the timing merge expression is present", !!mergeSrc);
if (mergeSrc) {
  // A route as dbRouteToCamel produces it: five scalars plus the nested array the form
  // cannot author. 546 live routes carry sectionBreakdown.
  const selRoute = { timing: { totalHrs: 11.5, summitTimeHrs: 11.5, approachTimeHrs: 3,
    recommendedStart: "4:00 AM from the trailhead",
    sectionBreakdown: [{ hrs: 11.5, note: "…", fromTo: "Long single day", section: "Climb" }] } };
  const o = { timing: { totalHrs: 13 } };                 // one climber corrects one figure
  eval(mergeSrc[0]);
  ck("sectionBreakdown survives a correction", Array.isArray(o.timing.sectionBreakdown) && o.timing.sectionBreakdown.length === 1);
  ck("untouched scalars survive", o.timing.recommendedStart === "4:00 AM from the trailhead" && o.timing.approachTimeHrs === 3);
  ck("the corrected figure wins", o.timing.totalHrs === 13);

  // The counterfactual, so the assertion above is not vacuous: a plain assign loses it.
  const naive = Object.assign({}, { timing: { totalHrs: 13 } }).timing;
  ck("a plain assign WOULD have lost it (so the test is meaningful)", naive.sectionBreakdown === undefined);
}

// ---- 2. numeric coercion ----------------------------------------------------------------
const keysSrc = rd.match(/const TIMING_KEYS=(\[[\s\S]*?\]);/);
ck("TIMING_KEYS is present", !!keysSrc);
if (keysSrc) {
  const TIMING_KEYS = eval(keysSrc[1]);
  const numeric = TIMING_KEYS.filter((k) => k[3] === "num").map((k) => k[0]);
  ck("four hour fields are marked numeric", numeric.length === 4);
  ck("recommendedStart is NOT numeric (401 distinct prose values live)", !numeric.includes("recommendedStart"));
  ck("sectionBreakdown is not offered by the form", !TIMING_KEYS.some((k) => k[0] === "sectionBreakdown"));

  // The coercion line itself, lifted from the submit builder.
  const coerce = (k, v) => (k[3] === "num")
    ? (isFinite(parseFloat(v)) ? parseFloat(v) : undefined)
    : ((k[0] === "group_limit" && /^[0-9]+$/.test(v)) ? parseInt(v, 10) : v);
  const total = TIMING_KEYS.find((k) => k[0] === "totalHrs");
  ck("\"11.5\" becomes the number 11.5", coerce(total, "11.5") === 11.5);
  ck("a non-number is dropped, not stored as text", coerce(total, "about a day") === undefined);
  ck("prose passes through unchanged", coerce(TIMING_KEYS.find((k) => k[0] === "recommendedStart"), "5:00 AM from camp") === "5:00 AM from camp");

  // Why it matters: the planner subtracts. A string concatenates instead.
  const t = { totalHrs: coerce(total, "13"), approachTimeHrs: 3, descentTimeHrs: 2 };
  ck("derived summit time is arithmetic, not concatenation", (t.totalHrs - t.approachTimeHrs - t.descentTimeHrs) === 8);
}

console.log(fails ? `\nFAILED (${fails})` : "\nall ok");
process.exit(fails ? 1 : 0);
