// Does check:trust-breakdown section 7 actually fail on a tier nobody can reach?
//
// The healthy output of that section is "every bar is reachable", which is also exactly what a
// section that stopped asking prints. So each case reproduces one real shape and is judged on the
// guard's OWN failure text rather than on an exit code — a run that died for an unrelated reason is
// not a catch, and this repo has read one as the other twice.
//
// FOUR OF THE EIGHT ARE THE HISTORICAL DEFECT, restored verbatim: the 90 tier, the second ladder in
// FullProfile, the card's literal 90, and a ceiling typed rather than derived.
//
// TWO MUST STAY SILENT, and they are the reason the one-ladder rule is an AST test rather than a
// string count. The first version of it counted the LABEL and reported two findings, BOTH correct
// code: this guard's own comment quoting "Highly Trusted" while explaining the fix, and the
// Leaderboards board whose category is called "Trusted". A guard that fires on either tells an
// author to delete its documentation or rename a working control.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex");

const CASES = [
  {
    name: "tier-above-the-ceiling",
    why: "the real defect: 'Highly Trusted' back at 90, above the 84 anyone can earn",
    file: "ClimbMatchCore.jsx",
    find: `{min:65,label:"Highly Trusted",hue:"green"}`,
    repl: `{min:90,label:"Highly Trusted",hue:"green"}`,
    expect: "no climber can be shown it",
  },
  {
    name: "tier-handed-out-for-signing-up",
    why: "a tier at the day-one score says nothing about the climber who holds it",
    file: "ClimbMatchCore.jsx",
    find: `{min:15,label:"Building Trust",hue:"amber"}`,
    repl: `{min:5,label:"Building Trust",hue:"amber"}`,
    expect: "handed out for signing up",
  },
  {
    name: "ladder-descends-no-longer",
    why: "two tiers that cross make the lower one unreachable from inside the ladder",
    file: "ClimbMatchCore.jsx",
    find: `{min:33,label:"Trusted",hue:"blue"}`,
    repl: `{min:70,label:"Trusted",hue:"blue"}`,
    expect: "not strictly descending",
  },
  {
    name: "second-ladder-in-fullprofile",
    why: "the real defect: FullProfile carried its own copy, so one climber had two labels",
    file: "ClimbMatchCore.jsx",
    find: `_tt=trustTier(ts),tcol=_tt.color,tlbl=_tt.label`,
    repl: `tcol=ts>=90?C.green:ts>=70?C.blue:ts>=50?C.amber:C.red,tlbl=ts>=90?"Highly Trusted":ts>=70?"Trusted":ts>=50?"Building Trust":"New"`,
    expect: "tier ladder(s) live outside TRUST_TIERS",
  },
  {
    name: "card-goal-typed-again",
    why: "the real defect: a literal in the card is a fourth copy of the top tier",
    file: "ClimbMatch.jsx",
    find: `{myTrustScore>=TRUST_GOAL?"· goal met":"/ "+TRUST_GOAL+" goal"}`,
    repl: `{myTrustScore>=90?"· goal met":"/ 90 goal"}`,
    expect: "does not read TRUST_GOAL",
  },
  {
    name: "ceiling-typed-not-derived",
    why: "the constant must BE the model's earnable ceiling, or it goes stale toward looking attainable",
    file: "ClimbMatchCore.jsx",
    find: `export var SERVER_TRUST_EARNABLE=84;`,
    repl: `export var SERVER_TRUST_EARNABLE=99;`,
    expect: "the model's earnable ceiling is",
  },
  {
    name: "ladder-declared-and-unused",
    why: "every bound above is satisfied by a trustTier that ignores the table entirely",
    file: "ClimbMatchCore.jsx",
    find: `var t=TRUST_TIERS.find(function(x){return s>=x.min;})||TRUST_TIERS[TRUST_TIERS.length-1];`,
    repl: `var t=TRUST_TIERS[TRUST_TIERS.length-1];`,
    expect: "the ladder is declared and not used",
  },
  {
    name: "SILENT-a-comment-naming-the-old-ladder",
    why: "a comment quoting the forbidden shape is documentation; firing on it forbids explaining the fix",
    file: "ClimbMatchCore.jsx",
    find: `export var TRUST_GOAL=TRUST_TIERS[0].min;`,
    repl: `/* It used to read score>=90?"Highly Trusted":score>=70?"Trusted":"New", in two places. */\nexport var TRUST_GOAL=TRUST_TIERS[0].min;`,
    silent: true,
  },
  {
    name: "SILENT-an-unrelated-label-called-Trusted",
    why: "the Leaderboards board category shares a word and is not a tier; renaming it would be wrong",
    file: "ClimbMatchCore.jsx",
    find: `export var TRUST_GOAL=TRUST_TIERS[0].min;`,
    repl: `export var _BOARD_EXAMPLE={id:"trust2",label:"Trusted",val:function(p){return p;}};\nexport var TRUST_GOAL=TRUST_TIERS[0].min;`,
    silent: true,
  },
];

const run = () => {
  try {
    return { code: 0, out: execFileSync("npm", ["run", "check:trust-breakdown", "--silent"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) { return { code: e.status ?? 1, out: String(e.stdout || "") + String(e.stderr || "") }; }
};
const failLines = (out) => out.split("\n").filter((l) => l.includes("FAIL") || l.startsWith("check:trust-breakdown FAILED")).join("\n");

const clean = run();
if (clean.code !== 0) {
  console.error("REFUSED - the guard is not green on this tree, so no case would be attributable:\n" + failLines(clean.out));
  process.exit(1);
}
// An expectation matching the HEALTHY run is a case written against the text an assertion prints
// when it PASSES; it would report MISSED against a guard firing correctly. Structural, because this
// repo has made that mistake twice.
for (const c of CASES) {
  if (c.expect && clean.out.includes(c.expect)) {
    console.error(`REFUSED - case ${c.name} expects text that already appears in the clean run: ${c.expect}`);
    process.exit(1);
  }
}

let pass = 0;
for (const c of CASES) {
  const before = sum(c.file);
  const p = path.join(ROOT, c.file);
  const src = fs.readFileSync(p, "utf8");
  const n = src.split(c.find).length - 1;
  if (n !== 1) { console.log(`  HARNESS BUG  ${c.name}: ${n} match(es) for its find string`); continue; }
  fs.writeFileSync(p, src.replace(c.find, c.repl));
  const after = sum(c.file);
  if (after === before) { console.log(`  HARNESS BUG  ${c.name}: the edit did not move the file`); continue; }

  const r = run();
  fs.writeFileSync(p, src);
  if (sum(c.file) !== before) { console.log(`  TREE NOT RESTORED  ${c.name}`); process.exit(1); }

  if (c.silent) {
    if (r.code === 0) { console.log(`  ok  ${c.name} — stayed silent (${c.why})`); pass++; }
    else console.log(`  FIRED ON CORRECT WORK  ${c.name}\n${failLines(r.out)}`);
  } else if (r.code === 0) {
    console.log(`  MISSED  ${c.name} — the guard passed (${c.why})`);
  } else if (failLines(r.out).includes(c.expect)) {
    console.log(`  ok  ${c.name} — caught, naming its own defect`); pass++;
  } else {
    console.log(`  WRONG FAILURE  ${c.name} — expected ${JSON.stringify(c.expect)}\n${failLines(r.out)}`);
  }
}
console.log(`\n${pass}/${CASES.length} behaved as declared.`);
process.exit(pass === CASES.length ? 0 : 1);
