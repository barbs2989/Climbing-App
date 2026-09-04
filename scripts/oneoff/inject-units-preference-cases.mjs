// Is probe-units-preference-persists.mjs measuring anything?
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
  {
    name: "norestore",
    why: "the preference is never read back — the toggle works and resets on every reload, which is the original defect",
    file: "ClimbMatch.jsx",
    find: `[units,setUnits]=useState(loadUnits)`,
    repl: `[units,setUnits]=useState("imperial")`,
    expect: /the preference is not restored/,
  },
  {
    name: "eager",
    why: "useState(loadUnits()) reads storage on EVERY render instead of once — works, and is a per-render synchronous storage hit",
    file: "ClimbMatch.jsx",
    find: `[units,setUnits]=useState(loadUnits)`,
    repl: `[units,setUnits]=useState(loadUnits())`,
    expect: /calls storage on EVERY render/,
  },
  {
    name: "nopersist",
    why: "the toggle stops writing, so the restore has nothing to restore",
    file: "ClimbMatch.jsx",
    find: `onClick={()=>{setUnits(u[0]);saveUnits(u[0]);}}`,
    repl: `onClick={()=>setUnits(u[0])}`,
    expect: /does not call saveUnits/,
  },
  {
    name: "novalidate",
    why: "loadUnits stops shape-checking, so a value left by devtools or an older build is returned as a preference",
    file: "lib/units-pref.js",
    find: `    return VALID.indexOf(v) >= 0 ? v : DEFAULT_UNITS;`,
    repl: `    return v || DEFAULT_UNITS;`,
    expect: /tampered value/,
  },
  {
    name: "nowritecheck",
    why: "saveUnits stops refusing junk, so the app can write a value it cannot read back",
    file: "lib/units-pref.js",
    find: `  if (VALID.indexOf(u) < 0) return;`,
    repl: `  if (u === undefined) return;`,
    expect: /refuses to write|wrote an invalid value/,
  },
  {
    // THE STALE-LIST CASE. A third unit in the UI and not in VALID_UNITS persists as nothing and
    // falls back to imperial -- the quiet failure the whole module exists to remove. The probe's
    // anchor has to survive this edit, which is why it balances brackets rather than matching a
    // two-option shape.
    name: "thirdunit",
    why: "a third unit system is offered by the toggle but cannot be stored — it would silently fall back to imperial",
    file: "ClimbMatch.jsx",
    find: `[["imperial","ft · mi"],["metric","m · km"]]`,
    repl: `[["imperial","ft · mi"],["metric","m · km"],["nautical","nm"]]`,
    expect: /which VALID_UNITS does not accept/,
  },
];

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
  try { out = execFileSync("node", [path.join(ROOT, "scripts/oneoff/probe-units-preference-persists.mjs")], { cwd: ROOT, encoding: "utf8" }); }
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
