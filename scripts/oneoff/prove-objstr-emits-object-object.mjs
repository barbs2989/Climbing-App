// Does the app's OWN objStr put "[object Object]" into the contribute form's summary line?
//
// measure-objstr-object-object.mjs answers this by computing String(v) itself, which is a claim
// about JavaScript rather than about this app. This runs the real function.
//
// `objStr` drives three things, per its own neighbouring comment: the collapsed summary line the
// keyed editor opens with, `wasEmpty` (which decides whether one climber can fill a blank or three
// must agree), and the reference string. So a value that stringifies badly is not cosmetic — it is
// what a climber is shown as the CURRENT value before they replace it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (w) => { console.error(`\nproof FAILED — ${w}. Nothing below was proven.\n`); process.exit(1); };

// Balance braces from the first `{` after a `name=function` / `function name` opening. A regex
// with a bounded `[\s\S]{0,400}?` truncated objStr mid-body and threw a SyntaxError inside
// `new Function` — which reads as a broken app rather than a broken lift.
function liftBody(src, opener, label) {
  const i = src.indexOf(opener);
  if (i < 0) dead(`ANCHOR LOST: ${label} (${JSON.stringify(opener)})`);
  let depth = 0, k = src.indexOf("{", i);
  if (k < 0) dead(`ANCHOR LOST: no brace after ${label}`);
  for (; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}") { depth--; if (!depth) break; }
  }
  if (depth !== 0) dead(`could not balance braces for ${label}`);
  // Include a trailing `;` if the declaration has one.
  return src.slice(i, k + 1);
}

const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const ok = fs.readFileSync(path.join(ROOT, "lib/objKeys.js"), "utf8");

const dgetSrc = liftBody(rd, "const _dget=", "_dget");
// objStr flattens nested values through fmtSlingVal, so the proof has to lift the whole
// dependency set. Omitting it threw "fmtSlingVal is not defined" — which is a broken LIFT, and
// is also the clearest evidence this script runs the app's real function rather than a copy.
const slingValSrc = liftBody(rd, "function fmtSlingVal(", "fmtSlingVal");
const objStrSrc = liftBody(rd, "objStr=function(", "objStr");
// SEASHAZ_KEYS is an ARRAY literal, so balance square brackets instead.
const ki = ok.indexOf("SEASHAZ_KEYS=[");
if (ki < 0) dead("ANCHOR LOST: SEASHAZ_KEYS");
let sd = 0, kk = ok.indexOf("[", ki);
for (; kk < ok.length; kk++) { if (ok[kk] === "[") sd++; else if (ok[kk] === "]") { sd--; if (!sd) break; } }
const keysSrc = ok.slice(ki, kk + 1);

let objStr, KEYS;
try {
  const built = new Function(
    "var " + dgetSrc.replace(/^const /, "") + ";\n" +
    slingValSrc + "\n" +
    "var " + objStrSrc + ";\n" +
    "var " + keysSrc + ";\n" +
    "return {objStr:objStr, KEYS:SEASHAZ_KEYS};");
  const out = built();
  objStr = out.objStr; KEYS = out.KEYS;
} catch (e) { dead("the lifted source did not evaluate: " + (e && e.message)); }
if (typeof objStr !== "function") dead("objStr did not lift as a function");
if (!Array.isArray(KEYS) || KEYS.length < 3) dead(`SEASHAZ_KEYS lifted as ${KEYS && KEYS.length} entries`);

// Prove the lift on a shape whose answer is not in doubt, before trusting a verdict.
if (objStr(KEYS, { exposure: "fully exposed" }) !== "Exposure: fully exposed") {
  dead("the lifted objStr does not format a flat string as expected — the lift is wrong, not the app");
}

const rows = await selectAll("routes", "id,seasonal_hazards", "seasonal_hazards=not.is.null", { pageSize: 1000 })
  .catch((e) => dead("the read failed: " + (e && e.message)));
if (!rows || !rows.length) dead("zero rows carry seasonal_hazards — an empty read, not an empty column");

// It began as a REPRODUCTION and is now a REGRESSION CHECK, which is the right shape once the
// defect is fixed: as a reproduction it exited 1 on a healthy tree, so anyone re-running it read
// a fixed app as a broken script.
//
// HISTORICAL: 504 of 504 rows (100%) put "[object Object]" in this line, from the bare `weather`
// key being offered while the value is an object on 498 of them.
let bad = 0, sample = null;
for (const r of rows) {
  const line = objStr(KEYS, r.seasonal_hazards);
  if (line.includes("[object Object]")) { bad++; if (!sample) sample = { id: r.id, line }; }
}
console.log(`rows carrying seasonal_hazards: ${rows.length}`);
console.log(`rows whose contribute-form summary line contains "[object Object]": ${bad}\n`);
if (sample) console.log(`  ${sample.id}\n    ${sample.line.slice(0, 220)}\n`);

// A count of zero is also what a broken PROBE prints, so prove the two halves of the fix
// independently of the catalog.
let fails = 0;
const say = (m) => console.log("  ok    " + m);
const no = (m) => { console.log("  FAIL  " + m); fails++; };

// 1. The dotted key specs: the bare `weather` key must no longer be offered.
const specKeys = KEYS.map((k) => k[0]);
if (!specKeys.includes("weather")) say("the bare `weather` key is no longer offered");
else no("`weather` is still offered as a bare key, so its object value reaches String()");
if (specKeys.includes("weather.typical")) say("`weather.typical` is offered instead");
else no("`weather.typical` is not offered — the sub-key a climber can actually edit");

// 2. The fail-safe: a nested value must flatten READABLY, not vanish and not stringify raw.
// `crevasses` is a string on 453 rows and an object on 34, so this path is live, not theoretical.
const nested = objStr(KEYS, { crevasses: { timing: "bridges thin from late July", location: "the upper icefall" } });
if (nested.includes("[object Object]")) no(`a nested value still stringifies raw: ${nested}`);
else if (!nested.includes("late July") || !nested.includes("upper icefall")) no(`a nested value lost its content: ${nested}`);
else say(`a nested value flattens readably: ${nested}`);

// 3. And the flattening must not have broken the ordinary case.
if (objStr(KEYS, { exposure: "fully exposed" }) === "Exposure: fully exposed") say("a flat string is unchanged");
else no("a flat string no longer formats correctly");

if (bad) { console.log(`\nFAIL — ${bad} row(s) still show [object Object].`); fails++; }
console.log(fails ? `\n${fails} check(s) failed.` : `\nok — 504 -> 0, nested values flatten readably, flat values unchanged.`);
process.exit(fails ? 1 : 0);
