// Can probe-pending-requester-is-not-a-member.mjs actually SEE a reader going back to `roster`?
//
// Its sections 3 and 5 are source assertions, and the healthy answer is "everything matches" --
// which is exactly what a probe with a broken regex prints. So each case reverts one reader
// VERBATIM to the expression it had before #1657, proves the edit landed BY CHECKSUM, runs the
// probe, and restores the file byte-identically.
//
// Two cases must stay SILENT: sweeping a deliberate `roster` reader onto `inCrew` is over-reach
// rather than a fix, and section 5 exists to say so -- but a comment naming the old expression is
// documentation, and a probe that fired on it would forbid its own explanation.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(ROOT, "ClimbMatchCore.jsx");
const PROBE = path.join(ROOT, "scripts/oneoff/probe-pending-requester-is-not-a-member.mjs");
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

const CASES = [
  {
    name: "pendDay back on roster",
    find: "var pendDay=inCrew.filter(function(p){return !_ds.some(",
    repl: "var pendDay=roster.filter(function(p){return !_ds.some(",
    expect: "waiting on X to tap a day that works",
    silent: false,
  },
  {
    name: "the whole-crew weekly slot back on roster",
    find: "if(inCrew.length&&inCrew.every(m=>slotOn(m,d[0],p)))",
    repl: "if(roster.length&&roster.every(m=>slotOn(m,d[0],p)))",
    expect: "usually free for everyone",
    silent: false,
  },
  {
    name: "the backcountry safety total back on roster",
    find: "var total=inCrew.length;var done=inCrew.filter(",
    repl: "var total=roster.length;var done=roster.filter(",
    expect: "the backcountry safety brief's total",
    silent: false,
  },
  {
    name: "risk alignment back on roster",
    find: 'const risks=tp.modules.includes("align")?inCrew.map(',
    repl: 'const risks=tp.modules.includes("align")?roster.map(',
    expect: "risk alignment lists the CREW's tolerances",
    silent: false,
  },
  {
    name: "OVER-REACH: the grid rows swept onto inCrew",
    find: "{roster.map(m=><div key={m.id}",
    repl: "{inCrew.map(m=><div key={m.id}",
    expect: "the weekly-availability GRID ROWS",
    silent: false,
  },
  {
    // Must stay SILENT. A comment quoting the pre-fix expression is how the next reader learns
    // what the rule is; a probe that failed on it would forbid its own documentation.
    name: "SILENT: a comment quoting the old expression",
    find: "const inCrew=roster.filter(function(p){return p._status!==\"pending\";});",
    repl: "/* was: risks=roster.map(p=>p.riskTolerance) and total=roster.length */\n  const inCrew=roster.filter(function(p){return p._status!==\"pending\";});",
    expect: null,
    silent: true,
  },
];

const original = fs.readFileSync(SRC, "utf8");
const originalSha = sha(original);
let bad = 0;

const runProbe = () => {
  try {
    return { code: 0, out: execFileSync("node", [PROBE], { encoding: "utf8" }) };
  } catch (e) {
    return { code: e.status === undefined ? 1 : e.status, out: (e.stdout || "") + (e.stderr || "") };
  }
};

// The clean run first. Any expectation that already matches it is testing nothing.
const clean = runProbe();
if (clean.code !== 0) {
  console.error("BROKEN HARNESS: the probe does not pass on a clean tree — fix that first.\n" + clean.out);
  process.exit(2);
}
for (const c of CASES) {
  if (c.expect && clean.out.includes("FAIL " + c.expect)) {
    console.error(`BROKEN HARNESS: "${c.name}" expects text the CLEAN run already prints.`);
    process.exit(2);
  }
}

for (const c of CASES) {
  const n = original.split(c.find).length - 1;
  if (n !== 1) {
    console.log(`  BROKEN CASE  ${c.name} — anchor matched ${n} times, expected 1`);
    bad++;
    continue;
  }
  const injected = original.replace(c.find, c.repl);
  if (sha(injected) === originalSha) {
    console.log(`  BROKEN CASE  ${c.name} — the edit did not change the file`);
    bad++;
    continue;
  }
  fs.writeFileSync(SRC, injected);
  const r = runProbe();
  fs.writeFileSync(SRC, original);
  if (sha(fs.readFileSync(SRC, "utf8")) !== originalSha) {
    console.error("BROKEN HARNESS: the file was not restored byte-identically. Stopping.");
    process.exit(2);
  }

  if (c.silent) {
    if (r.code === 0) console.log(`  ok    ${c.name} — correctly SILENT`);
    else { console.log(`  FALSE ALARM  ${c.name} — the probe fired on correct work`); bad++; }
  } else if (r.code === 0) {
    console.log(`  MISSED  ${c.name} — the probe passed against the reverted reader`);
    bad++;
  } else if (!r.out.includes("FAIL " + c.expect)) {
    console.log(`  WRONG FAILURE  ${c.name} — it failed, but not on "${c.expect}"`);
    bad++;
  } else {
    console.log(`  ok    ${c.name} — caught, naming the reader`);
  }
}

console.log(bad ? `\nFAILED — ${bad} of ${CASES.length}` : `\nok — ${CASES.length}/${CASES.length}\n`);
process.exit(bad ? 1 : 0);
