// `homeStatePath` decides WHICH namesake peak a climber means, so a wrong answer sends them
// to the wrong mountain — quietly, because every row still looks like a plausible result.
// Two cases are easy to get wrong and neither shows up in normal use:
//   "Washington, DC"  must NOT resolve to Washington state
//   "Charleston, West Virginia"  must NOT resolve to Virginia
//
// It LIFTS the real function out of lib/db.js rather than copying it; a mirrored copy agrees
// with the app whatever the app does. lib/db.js cannot simply be imported here — it pulls in
// ./supabase, which only Vite can resolve — so the function and the abbreviation table it
// reads are extracted by brace-matching and compiled, with an ANCHOR LOST throw so a rename
// fails the run loudly instead of quietly testing nothing. No database, no browser.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
function lift(anchor, openChar) {
  const start = src.indexOf(anchor);
  if (start < 0) throw new Error(`ANCHOR LOST: \`${anchor}\` is not in lib/db.js — it was renamed or moved, and this check would otherwise verify nothing.`);
  let depth = 0, end = -1;
  for (let i = src.indexOf(openChar, start); i < src.length; i++) {
    if (src[i] === openChar) depth++;
    else if (src[i] === (openChar === "{" ? "}" : ")") && --depth === 0) { end = i + 1; break; }
  }
  if (end < 0) throw new Error(`could not balance ${anchor}`);
  return src.slice(start, end);
}
const homeStatePath = new Function(
  `${lift("const REGION_ABBR = {", "{")};\n${lift("export function homeStatePath(", "{").replace(/^export /, "")};\nreturn homeStatePath;`
)();
if (typeof homeStatePath !== "function") throw new Error("the lift did not produce a function");

// Shaped like the real rows: children of the catalog roots, `path` = "usa.<slug>".
const STATES = [
  { id: "washington", name: "Washington", path: "usa.washington" },
  { id: "district_of_columbia", name: "District of Columbia", path: "usa.district_of_columbia" },
  { id: "virginia", name: "Virginia", path: "usa.virginia" },
  { id: "west_virginia", name: "West Virginia", path: "usa.west_virginia" },
  { id: "utah", name: "Utah", path: "usa.utah" },
  { id: "idaho", name: "Idaho", path: "usa.idaho" },
  { id: "california", name: "California", path: "usa.california" },
  { id: "bc", name: "British Columbia", path: "canada.bc" },
];

const CASES = [
  ["Bellingham, WA", "usa.washington", "abbreviation, the commonest shape"],
  ["Seattle, Washington", "usa.washington", "full name after a city"],
  ["Washington", "usa.washington", "bare state name"],
  ["Washington, DC", "usa.district_of_columbia", "DC is not Washington state — the abbreviation must win over the substring"],
  ["Charleston, West Virginia", "usa.west_virginia", "longest name wins, or Virginia shadows it"],
  ["Richmond, VA", "usa.virginia", "Virginia still resolves"],
  ["Salt Lake City, UT", "usa.utah", "the seed profile's own value"],
  ["Squamish, BC", "canada.bc", "provinces resolve, not just states"],
  ["Vancouver, British Columbia", "canada.bc", "province by full name"],
  ["", null, "empty location gives no hint rather than a wrong one"],
  [null, null, "null location"],
  ["somewhere nice", null, "unparseable location must yield null, never a guess"],
  ["Paris, France", null, "a place the catalog does not hold"],
  ["I climb in wa sometimes", null, "lowercase 'wa' in prose is not a state code"],
  ["Kansas City, MO", "usa.missouri", "state the fixture lacks -> null, not a wrong path"],
];

let fail = 0;
for (const [loc, want, why] of CASES) {
  let got;
  try { got = homeStatePath(loc, STATES); } catch (e) { got = `THREW ${e.message}`; }
  // Missouri is deliberately absent from STATES, so the honest answer is null.
  const expect = want === "usa.missouri" ? null : want;
  const ok = got === expect;
  if (!ok) fail++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${JSON.stringify(loc)} -> ${JSON.stringify(got)}${ok ? "" : `  (wanted ${JSON.stringify(expect)})`}\n        ${why}`);
}
// Fail closed: an empty states list must disable the hint, never crash or guess.
for (const bad of [null, undefined, []]) {
  const got = homeStatePath("Bellingham, WA", bad);
  if (got !== null) { console.log(`FAIL  states=${JSON.stringify(bad)} returned ${JSON.stringify(got)} — must be null`); fail++; }
}
console.log(fail ? `\n${fail} failure(s)` : `\nok — ${CASES.length + 3} cases, including the two that send a climber to the wrong mountain`);
process.exit(fail ? 1 : 0);
