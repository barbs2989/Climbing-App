#!/usr/bin/env node
// Injection suite for probe-date-format-survives-a-reload.mjs.
//
// Driven with --static-only. Every case breaks something the module tests or the wiring
// assertions can see, and seven dev-server launches to prove that would be an hour of wall clock
// for no extra evidence — the browser half is exercised by running the probe itself.
//
// Each case reverts ONE link, proves by CHECKSUM that the edit landed, and restores the file
// byte-identically. Two cases must stay SILENT.
//
// IT EDITS lib/ AND THE APP IN PLACE. Do not commit, and do not run the build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = "ClimbMatch.jsx", MOD = "lib/date-pref.js";
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const CASES = [
  { name: "not-seeded", file: APP, expect: "fail",
    find: '[dateFmt,setDateFmt]=useState(loadDateFmt)', repl: '[dateFmt,setDateFmt]=useState("auto")',
    says: /date-format state is SEEDED/ },
  { name: "not-written", file: APP, expect: "fail",
    find: 'onChange={e=>{setDateFmt(e.target.value);saveDateFmt(e.target.value);}}',
    repl: 'onChange={e=>setDateFmt(e.target.value)}',
    says: /choosing a format WRITES it/ },
  // The mapping was inline in THREE places. Putting one back must be caught, or it drifts again.
  { name: "mapping-inlined-again", file: APP, expect: "fail",
    find: '__set_DLOCALE(dateFmtToLocale(dateFmt));',
    repl: '__set_DLOCALE(dateFmt==="us"?"en-US":dateFmt==="intl"?"en-GB":undefined);',
    says: /written inline|set during render/ },
  // THREE CASES LIVED HERE AND ARE SUPERSEDED, NOT LOST — read-does-not-validate,
  // write-does-not-validate and read-does-not-guard. They anchored on the validated read, the
  // validated write and the try/catch when all three were INLINE in lib/date-pref.js; that file's
  // own comment now records the fold ("the guarded read/write now lives once in lib/prefs.js"),
  // so all three anchors matched nothing and reported HARNESS BUG on every run — of which, since
  // nothing runs scripts/oneoff/, there were none.
  //
  // The properties ARE still proven, against the one place the code now lives:
  // scripts/oneoff/inject-prefs-fold-cases.mjs covers them as guard-removed-from-the-shared-core,
  // read-stops-validating and write-stops-validating. Re-adding them here would be two suites
  // asserting one question — the four-grade-parsers shape.
  //
  // What stays below is what is still SPECIFIC to this module: the locale mapping, which did not
  // fold and lives here alone.
  // MUST STAY SILENT — a valid rewrite of the mapping in the one place it may live.
  { name: "valid-refactor-of-the-mapping", file: MOD, expect: "pass",
    find: 'export const dateFmtToLocale = (f) => (f === "us" ? "en-US" : f === "intl" ? "en-GB" : undefined);',
    repl: 'export function dateFmtToLocale(f) { if (f === "us") return "en-US"; if (f === "intl") return "en-GB"; return undefined; }',
    says: null },
  // MUST STAY SILENT — a comment naming the forbidden inline shape is documentation.
  { name: "comment-naming-the-inline-shape", file: MOD, expect: "pass",
    find: 'const KEY = "climbmatch-datefmt";',
    repl: '// Never write dateFmt==="us"?"en-US" inline again; use dateFmtToLocale.\nconst KEY = "climbmatch-datefmt";',
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const f = path.join(ROOT, c.file);
  const before = fs.readFileSync(f, "utf8");
  const beforeSum = sum(f);
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the probe`); bad++; continue; }
  fs.writeFileSync(f, before.replace(c.find, c.repl));
  if (sum(f) === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(f, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "oneoff", "probe-date-format-survives-a-reload.mjs"), "--static-only"],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(f, before);
  if (sum(f) !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    // A failure for a DIFFERENT reason is not a catch.
    if (caught && c.says.test(out)) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
