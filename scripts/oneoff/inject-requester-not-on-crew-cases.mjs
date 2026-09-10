// Injection suite for `probe-a-requester-is-not-on-the-crew.mjs`.
//
// The probe passed 26/26 on its first run, which is exactly when a probe has to be shown to FAIL.
// Every case proves its edit landed BY CHECKSUM before the probe is believed, restores the file
// byte-identically, and is judged on the probe's OWN failure text rather than on an exit code --
// a run that died for an unrelated reason is not a catch.
//
// The harness captures the CLEAN run first and REFUSES any expectation that already matches it,
// because an expectation written against the text an assertion prints when it PASSES reports
// MISSED against a probe that is firing correctly. This repo has made that mistake twice.
//
// Two cases must stay SILENT and they are the point: a comment quoting the pre-fix expression is
// documentation, and the deliberate whole-roster readers must keep the requester -- a rule that
// only ever removes them is satisfied by removing them everywhere, which would hide a requester
// from the organiser who has to accept them.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROBE = path.join(ROOT, "scripts/oneoff/probe-a-requester-is-not-on-the-crew.mjs");
const FILES = {
  core: path.join(ROOT, "ClimbMatchCore.jsx"),
  app: path.join(ROOT, "ClimbMatch.jsx"),
};
const LOCK = path.join(ROOT, ".inject-requester-not-on-crew.lock");

const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 12);
const run = () => {
  try { return execFileSync("node", [PROBE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }
};

// A dirty tree makes every case unattributable, and two overlapping runs of one suite can write
// each other's injected text back as though it were the original.
let fd;
try { fd = fs.openSync(LOCK, "wx"); } catch { console.error("another run of this suite holds the lock"); process.exit(2); }
const release = () => { try { fs.closeSync(fd); fs.unlinkSync(LOCK); } catch {} };
process.on("exit", release);
process.on("SIGINT", () => { release(); process.exit(130); });

const before = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, sum(p)]));
const CLEAN = run();
if (!/ok — a climber who has only asked to join is not on the crew/.test(CLEAN)) {
  console.error("the probe is not green on this tree; every case would be unattributable.\n" + CLEAN);
  process.exit(2);
}

const CASES = [
  { name: "partnersearch-chip", file: "core", expect: "PartnerSearch shared-objective chip",
    find: 'const asked=crewAskedToJoin(ex,c.id);/* A climber who has ASKED',
    repl: 'const asked=false;/* A climber who has ASKED' },

  { name: "safety-brief", file: "app", expect: "THE SAFETY BRIEF",
    find: 'crewInCrew(safetyCrewObj).filter(m=>m.climberId!==0).map(m=>crewMemberById(m.climberId))',
    repl: 'safetyCrewObj.members.filter(m=>m.climberId!==0).map(m=>crewMemberById(m.climberId))' },

  { name: "isready", file: "core", expect: "isReady asks the same question",
    find: 'function isReady(c,hasMessages){return !!(c&&crewInCrew(c).filter(m=>m.climberId!==0)',
    repl: 'function isReady(c,hasMessages){return !!(c&&(c.members||[]).filter(m=>m.climberId!==0)' },

  { name: "invite-prompt-size", file: "app", expect: "the invite prompt's size",
    find: 'const roster=ex?crewSize(ex):0;',
    repl: 'const roster=ex?ex.members.length+1:0;' },

  { name: "quick-list-denominator", file: "app", expect: "the crew-tab quick list denominator",
    find: 'const otherMem=crewInCrew(cr).filter(m=>m.climberId!==0);',
    repl: 'const otherMem=cr.members.filter(m=>m.climberId!==0);' },

  // OVER-REACH. A fix that only ever removes requesters is satisfied by removing them everywhere.
  { name: "OVER-REACH-sweep-the-roster", file: "core", expect: "member LIST still shows the requester",
    find: 'const mem=crew.members.filter(m=>m.climberId!==0).map(',
    repl: 'const mem=crewInCrew(crew).filter(m=>m.climberId!==0).map(' },

  // The size must normalise YOU, or the two stored shapes disagree again.
  { name: "size-double-counts-you", file: "core", expect: "the two conventions still disagree",
    find: 'function crewSize(c){return 1+crewInCrew(c).filter(function(m){return m.climberId!==0;}).length;}',
    repl: 'function crewSize(c){return 1+crewInCrew(c).length;}' },

  // SILENT: documentation naming the forbidden shape is not the forbidden shape.
  { name: "SILENT-comment-quotes-the-old-expression", file: "core", silent: true,
    find: 'function crewInCrew(c){',
    repl: '/* the pre-fix reader was ex.members.some(m=>m.climberId===c.id) */function crewInCrew(c){' },

  // SILENT: an unrelated edit beside a reader is ordinary work.
  { name: "SILENT-unrelated-edit-beside-a-reader", file: "app", silent: true,
    find: 'const roster=ex?crewSize(ex):0;',
    repl: 'const roster=ex?crewSize(ex):0;/* size of your crew for this climb */' },
];

let pass = 0;
for (const c of CASES) {
  const p = FILES[c.file];
  const original = fs.readFileSync(p, "utf8");
  const n = original.split(c.find).length - 1;
  if (n !== 1) { console.log(`  HARNESS BUG  ${c.name} — find string matched ${n} times`); continue; }
  const s0 = sum(p);
  fs.writeFileSync(p, original.replace(c.find, c.repl));
  const s1 = sum(p);
  let verdict;
  if (s1 === s0) verdict = "EDIT NEVER LANDED";
  else {
    const out = run();
    const fails = out.split("\n").filter((l) => /^\s*FAIL /.test(l) || /BROKEN PROBE/.test(l));
    if (c.silent) verdict = fails.length === 0 ? "ok (silent)" : "WRONGLY FIRED:\n      " + fails.join("\n      ");
    else if (!fails.length) verdict = "MISSED";
    else if (fails.some((l) => l.includes(c.expect))) verdict = "ok (caught)";
    else verdict = "WRONG FAILURE:\n      " + fails.join("\n      ");
  }
  fs.writeFileSync(p, original);
  if (sum(p) !== s0) { console.error(`TREE NOT RESTORED for ${c.name}`); process.exit(2); }
  const good = verdict.startsWith("ok");
  if (good) pass++;
  console.log(`  ${good ? "ok  " : "FAIL"}  ${c.name} — ${verdict}`);
}

for (const [k, p] of Object.entries(FILES)) {
  if (sum(p) !== before[k]) { console.error(`TREE NOT RESTORED: ${k}`); process.exit(2); }
}
console.log(`\n${pass}/${CASES.length}`);
process.exit(pass === CASES.length ? 0 : 1);
