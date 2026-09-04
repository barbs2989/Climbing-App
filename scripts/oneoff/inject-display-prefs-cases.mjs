// Is probe-display-prefs-persist.mjs measuring anything?
//
// Its healthy output is a column of "ok", which is what a probe with a broken scan prints too. So
// each defect it claims to catch is put back and the probe has to fail with a message NAMING that
// defect — a run that dies for another reason is not a catch.
//
// Every case proves its edit LANDED by checksum and restores the file byte-identically.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex");

const CASES = [
  // ── the restore half ──
  { name: "norestore-units", file: "ClimbMatch.jsx",
    why: "units is never read back — the toggle works and resets on every reload, the original defect",
    find: `[units,setUnits]=useState(loadUnits)`, repl: `[units,setUnits]=useState("imperial")`,
    expect: /units does not initialise from loadUnits/ },
  { name: "norestore-datefmt", file: "ClimbMatch.jsx",
    why: "dateFmt is never read back — the same defect on the other preference",
    find: `[dateFmt,setDateFmt]=useState(loadDateFmt)`, repl: `[dateFmt,setDateFmt]=useState("auto")`,
    expect: /dateFmt does not initialise from loadDateFmt/ },
  { name: "eager", file: "ClimbMatch.jsx",
    why: "useState(loadUnits()) reads storage on EVERY render instead of once",
    find: `[units,setUnits]=useState(loadUnits)`, repl: `[units,setUnits]=useState(loadUnits())`,
    expect: /calls storage on EVERY render/ },

  // ── the persist half ──
  { name: "nopersist-units", file: "ClimbMatch.jsx",
    why: "the units toggle stops writing, so the restore has nothing to restore",
    find: `onClick={()=>{setUnits(u[0]);saveUnits(u[0]);}}`, repl: `onClick={()=>setUnits(u[0])}`,
    expect: /units toggle does not call saveUnits/ },
  { name: "nopersist-datefmt", file: "ClimbMatch.jsx",
    why: "the date-format select stops writing",
    find: `onChange={e=>{setDateFmt(e.target.value);saveDateFmt(e.target.value);}}`,
    repl: `onChange={e=>setDateFmt(e.target.value)}`,
    expect: /select does not call saveDateFmt/ },

  // ── the module's own guarantees ──
  { name: "novalidate", file: "lib/display-prefs.js",
    why: "read() stops shape-checking, so a value left by devtools or an older build is returned as a preference",
    find: `    return valid.indexOf(v) >= 0 ? v : dflt;`, repl: `    return v || dflt;`,
    expect: /was returned as a preference/ },
  { name: "nowritecheck", file: "lib/display-prefs.js",
    why: "write() stops refusing junk, so the app can store a value it cannot read back",
    find: `  if (valid.indexOf(v) < 0) return;`, repl: `  if (v === undefined) return;`,
    expect: /saved an invalid value/ },
  { name: "samekey", file: "lib/display-prefs.js",
    why: "both preferences share one storage key, so setting one silently clobbers the other",
    find: `const KEY_DATE_FMT = "climbmatch-date-format";`, repl: `const KEY_DATE_FMT = "climbmatch-units";`,
    expect: /share a key|overwrote the other/ },

  // ── the control-vs-module agreement ──
  { name: "thirdunit", file: "ClimbMatch.jsx",
    why: "a third unit system is offered but cannot be stored — it would silently fall back to imperial",
    find: `[["imperial","ft · mi"],["metric","m · km"]]`,
    repl: `[["imperial","ft · mi"],["metric","m · km"],["nautical","nm"]]`,
    expect: /the control offers nautical/ },
  { name: "fourthdatefmt", file: "ClimbMatch.jsx",
    why: "a fourth date format is offered but cannot be stored",
    find: `<option value="intl">International — day/month, 24-hour</option>`,
    repl: `<option value="intl">International — day/month, 24-hour</option><option value="iso">ISO — 2026-09-03</option>`,
    expect: /the control offers iso/ },

  // ── the dedup ──
  { name: "relocale", file: "ClimbMatch.jsx",
    why: "one site goes back to its own inline copy of the locale rule — the preview a climber SEES can then drift from what the app formats with",
    find: `__set_DLOCALE(dateFmtToLocale(dateFmt));`,
    repl: `__set_DLOCALE(dateFmt==="us"?"en-US":dateFmt==="intl"?"en-GB":undefined);`,
    expect: /still inlined/ },
  { name: "autotag", file: "lib/display-prefs.js",
    why: `dateFmtToLocale("auto") returns a concrete tag, so "Match my device" silently OVERRIDES the device`,
    find: `  return f === "us" ? "en-US" : f === "intl" ? "en-GB" : undefined;`,
    repl: `  return f === "us" ? "en-US" : f === "intl" ? "en-GB" : "en-US";`,
    expect: /overrides the device instead of matching it/ },
];

/* AN EXPECTATION THAT ALSO MATCHES THE HEALTHY RUN CANNOT DISCRIMINATE, and writing one is a
   mistake I have now made twice in a day — both times by matching the text an assertion prints
   when it PASSES rather than when it fails, and both times the case reported MISSED against a
   probe that was firing correctly. A note was not enough, so it is structural: the clean output is
   captured once, and any `expect` that matches it is refused as a harness bug before a single edit
   is made. It also proves the tree is clean before anything is injected. */
let clean = "";
try { clean = execFileSync("node", [path.join(ROOT, "scripts/oneoff/probe-display-prefs-persist.mjs")], { cwd: ROOT, encoding: "utf8" }); }
catch (e) {
  console.error("the probe FAILS on an unmodified tree, so nothing below would mean anything:\n" + ((e.stdout || "") + (e.stderr || "")).split("\n").filter((l) => /FAIL|BROKEN/.test(l)).join("\n"));
  process.exit(2);
}
const undiscriminating = CASES.filter((c) => c.expect.test(clean));
if (undiscriminating.length) {
  for (const c of undiscriminating) console.error(`HARNESS BUG — ${c.name}: ${c.expect} matches the HEALTHY output, so it cannot tell a catch from a pass. Match the FAILURE message, not the ok() wording.`);
  process.exit(2);
}

let failures = 0;
for (const c of CASES) {
  const p = path.join(ROOT, c.file);
  const before = fs.readFileSync(p, "utf8");
  const beforeSum = sum(c.file);
  const n = before.split(c.find).length - 1;
  if (n !== 1) {
    console.log(`\n${c.name}: HARNESS BUG — the anchor matched ${n} times in ${c.file}, so nothing was tested.`);
    failures++;
    continue;
  }
  fs.writeFileSync(p, before.replace(c.find, c.repl), "utf8");
  const landed = sum(c.file) !== beforeSum;

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts/oneoff/probe-display-prefs-persist.mjs")], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status || 1; }
  fs.writeFileSync(p, before, "utf8");
  const restored = sum(c.file) === beforeSum;

  const named = c.expect.test(out);
  const caught = code !== 0 && named;
  console.log(`\n${c.name}: ${caught ? "CAUGHT" : "MISSED"}   (edit landed: ${landed}, restored byte-identical: ${restored}, exit ${code})`);
  console.log(`   ${c.why}`);
  if (!named) console.log(`   nothing matched ${c.expect} — a failure for a different reason is not a catch`);
  if (!caught || !landed || !restored) failures++;
}

console.log(`\n${failures ? `FAILED — ${failures} case(s)` : `ok — ${CASES.length}/${CASES.length}, the probe fails on every defect it claims to catch`}`);
process.exit(failures ? 1 : 0);
