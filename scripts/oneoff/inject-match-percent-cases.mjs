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
const PARTNER_SEARCH = path.join(ROOT, "lib", "PartnerSearch.jsx");
const REAL_ROW = path.join(ROOT, "src", "components", "RealClimberRow.tsx");   // the browse row moved out of core (PR34)
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
      ['pts:_dk?(_sd.length?CMAX_DISC:0):CMAX_DISC/2,', 'pts:_dk?_sd.length*16:CMAX_DISC/2,'],
      ['var _wo=_so.length>=2?CMAX_WHERE:(_so.length===1?Math.round(CMAX_WHERE*0.75):0);', 'var _wo=_so.length*14;'],
      ['return Math.max(COMPAT_BASE,Math.min(COMPAT_TOP,Math.round(COMPAT_BASE+((s-COMPAT_BASE)/(COMPAT_MAX-COMPAT_BASE))*(COMPAT_TOP-COMPAT_BASE))));', 'return Math.min(99,Math.max(s,20));'],
    ],
    expect: "still clamps at a literal 99",
  },
  {
    name: "only the DISCIPLINES cap reverts",
    edits: [['pts:_dk?(_sd.length?CMAX_DISC:0):CMAX_DISC/2,', 'pts:_dk?_sd.length*16:CMAX_DISC/2,']],
    // NOT the maximal-pair assertion: with ONE term uncapped the rescale overshoots and re-clamps
    // to exactly COMPAT_TOP, so that assertion still passes. What catches it is the saturation
    // returning and the weakest signals being swamped again.
    expect: "verified CANNOT move the number",
  },
  {
    name: "only the OBJECTIVES cap reverts",
    edits: [['var _wo=_so.length>=2?CMAX_WHERE:(_so.length===1?Math.round(CMAX_WHERE*0.75):0);', 'var _wo=_so.length*14;']],
    expect: "verified CANNOT move the number",
  },
  {
    name: "COMPAT_MAX becomes a LITERAL, so a new term can drift from the ceiling",
    edits: [['COMPAT_MAX=COMPAT_BASE+CMAX_DISC+CMAX_GRADE+CMAX_WHERE+CMAX_VERIF+CMAX_PACE+CMAX_AVAIL+CMAX_REL;', 'COMPAT_MAX=130;']],
    expect: "not derived",
  },
  {
    name: "a signal stops mattering: the grade term is flattened to its neutral value",
    edits: [['pts:_yp?Math.max(0,CMAX_GRADE-Math.abs(_yp.x-_yp.y)*3):CMAX_GRADE/2,', 'pts:CMAX_GRADE/2,']],
    expect: "grade range CANNOT move the number",
  },
  {
    name: "the copy promises a signal nothing wires (belay catches)",
    file: PARTNER_SEARCH,   // the Find-partners copy moved out of core with PartnerSearch
    edits: [['blends where you climb (shared objectives or listed areas), grade range, disciplines, availability overlap, reliability and whether each of you is verified.', 'blends where you climb (shared objectives or listed areas), grade range, disciplines, availability overlap, reliability and belay catches.']],
    expect: "which this guard cannot tie to any signal",
  },
  {
    name: "THE REAL DEFECT: the browse row calls every real climber a NEW PROFILE",
    file: REAL_ROW,
    edits: [['>Not enough shared info to score a match<', '>New profile — not enough shared info to score a match yet<']],
    expect: 'calls every real climber a "New profile"',
  },
  {
    name: "...and the other half of it: the refusal promises the score arrives YET",
    file: REAL_ROW,
    // Separated deliberately. The two claims fail differently — one blames the climber, one
    // promises a resolution nothing on `profiles` can deliver — and a case that restored both
    // would pass on the strength of either.
    edits: [['>Not enough shared info to score a match<', '>Not enough shared info to score a match yet<']],
    expect: 'says the score is unavailable "yet"',
  },
  {
    name: "the refusal is deleted, leaving the absence unexplained beside the seed card's big score",
    file: REAL_ROW,
    edits: [['>Not enough shared info to score a match<', '><']],
    expect: "no longer explains the missing match %",
  },
  {
    name: "_cand narrows back to the pre-0209 projection, so every real climber reads the refusal again",
    file: REAL_ROW,
    // The regression 0209 closed: objectives hardcoded empty and the new columns dropped.
    edits: [['objectiveIds:Array.isArray(objIds)?objIds:[],', 'objectiveIds:[],'],
            ['hikingSpeedFtHr:Number(p.hiking_speed_ft_hr)||undefined,', ''],
            // ...and the availability columns, which 0209 added with pace: dropping only two of the three left the row
            // two unknowns deep, under the refusal's threshold, so the case reproduced half the regression (2026-11-23).
            ['availability:Array.isArray(p.availability)?p.availability:[],availWeek:Array.isArray(p.avail_week)?p.avail_week:[],', '']],
    expect: "for a COMPLETE profile",
  },
  {
    name: "the objectives gate is removed, so an UNREAD list scores as zero shared objectives",
    file: REAL_ROW,
    edits: [['{!_objReady?<div', '{false?<div']],
    expect: "before its objectives are read",
  },
  // THE COMPAT AUDIT OF 2026-11-23: each of its four fixes reverted on its own.
  {
    name: "THE AUDIT DEFECT: verified reads only the OTHER climber again, so A and B see different numbers",
    edits: [['pts:(a.verified?CMAX_VERIF/2:0)+(b.verified?CMAX_VERIF/2:0),', 'pts:b.verified?CMAX_VERIF:0,']],
    expect: "score differently by direction",
  },
  {
    name: "THE AUDIT DEFECT: the listed area stops filling where-you-climb, so a crag pair tops out below 99",
    edits: [['pts:_wk?Math.max(_wo,_ov?CMAX_WHERE:0):CMAX_WHERE/2,', 'pts:_wk?_wo:CMAX_WHERE/2,']],
    expect: "one way of saying where you climb is worth less",
  },
  {
    name: "THE AUDIT DEFECT: ice grades are read by nothing again",
    edits: [['["ice",wi2,"ice"],', '']],
    expect: "a grade from climb_grades is not scored",
  },
  {
    name: "THE AUDIT DEFECT: a blank discipline scores nothing while a blank grade scores half",
    edits: [['pts:_dk?(_sd.length?CMAX_DISC:0):CMAX_DISC/2,', 'pts:_dk?(_sd.length?CMAX_DISC:0):0,']],
    expect: "blank fields score unevenly",
  },
  {
    name: "SILENT: the refusal is REWORDED, truthfully and differently",
    file: REAL_ROW,
    // The load-bearing negative. 6b/6c test the lifted TEXT for two forbidden claims and a
    // length, never for today's phrasing — a guard pinned to one sentence forbids improving it.
    edits: [['>Not enough shared info to score a match<', '>Match scores need objectives and availability, which a public profile does not carry<']],
    expect: null,
  },
  {
    name: "SILENT: a comment naming the old wording",
    file: REAL_ROW,
    edits: [['export default function RealClimberRow({p,distFrom,onOpen,objIds,objErr,verified,reliability,listing,action,friendState,onConnect,cand,online,level,years,climbs,vouches,climbsPrivate,onClimbs,onVouches,extras,tag}: RealClimberRowProps){', '/* this used to read "New profile — …score a match yet" */\nexport default function RealClimberRow({p,distFrom,onOpen,objIds,objErr,verified,reliability,listing,action,friendState,onConnect,cand,online,level,years,climbs,vouches,climbsPrivate,onClimbs,onVouches,extras,tag}: RealClimberRowProps){']],
    expect: null,
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
  // A case edits core unless it names its own file.
  const F = c.file || CORE;
  const orig = F === CORE ? ORIGINAL : fs.readFileSync(F, "utf8");
  const baseSha = sha(F);
  let s = orig;
  let landed = true, why = "";
  for (const [find, repl] of c.edits) {
    const n = s.split(find).length - 1;
    if (n !== 1) { landed = false; why = `anchor found ${n}x: ${find.slice(0, 60)}`; break; }
    s = s.replace(find, repl);
  }
  if (!landed) { console.log(`  HARNESS BUG  ${c.name}\n      ${why}`); problems++; continue; }

  fs.writeFileSync(F, s);
  const moved = sha(F) !== baseSha;
  const r = run();
  fs.writeFileSync(F, orig);
  if (sha(F) !== baseSha) { console.error("TREE NOT RESTORED — stopping."); process.exit(1); }

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
