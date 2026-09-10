#!/usr/bin/env node
// Injection cases for `check:match-percent`.
//
// The healthy output of that guard is "everything passed", which is also what a guard asking
// nothing prints. These reproduce the real defect and several near misses, and each case proves
// its edit LANDED by checksum before the guard's verdict is believed — checksum movement proves an
// edit happened, not that it was the right one, so every case also names the text its own failure
// must carry, matched against FAIL lines only.
//
// Two cases must stay SILENT. They are the load-bearing half: a guard that pinned the WEIGHTS
// would fail on any future rebalance, which would teach people to ignore it.
//
//   node scripts/oneoff/inject-match-percent-cases.mjs

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const LOCK = path.join(ROOT, ".match-pct-injection.lock");

// Two runs of one suite must never overlap: both snapshot, edit and restore the same file, so a
// second run can capture the first's injected text and "restore" it permanently.
try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); }
catch { console.error("another run of this suite is in flight (.match-pct-injection.lock). Refusing."); process.exit(1); }
const release = () => { try { fs.rmSync(LOCK, { force: true }); } catch {} };
process.on("exit", release); process.on("SIGINT", () => { release(); process.exit(1); });

const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const run = () => {
  const r = spawnSync("node", [path.join(ROOT, "scripts", "check-match-percent.mjs")], { cwd: ROOT, encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
};

const ORIGINAL = fs.readFileSync(CORE, "utf8");
const BASE_SHA = sha(CORE);

// A dirty tree makes every case unattributable, so the suite refuses to start unless the guard is
// already green.
const clean = run();
if (clean.code !== 0) {
  console.error("BASELINE NOT GREEN — fix the guard before injecting.\n" + clean.out.slice(-1500));
  process.exit(1);
}
console.log("baseline green\n");
const cleanText = clean.out;

const cases = [
  {
    name: "THE REAL DEFECT: both terms uncapped again, under a hard clamp at 99",
    edits: [
      ['s+=Math.min(CMAX_DISC,(_ad.filter(x=>_bd.includes(x)).length)*16);', 's+=(_ad.filter(x=>_bd.includes(x)).length)*16;'],
      ['s+=Math.min(CMAX_OBJ,(_ao2.filter(x=>_bo2.includes(x)).length)*14);', 's+=(_ao2.filter(x=>_bo2.includes(x)).length)*14;'],
      ['return Math.max(COMPAT_BASE,Math.min(COMPAT_TOP,Math.round(COMPAT_BASE+((s-COMPAT_BASE)/(COMPAT_MAX-COMPAT_BASE))*(COMPAT_TOP-COMPAT_BASE))));', 'return Math.min(99,Math.max(s,20));'],
    ],
    expect: "still clamps at a literal 99",
  },
  {
    name: "only the DISCIPLINES cap reverts",
    edits: [['s+=Math.min(CMAX_DISC,(_ad.filter(x=>_bd.includes(x)).length)*16);', 's+=(_ad.filter(x=>_bd.includes(x)).length)*16;']],
    // NOT the maximal-pair assertion: with ONE term uncapped the rescale overshoots and re-clamps
    // to exactly COMPAT_TOP, so that assertion still passes. What catches it is the saturation
    // returning and the weakest signals being swamped again.
    expect: "verified trust CANNOT move the number",
  },
  {
    name: "only the OBJECTIVES cap reverts",
    edits: [['s+=Math.min(CMAX_OBJ,(_ao2.filter(x=>_bo2.includes(x)).length)*14);', 's+=(_ao2.filter(x=>_bo2.includes(x)).length)*14;']],
    expect: "verified trust CANNOT move the number",
  },
  {
    name: "COMPAT_MAX becomes a LITERAL, so a new term can drift from the ceiling",
    edits: [['COMPAT_MAX=COMPAT_BASE+CMAX_DISC+CMAX_GRADE+CMAX_OBJ+CMAX_VERIF+CMAX_PACE+CMAX_AVAIL;', 'COMPAT_MAX=114;']],
    expect: "not derived",
  },
  {
    name: "a signal stops mattering: the grade term is flattened to its neutral value",
    edits: [['s+=_gp?Math.max(0,CMAX_GRADE-Math.abs(_gp[0]-_gp[1])*3):CMAX_GRADE/2;', 's+=CMAX_GRADE/2;']],
    expect: "grade range CANNOT move the number",
  },
  {
    name: "the copy promises a signal nothing wires (belay catches)",
    edits: [['blends your shared objectives, grade range, disciplines, availability overlap and verified trust.', 'blends your shared objectives, grade range, disciplines, availability overlap and belay catches.']],
    expect: "which this guard cannot tie to any signal",
  },
  {
    name: "SILENT: a legitimate REBALANCE — disciplines reweighted 16 -> 18",
    edits: [['const CMAX_DISC=16,', 'const CMAX_DISC=18,']],
    expect: null,
  },
  {
    name: "SILENT: a comment quoting the forbidden Math.min(99, shape",
    edits: [['function compat(a,b){', '/* the old ceiling was Math.min(99,Math.max(s,20)) */\nfunction compat(a,b){']],
    expect: null,
  },
];

// An expectation taken from the text an assertion prints when it PASSES reports MISSED against a
// guard firing correctly. Refuse any that already appears in the green run.
for (const c of cases) {
  if (c.expect && cleanText.includes(c.expect)) {
    console.error(`CASE "${c.name}" is unusable: its expectation "${c.expect}" already appears in the GREEN run.`);
    process.exit(1);
  }
}

let problems = 0;
for (const c of cases) {
  let s = ORIGINAL;
  let landed = true, why = "";
  for (const [find, repl] of c.edits) {
    const n = s.split(find).length - 1;
    if (n !== 1) { landed = false; why = `anchor found ${n}x: ${find.slice(0, 60)}`; break; }
    s = s.replace(find, repl);
  }
  if (!landed) { console.log(`  HARNESS BUG  ${c.name}\n      ${why}`); problems++; continue; }

  fs.writeFileSync(CORE, s);
  const moved = sha(CORE) !== BASE_SHA;
  const r = run();
  fs.writeFileSync(CORE, ORIGINAL);
  if (sha(CORE) !== BASE_SHA) { console.error("TREE NOT RESTORED — stopping."); process.exit(1); }

  let verdict;
  if (c.expect === null) {
    verdict = r.code === 0 ? "SILENT" : "FIRED (should be silent)";
  } else {
    const fails = r.out.split("\n").filter((l) => l.includes("FAIL")).join("\n").toLowerCase();
    const hit = fails.includes(c.expect.toLowerCase());
    verdict = r.code !== 0 && hit ? "CAUGHT" : (r.code === 0 ? "MISSED" : "wrong failure");
  }
  const okv = verdict === "CAUGHT" || verdict === "SILENT";
  if (!okv && c.optional) {
    console.log(`  SKIP (optional)          ${c.name}   [${verdict}]`);
    continue;
  }
  console.log(`  ${verdict.padEnd(24)} ${c.name}   (edit landed: ${moved})`);
  if (!okv) {
    problems++;
    console.log("      " + r.out.split("\n").filter((l) => l.includes("FAIL")).slice(0, 3).map((x) => x.trim()).join("\n      "));
  }
}

if (sha(CORE) !== BASE_SHA) { console.error("\nTREE NOT RESTORED"); process.exit(1); }
console.log("\nrestored byte-identically");
console.log(`RESULT: ${cases.length - problems}/${cases.length} as expected`);
process.exit(problems ? 1 : 0);
