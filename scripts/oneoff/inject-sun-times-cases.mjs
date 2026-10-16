#!/usr/bin/env node
// Injection suite for scripts/check-sun-times.mjs.
//
// Each case reverts ONE link, proves by CHECKSUM that the edit landed, runs the guard, and restores
// the file byte-identically. Two cases must stay SILENT: a finer scan step and a comment naming the
// old function are correct code.
//
// IT EDITS lib/ AND THE APP IN PLACE. Do not commit, and do not run the build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOLVER = "lib/conditionsScore.js", CAL = "lib/Calendar.jsx", CORE = "ClimbMatchCore.jsx";
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const CASES = [
  // The disc and refraction term: dropping it puts sunrise ~5 min late at 47°N, past tolerance.
  { name: "refraction-dropped", file: SOLVER, expect: "fail",
    find: "const above = function (t) { return sunPosition(lat, lng, t).alt + 0.833; };",
    repl: "const above = function (t) { return sunPosition(lat, lng, t).alt; };",
    says: /min off the ephemeris/ },
  // Longitude ignored — the old estimate's defining omission, in the new function's clothes.
  { name: "longitude-ignored", file: SOLVER, expect: "fail",
    find: "const above = function (t) { return sunPosition(lat, lng, t).alt + 0.833; };",
    repl: "const above = function (t) { return sunPosition(lat, 0, t).alt + 0.833; };",
    says: /min off the ephemeris/ },
  // The Calendar stops reading the solver and makes a number of its own.
  { name: "calendar-estimates-again", file: CAL, expect: "fail",
    find: "sunRiseSet(mt.lat,mt.lng,x.date)",
    repl: "{daylight:12,sunrise:null,sunset:null}",
    says: /never calls sunRiseSet/ },
  // The old function returns under its old name.
  { name: "old-name-returns", file: CORE, expect: "fail",
    find: "/* sunTimes() used to live here:",
    repl: "function sunTimes(lat,date){return{daylight:12,sunrise:6,sunset:18};}\n/* sunTimes() used to live here:",
    says: /declares a sunTimes function/ },
  // MUST STAY SILENT — a finer scan is a valid refactor.
  { name: "finer-step", file: SOLVER, expect: "pass",
    find: "const STEP = 5 * 60000;", repl: "const STEP = 2 * 60000;", says: null },
  // MUST STAY SILENT — a comment naming the old function is documentation, not a declaration.
  { name: "comment-naming-the-old-function", file: CAL, expect: "pass",
    find: "import { sunRiseSet } from \"./conditionsScore.js\";",
    repl: "import { sunRiseSet } from \"./conditionsScore.js\"; // replaced sunTimes, which was an hour early",
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const f = path.join(ROOT, c.file);
  const before = fs.readFileSync(f, "utf8");
  const beforeSum = sum(f);
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the guard`); bad++; continue; }
  fs.writeFileSync(f, before.replace(c.find, c.repl));
  if (sum(f) === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(f, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "check-sun-times.mjs")], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(f, before);
  if (sum(f) !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    if (caught && c.says.test(out)) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
